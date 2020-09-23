import {NextFunction, Request, Response} from 'express';
import {ClientBase} from 'pg';
import {Logger} from 'winston';
import {Configuration} from '../index';
import {Model, ModelDao} from '../models/repository/ModelDao';
import {ModelRepository} from '../models/repository/ModelRepository';
import {I18nLang, User, UserPlatformRole} from '../models/User';
import {Authenticator} from './Authenticator';

declare const global: any;

export function authenticateWithRoles<T>(logger: Logger, allowedRoles: UserPlatformRole[], repo: ModelRepository, config: Configuration, cg: Authenticator,
                                         model?: ModelDao<T, Model<T>>,
                                         id?: (req: Request) => T,
                                         lockResource = false, paths?: {[id: number]: string[]}, denyUnknown = true, noAdminBypasss = true,
                                         dataValidator?: (data: Model<T>, user: User, client: ClientBase) => Promise<boolean>) {
    return function(req: Request, res: Response, next: NextFunction) {
        function checkRoles(user: User) {
            let userRole: UserPlatformRole;
            if(!allowedRoles || !allowedRoles.length
                || (userRole = allowedRoles.find(role => user.role === role))) {
                if(model && id) {
                    model.get(id(req), res.locals.dbClient, lockResource).then(data => {
                        if((noAdminBypasss || user.role === UserPlatformRole.CUSTOMER) && !data) {
                            logger.warn('Bad permissions from %s on checkRoles %s', user.id, req.url);
                            res.status(404).json({
                                error: {
                                    errorKey: 'client.body.notFound',
                                    additionalInfo: 'client.extended.missingResource'
                                }
                            });
                        } else if(paths && paths[userRole]) {
                            let currentObj: any = data;
                            const len = paths[userRole][paths[userRole].length - 1] === 'contains' ?
                                paths[userRole].length - 1 : paths[userRole].length;
                            for(let i = 0; i < len; i++) {
                                currentObj = currentObj[paths[userRole][i]];
                            }
                            // Check the end of the derivation path!
                            if(len < paths[userRole].length) {
                                if((currentObj.indexOf && currentObj.indexOf(user.id) > -1)
                                    || currentObj.map((s: any) => s.id).indexOf(user.id) > -1) {
                                    res.locals.subject = data;
                                    next();
                                } else  {
                                    logger.warn('Bad permissions from %s on checkRoles %s', user.id, req.url);
                                    res.status(403).json({
                                        error: {
                                            errorKey: 'client.body.auth',
                                            additionalInfo: 'client.extended.wrongAuth'
                                        }
                                    });
                                }
                            } else {
                                if(currentObj && (currentObj === user.id || currentObj.id === user.id)) {
                                    res.locals.subject = data;
                                    next();
                                } else {
                                    logger.warn('Bad permissions from %s on checkRoles %s', user.id, req.url);
                                    res.status(403).json({
                                        error: {
                                            errorKey: 'client.body.auth',
                                            additionalInfo: 'client.extended.wrongAuth'
                                        }
                                    });
                                }
                            }
                        } else if((noAdminBypasss || user.role === UserPlatformRole.CUSTOMER) && dataValidator) {
                            return dataValidator(data, user, res.locals.dbClient).then(ok => {
                                if(ok) {
                                    res.locals.subject = data;
                                    next();
                                } else {
                                    logger.warn('Bad permissions from %s on checkRoles %s', user.id, req.url);
                                    res.status(404).json({
                                        error: {
                                            errorKey: 'client.body.notFound',
                                            additionalInfo: 'client.extended.missingResource'
                                        }
                                    });
                                }
                            });
                        } else {
                            res.locals.subject = data;
                            next();
                        }
                        return undefined;
                    }).catch(err => res.status(500).json({
                        error: {
                            errorKey: 'internal.db',
                            additionalInfo: {message: err.message, stack: config.debug && err.stack}
                        }
                    }));
                } else next();
            } else {
                logger.warn('Bad permissions from %s on checkRoles %s', user.id, req.url);
                res.status(403).json({
                    error: {
                        errorKey: 'client.body.auth',
                        additionalInfo: 'client.extended.wrongAuth'
                    }
                });
            }
        }

        // Try a normal auth
        let accessTokenFromClient = req.headers.authorization;
        if(!accessTokenFromClient) {
            if(denyUnknown) {
                res.status(401).json({
                    error: {
                        errorKey: 'client.body.auth',
                        additionalInfo: 'client.body.auth'
                    }
                });
            } else next();
            return;
        }
        if(accessTokenFromClient.startsWith('Bearer '))
            accessTokenFromClient = accessTokenFromClient.substring(7);

        cg.validate(accessTokenFromClient).then(sub => {
            repo.User.get(sub, res.locals.dbClient, lockResource).then(user => {
                if(!user) {
                    res.status(401).json({
                        error: {
                            errorKey: 'client.body.auth',
                            additionalInfo: 'client.extended.notActiveTenant'
                        }
                    });
                } else {
                    res.locals.user = user;
                    checkRoles(user);
                }
            }).catch(err => {
                res.status(500).json({
                    error: {
                        errorKey: 'internal.db',
                        additionalInfo: {message: err.message, stack: config.debug && err.stack}
                    }
                });
            });
        }).catch(err => {
            logger.error('Could not validate credentials: %j', err);
            res.status(401).json({
                error: {
                    errorKey: 'client.body.auth',
                    additionalInfo: 'client.body.auth'
                }
            });
        });
    };
}

export function getBrowserLang(req: Request): I18nLang {
    const acceptLang = req.headers['accept-language'];
    if(!acceptLang) return I18nLang.EN;
    try {
        const parts = (typeof acceptLang === 'string' ? acceptLang : acceptLang[0]).split(',')
            .map(p => p.replace(/\s/g, '').split(';q=')).sort((p1, p2) => {
                if(p1[1] && !p2[1]) return 1;
                else if(!p1[1] && p2[1]) return -1;
                return p2[1].localeCompare(p1[1]);
            });
        for(let i = 0; i < parts.length; i++) {
            switch(parts[i][0].split('-')[0]) {
                case 'en':
                    return I18nLang.EN;
                case 'fr':
                    return I18nLang.FR;
                default:
                    return I18nLang.EN;
            }
        }
    } catch(err) {}
    return I18nLang.EN;
}
