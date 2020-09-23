import {NextFunction, Request, Response} from 'express';
import {Logger} from 'winston';
import {ModelRepository} from '../models/repository/ModelRepository';
import {utils} from './utils';

export const enum SystemLock {
}

function jsonStringify(obj: any): string {
    const cache: any = {};
    return JSON.stringify(obj, function(_, value) {
        if(typeof value === 'object' && value !== null) {
            if(cache[value] !== -1) {
                try {
                    return JSON.parse(JSON.stringify(value));
                } catch(error) {
                    return;
                }
            }
            cache[value] = true;
        }
        return value;
    });
}

export function withTransaction(repo: ModelRepository, logger: Logger, previousMethod: (req: Request, res: Response, next: NextFunction) => void, lock?: SystemLock) {
    return function(req: Request, res: Response, next: NextFunction) {
        const endTerminator = res.end.bind(res);
        const jsonTerminator = (obj: any) => {
            res.write(jsonStringify(obj) || '{}');
            endTerminator();
        };
        const connectTimeoutHandler = setTimeout(() => {
            // Timed out getting a client, restart worker or process...
            logger.error('Error timed out getting a client, exiting...');
            process.exit(22);
        }, 3000);
        repo.db.connect().then(dbClient => {
            clearTimeout(connectTimeoutHandler);
            // On error, will rollback...
            utils.logger = logger;
            dbClient.removeListener('error', utils.clientErrorHandler);
            dbClient.on('error', utils.clientErrorHandler);

            res.locals.dbClient = dbClient;
            res.locals.dbClientCommited = false;
            res.locals.dbClientCommit = (cb: (err: any) => any) => {
                if(!res.locals.dbClientCommited) {
                    res.locals.dbClientCommited = true;
                    dbClient.query('COMMIT').catch(err => err).then((err: any) => {
                        dbClient.release();
                        if(!(err instanceof Error)) {
                            for(let i = 0; i < res.locals.dbClientOnCommit.length; i++) {
                                res.locals.dbClientOnCommit[i]();
                            }
                        }
                        cb(err instanceof Error ? err : undefined);
                    });
                } else {
                    cb(undefined);
                }
            };
            res.locals.dbClientOnCommit = [];
            return dbClient.query('BEGIN').then(() => {
                const finish = () => {
                    res.json = (obj: any) => {
                        if(res.statusCode > 302 && res.statusCode !== 412) {
                            if(logger && res.statusCode > 499) {
                                logger.error('Uncaught 500: %j', obj.error.additionalInfo);
                            }
                            dbClient.query('ROLLBACK').catch(err => obj.error.additionalInfo2 = {message: err.message}).then(() => {
                                dbClient.release();
                                jsonTerminator(obj);
                            });
                        } else {
                            res.locals.dbClientCommit((err: any) => {
                                if(err) {
                                    res.status(500);
                                    jsonTerminator({
                                        error: {
                                            errorKey: 'internal.db',
                                            additionalInfo: {message: err.message}
                                        }
                                    });
                                } else jsonTerminator(obj);
                            });
                        }
                        return res;
                    };
                    res.end = () => {
                        if(res.statusCode > 302 && res.statusCode !== 412) {
                            if(logger && res.statusCode > 499) {
                                logger.error('Uncaught 500 with no details...');
                            }
                            dbClient.query('ROLLBACK').catch((): any => undefined).then(() => {
                                dbClient.release();
                                endTerminator();
                            });
                        } else {
                            res.locals.dbClientCommit((err: any) => {
                                if(err) {
                                    res.status(500);
                                    jsonTerminator({
                                        error: {
                                            errorKey: 'internal.db',
                                            additionalInfo: {message: err.message}
                                        }
                                    });
                                } else endTerminator();
                            });
                        }
                        return res;
                    };
                    return previousMethod.call(this, req, res, next);
                };

                if(lock) {
                    dbClient.query('SELECT pg_advisory_xact_lock(' + lock + ')').then(() => finish()).catch(err => {
                        res.status(500).json({
                            error: {
                                errorKey: 'internal.db',
                                additionalInfo: {message: err.message}
                            }
                        });
                        dbClient.release();
                    });
                } else {
                    finish();
                }
            }).catch(err => {
                dbClient.release();
                throw err;
            });
        }).catch(err => {
            // Error connecting to database, restarting worker after the timeout as well...
            res.status(500).json({
                error: {
                    errorKey: 'internal.db',
                    additionalInfo: {message: err.message}
                }
            });
        });
    };
}
