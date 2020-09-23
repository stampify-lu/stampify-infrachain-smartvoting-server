import {configs} from './configs';
export type Configuration = typeof configs.production;
let config: Configuration = configs[process.argv[2] || 'localhost'];
const configString = JSON.stringify(config);
config = JSON.parse(configString.replace(/__SECRET__([A-Z_]+)/g, key => process.env[key.substr(10)]));
process.env.NODE_ENV = config.debug ? 'development' : 'production';
const cpuCount = require('os').cpus().length;

import * as body from 'body-parser';
import * as cluster from 'cluster';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as Memcached from 'memcached';
import * as path from 'path';
import * as pg from 'pg';
import * as Web3 from 'web3';
import * as winston from 'winston';
import {ContractRepr} from './controllers/AbstractController';
import {MeetingController} from './controllers/MeetingController';
import {UserController} from './controllers/UserController';
import {watchEndVotes} from './cron/watch-end-votes';
import {ModelRepository} from './models/repository/ModelRepository';
import {User, UserPlatformRole} from './models/User';
import {authenticateWithRoles} from './services/authenticate';
import {clientErrorHandle, utils} from './services/utils';
import {Authenticator} from './services/Authenticator';
import {withTransaction} from './services/WithTransaction';

declare const Promise: PromiseConstructor & {
    allConcurrent: <T>(n: number) => ((promiseProxies: (() => Promise<T>)[]) => Promise<T[]>);
};

export type CommitQueue = (() => (void | any))[];
export interface ResponseLocals {
    user?: User;
    dbClient?: pg.ClientBase;
    dbClientCommited?: boolean;
    dbClientCommit?: (err: any) => any;
    dbClientOnCommit?: CommitQueue;
    subject?: any;
    remoteIp?: string;
}
declare module 'express' {
    interface Request extends http.IncomingMessage, Express.Request {
        query: {[id: string]: string};
    }
    interface Response {
        locals: ResponseLocals;
    }
}
declare const global: NodeJS.Global & any;

export function promiseAllStepN<T>(n: number, list: (() => Promise<T>)[]): Promise<T[]> {
    if(!list || !list.length) return Promise.resolve([]);
    const tail = list.splice(n);
    const head = list;
    const resolved: any[] = [];
    let processed = 0;
    return new Promise(resolve => {
        head.forEach(x => {
            const res = x();
            resolved.push(res);
            res.then((y: any) => {
                runNext();
                return y;
            });
        });
        function runNext() {
            if(processed === tail.length) {
                resolve(Promise.all(resolved));
            } else {
                resolved.push(tail[processed]().then((x: any) => {
                    runNext();
                    return x;
                }));
                processed++;
            }
        }
    });
}
Promise.allConcurrent = <T>(n: number) => (list: (() => Promise<T>)[]) => promiseAllStepN(n, list);

function work() {
    // Logging
    require('winston-daily-rotate-file');
    const errorTransport = new (<any>winston.transports).DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        level: 'error',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        prettyPrint: JSON.stringify
    });
    const logger = winston.createLogger({
        exitOnError: false,
        level: config.debug ? 'debug' : 'info',
        format: winston.format.combine(
            winston.format(info => {
                const index: any = Object.getOwnPropertySymbols(info)[1];
                if(info[index]) {
                    info[index] = info[index].map((arg: any) => {
                        if(arg instanceof Error)
                            return Object.assign({
                                message: arg.message,
                                stack: arg.stack
                            }, arg);
                        if(typeof arg === 'object' && arg.error instanceof Error)
                            arg.error = Object.assign({
                                message: arg.error.message,
                                stack: arg.error.stack
                            }, arg.error);
                        return arg;
                    });
                }
                return info;
            })(),
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.label({label: cluster.worker && ('worker' + cluster.worker.id) || 'master'}),
            winston.format.splat(),
            winston.format.printf(info => info.timestamp + ' [' + info.label + '] ' + info.level + ': ' + info.message)),
        transports: [
            errorTransport,
            new (<any>winston.transports).DailyRotateFile({
                filename: 'logs/combined-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                prettyPrint: JSON.stringify
            })
        ]
    });
    winston.exceptions.handle(errorTransport);
    if(config.debug) {
        const consoleTransport = new winston.transports.Console();
        logger.add(consoleTransport);
        winston.exceptions.handle(consoleTransport);
    }
    process.on('unhandledRejection', (err: any, origin) => {
        if(err.message.indexOf('JSON RPC') > -1) return;
        fs.writeFileSync('/tmp/crash' + Date.now(), JSON.stringify({
            err: err.message,
            stack: err.stack,
            origin: origin
        }));
        process.exit(20);
    });
    process.on(<any>'uncaughtException', (err: any, origin: any) => {
        if(err.message.indexOf('JSON RPC') > -1) return;
        fs.writeFileSync('/tmp/crash' + Date.now(), JSON.stringify({
            err: err.message,
            stack: err.stack,
            origin: origin
        }));
        process.exit(21);
    });

    // Services
    const keys = {
        private: fs.readFileSync(__dirname + config.keypem, 'utf8'),
        cert: fs.readFileSync(__dirname + config.certpem, 'utf8'),
        caCert: fs.readFileSync(__dirname + config.cacertpem, 'utf8')
    };
    const cognitoExpress = new Authenticator(config.aws.jwtCertificate, true);
    const web3 = new (<any>Web3)(config.server.blockchain.rpc);
    if(config.server.blockchain.privateKey)
        web3.eth.accounts.wallet.add(config.server.blockchain.privateKey);

    // Now connect to DB then start serving requests
    const pool = new pg.Pool(config.db);
    config.db.max = Math.floor(config.db.max);
    const txFreePool = new pg.Pool(config.db);
    utils.clientErrorHandler = clientErrorHandle.bind(logger);
    pool.on('error', utils.clientErrorHandler);
    txFreePool.on('error', utils.clientErrorHandler);
    const cache = config.aws.memcached && new Memcached(config.aws.memcached, {timeout: 200, idle: 20000, maxExpiration: config.aws.memcachedTimeout});
    const repo = new ModelRepository(pool, txFreePool, logger, cache);

    const normalizedPath = path.join(__dirname, config.server.pluginsDir);
    fs.readdirSync(normalizedPath).forEach(file => {
        if(file.endsWith('.js'))
            require('./' + config.server.pluginsDir + '/' + file);
    });
    const plugins = {};
    const contractNames = fs.readdirSync(__dirname + '/../build/contracts');
    const contracts: {[id: string]: ContractRepr} = {};
    contractNames.forEach(key => {
        const content = require(__dirname + '/../build/contracts/' + key);
        contracts[key.split('.')[0]] = {
            abi: new web3.eth.Contract(content.abi),
            json: JSON.stringify(content.abi),
            bin: content.bytecode
        };
    });

    //Controllers and services
    const user = new UserController(repo, config, logger, <any>contracts, plugins);
    const meeting = new MeetingController(repo, config, logger, <any>contracts, plugins);

    watchEndVotes(repo, logger, contracts.Meeting, config);

    // Create the express application
    const app = express();
    app.use((req, res, next) => {
        res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
        res.set('Access-Control-Allow-Methods', 'GET,POST,DELETE');
        res.set('Access-Control-Allow-Origin', '*');
        res.locals.remoteIp = req.headers['x-forwarded-for'] && (<string>req.headers['x-forwarded-for']).split(/\s*,\s*/)[0] || req.connection.remoteAddress;
        next();
    });
    app.use(body.json({limit: '50mb'}));
    app.use(body.urlencoded({extended: false, limit: '15mb'}));

    // API AUTH DECLARATIONS
    app.get('/api/v:version/users/info', withTransaction(repo, logger, authenticateWithRoles(logger, [], repo, config, cognitoExpress)));
    app.post('/api/v:version/users/info', withTransaction(repo, logger, authenticateWithRoles(logger, [], repo, config, cognitoExpress)));
    app.post('/api/v:version/users/login_weak', withTransaction(repo, logger, (_, __, next) => next()));
    app.post('/api/v:version/users', withTransaction(repo, logger, (_, __, next) => next()));
    app.post('/api/v:version/users/recover/:account_name', withTransaction(repo, logger, (_, __, next) => next()));
    app.post('/api/v:version/users/password', withTransaction(repo, logger, authenticateWithRoles(logger, [], repo, config, cognitoExpress)));
    app.get('/api/v:version/users/search/:search', authenticateWithRoles(logger, [UserPlatformRole.ADMIN], repo, config, cognitoExpress));
    app.get('/api/v:version/meetings/own/query', authenticateWithRoles(logger, [], repo, config, cognitoExpress));
    app.post('/api/v:version/meetings', withTransaction(repo, logger, authenticateWithRoles(logger, [UserPlatformRole.ADMIN], repo, config, cognitoExpress)));
    app.post('/api/v:version/meetings/:meeting_id/add_user', withTransaction(repo, logger, authenticateWithRoles(logger, [UserPlatformRole.ADMIN], repo, config, cognitoExpress,
        repo.Meeting, req => parseInt(req.params.meeting_id, 10))));
    app.post('/api/v:version/meetings/:meeting_id/delete_user', withTransaction(repo, logger, authenticateWithRoles(logger, [UserPlatformRole.ADMIN], repo, config, cognitoExpress,
        repo.Meeting, req => parseInt(req.params.meeting_id, 10))));

    // API ROUTES
    /**
     * @api {get} /api/v:version/ping Ping endpoint
     * @apiName ping
     * @apiGroup Other
     * @apiPermission free
     * @apiDescription Health check by pinging
     * @apiParam (Path) {String} version Version number
     * @apiSuccess (Success 200) {String} result Will contain "pong"
     * @apiError (Error 5XX) 502 Server is actually down
     */
    app.get('/api/v:version/ping', (_, res) => {
        res.status(200).json({result: 'pong'});
    });
    /**
     * @api {get} /api/v:version/config Config endpoint
     * @apiName config
     * @apiGroup Other
     * @apiPermission free
     * @apiDescription Read public configuration
     * @apiParam (Path) {String} version Version number
     * @apiSuccess (Success 200) {Object} result Will contain public configuration
     * @apiError (Error 5XX) 502 Server is actually down
     */
    app.get('/api/v:version/config', (_, res) => {
        res.status(200).json({result: config.app});
    });
    app.get('/api/v:version/users/info', user.info.bind(user));
    app.post('/api/v:version/users/info', user.setInfo.bind(user));
    app.post('/api/v:version/users/login_weak', user.consumeLoginWeak.bind(user));
    app.post('/api/v:version/users', user.register.bind(user));
    app.post('/api/v:version/users/reset/:account_name', user.reset.bind(user));
    app.post('/api/v:version/users/recover/:account_name', user.resetPassword.bind(user));
    app.post('/api/v:version/users/password', user.setPassword.bind(user));
    app.get('/api/v:version/users/search/:search', user.adminSearchUser.bind(user));
    app.get('/api/v:version/meetings/own/query', meeting.getOwnMeetings.bind(meeting));
    app.post('/api/v:version/meetings', meeting.createMeeting.bind(meeting));
    app.post('/api/v:version/meetings/:meeting_id/add_user', meeting.addMeetingUser.bind(meeting));
    app.post('/api/v:version/meetings/:meeting_id/delete_user', meeting.deleteUserMeeting.bind(meeting));
    /**
     * @api {get} /api/v:version/admin/config Reload and display active config
     * @apiName config
     * @apiGroup Other
     * @apiPermission admin
     * @apiDescription Reload the config without server and return the active one
     * @apiParam (Path) {String} version Version number
     * @apiSuccess (Success 200) {Object} _ The active configuration
     * @apiError (Error 4XX) 401 Authentication failed
     */
    app.get('/api/v:version/admin/config', (_, res) => {
        const readConfigs = require('./configs');
        const newConfig = readConfigs[process.argv[2] || 'localhost'];
        Object.assign(config, newConfig);
        const cs = JSON.stringify(config);
        config = JSON.parse(cs.replace(/__SECRET__([A-Z_]+)/g, key => process.env[key.substr(10)]));
        process.env.NODE_ENV = config.debug ? 'development' : 'production';
        res.status(200).json(config);
    });

    // Error route
    app.use((req, res) => {
        /**
         * @api {options} /** Options call
         * @apiName options
         * @apiGroup Other
         * @apiPermission free
         * @apiDescription List options for CORS
         * @apiSuccess (Success 204) {Empty} _ Empty body
         */
        if(req.method === 'OPTIONS') {
            res.status(204).end();
        } else {
            res.status(404).json({
                error: {
                    errorKey: 'client.body.notFound',
                    additionalInfo: req.path
                }
            });
        }
    });

    process.on('SIGTERM', process.exit.bind(0));
    process.on('SIGINT', process.exit.bind(0));

    let server;
    if(config.https) {
        server = https.createServer({
            key: keys.private,
            cert: keys.cert,
            ca: keys.caCert,
            requestCert: true,
            rejectUnauthorized: false
        }, app);
    } else {
        server = http.createServer(app);
    }
    server.listen(config.port);

    logger.info('Booststrap finished, localhost %s', config.localhost);
}

if(cluster.isMaster) {
    const pool = new pg.Pool(config.db);
    // Sync DB
    const repo = new ModelRepository(pool, undefined, undefined, undefined);
    repo.migrate(__dirname + config.migrations, () => {
        if(config.fork) {
            pool.end(() => {
                for(let i = 0; i < cpuCount; i++) {
                    cluster.fork();
                }
                cluster.on('exit', worker => {
                    console.warn('Worker ' + worker.id + ' died :(');
                    cluster.fork();
                });
            });
        } else {
            work();
        }
    });
} else {
    work();
}
