import {Request, Response} from 'express';
import * as jwt from 'jsonwebtoken';
import {md} from 'node-forge';
import {toUserView, User, UserPlatformRole} from '../models/User';
import {getBrowserLang} from '../services/authenticate';
import {WithBody} from '../services/WithBody';
import {AbstractController} from './AbstractController';

export class UserController extends AbstractController {
    /**
     * @api {get} /api/v:version/users/info Info about self user
     * @apiName info
     * @apiGroup User
     * @apiPermission logged-in
     * @apiDescription Get information about logged in user
     * @apiParam (Path) {String} version Version number
     * @apiSuccess (Success 200) {Object} result Contains database record about user.
     * @apiSuccess (Success 200) {String} result/tenants User companies
     * @apiSuccess (Success 200) {Object} result/server Contains configuration of environment, testMode being here
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    info(_: Request, res: Response) {
        const user: User = res.locals.user;
        toUserView(this.repo, user).then(view => {
            res.status(200).json({
                result: Object.assign({}, view, {
                    server: {
                        ...this.config.app,
                        contractsAbi: {
                            Meeting: this.contracts.Meeting.json
                        }
                    }
                })
            });
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users/info Update info
     * @apiName setInfo
     * @apiGroup User
     * @apiPermission logged-in
     * @apiDescription Set information about logged in user
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {Number} lang The lang key
     * @apiSuccess (Success 204) {Empty} _ Empty object
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            lang: {type: 'integer', minimum: 0, maximum: 1, required: true}
        }
    })
    setInfo(req: Request, res: Response) {
        const user: User = res.locals.user;
        user.lang = req.body.lang;
        res.locals.dbClientOnCommit.push(() => this.repo.User.cache.delete(user.id));
        this.repo.User.update(user, res.locals.dbClient).then(() => {
            res.status(204).end();
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users/login_weak Consume login weak
     * @apiName consumeLoginWeak
     * @apiGroup User
     * @apiPermission free
     * @apiDescription Consume login weak, only allowing known users
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {String} account_name The account to login to
     * @apiParam (Body) {String} password The password to ensure
     * @apiSuccess (Success 200) {String} result/jwt Token to use afterwards
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 400 Account mismatch
     * @apiError (Error 4XX) 404 User unknown
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            account_name: {type: 'string', required: true},
            password: {type: 'string', required: true}
        }
    })
    consumeLoginWeak(req: Request, res: Response) {
        this.repo.User.getByAccountName(req.body.account_name, res.locals.dbClient, true).then(user => {
            if(!user || user.passwordHash !== md.sha256.create().update(req.body.password + user.salt).digest().toHex()) {
                res.status(404).json({
                    error: {
                        errorKey: 'client.body.notFound',
                        additionalInfo: 'client.extended.missingResource'
                    }
                });
                return;
            }
            jwt.sign({
                sub: user.id,
                exp: Math.floor(Date.now() / 1000) + this.config.aws.jwtValiditySeconds,
                iat: Math.floor(Date.now() / 1000)
            }, this.config.aws.jwtKey.replace(/([^DEN]) ([^P])/g, '$1\n$2'), {algorithm: 'RS256'}, (err, token) => {
                if(err) {
                    this.logger.warn('Error signing JWT: %j', err);
                    res.status(500).json({
                        error: {
                            errorKey: 'internal.db',
                            additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
                        }
                    });
                    return undefined;
                } 
                res.status(200).json({
                    result: {jwt: token}
                });
            });
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users Create user
     * @apiName register
     * @apiGroup User
     * @apiPermission free
     * @apiDescription Register an account
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {String} account_name The account to login as, an email
     * @apiParam (Body) {String} password The password to use
     * @apiParam (Body) {String} first_name First name
     * @apiParam (Body) {String} last_name Last name
     * @apiParam (Body) {String} public_address The public address on the blockchain
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 400 Smartcard not allowed or account mismatch
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            account_name: {
                type: 'string',
                maxLength: 200,
                pattern: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
                required: true
            },
            password: {type: 'string', required: true},
            first_name: {type: 'string', required: true},
            last_name: {type: 'string', required: true},
            public_address: {type: 'string', required: true}
        }
    })
    register(req: Request, res: Response) {
        const salt = Math.random().toString(36).substring(2);
        const user: User = {
            firstName: req.body.first_name,
            lastName: req.body.last_name,
            lang: getBrowserLang(req),
            role: UserPlatformRole.CUSTOMER,
            accountName: req.body.account_name,
            passwordHash: md.sha256.create().update(req.body.password + salt).digest().toHex(),
            salt: salt,
            publicAddress: req.body.public_address,
            resetKey: undefined
        };
        this.repo.User.create(user, res.locals.dbClient).then(() => {
            res.status(204).end();
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users/reset/:account_name Password reset
     * @apiName reset
     * @apiGroup User
     * @apiPermission free
     * @apiDescription Register a password reset
     * @apiParam (Path) {String} version Version number
     * @apiParam (Path) {String} account_name The email associated
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 400 Not verified
     * @apiError (Error 4XX) 404 User not found
     * @apiError (Error 5XX) 500 Database error
     */
    reset(req: Request, res: Response) {
        this.repo.User.getByAccountName(decodeURIComponent(req.params.account_name), res.locals.dbClient).then(user => {
            if(!user) {
                res.status(404).json({
                    error: {
                        errorKey: 'client.body.notFound',
                        additionalInfo: 'client.extended.missingResource'
                    }
                });
                return undefined;
            }
            user.resetKey = Math.random().toString(36).substring(2);
            return Promise.all([
                this.repo.User.update(user, res.locals.dbClient)
                // TODO: send email
            ]).then(() => res.status(204).end());
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users/recover/:account_name Reset password completion
     * @apiName resetPassword
     * @apiGroup User
     * @apiPermission free
     * @apiDescription Reset password consumption
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {String} password The password to use
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 404 No such user or key
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            reset_key: {type: 'string', required: true},
            password: {type: 'string', required: true}
        }
    })
    resetPassword(req: Request, res: Response) {
        this.repo.User.getByAccountName(decodeURIComponent(req.params.account_name), res.locals.dbClient).then(user => {
            if(!user || user.resetKey !== req.body.reset_key || user.updatedOn.getTime() < Date.now() - 60 * 60 * 1000) {
                res.status(404).json({
                    error: {
                        errorKey: 'client.body.notFound',
                        additionalInfo: 'client.extended.missingResource'
                    }
                });
                return undefined;
            }
            user.resetKey = undefined;
            user.passwordHash = md.sha256.create().update(req.body.password + user.salt).digest().toHex();
            res.locals.dbClientOnCommit.push(() => this.repo.User.cache.delete(user.id).catch(() => undefined));
            return this.repo.User.update(user, res.locals.dbClient).then(() => {
                res.status(204).end();
            });
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/users/password Set password
     * @apiName setPassword
     * @apiGroup User
     * @apiPermission logged-in
     * @apiDescription Set a username and pasword to be used, logging ou a user
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {String} password The password to use
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            password: {type: 'string', required: true}
        }
    })
    setPassword(req: Request, res: Response) {
        const user: User = res.locals.user;
        user.passwordHash = md.sha256.create().update(req.body.password + user.salt).digest().toHex();
        res.locals.dbClientOnCommit.push(() => this.repo.User.cache.delete(user.id).catch(() => undefined));
        return this.repo.User.update(user, res.locals.dbClient).then(() => {
            res.status(204).end();
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {get} /api/v:version/users/search/:search Admin search
     * @apiName adminSearchUser
     * @apiGroup User
     * @apiPermission admin
     * @apiDescription Get users anywhere
     * @apiParam (Path) {String} version Version number
     * @apiParam (Path) {String} search URL-encoded search (first name, last name, account email, company email or id)
     * @apiSuccess (Success 200) {User[]} result The array of users
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    adminSearchUser(req: Request, res: Response) {
        this.repo.User.search(decodeURIComponent(req.params.search)).then(values =>
            Promise.all(values.map(v => toUserView(this.repo, v))).then(views => {
                res.status(200).json({
                    targetAppVesion: this.config.min_fe_version,
                    result: views
                });
            })).catch(err => res.status(500).json({
                error: {
                    errorKey: 'internal.db',
                    additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
                }
            }));
    }
}
