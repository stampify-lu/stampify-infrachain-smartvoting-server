import {Request, Response} from 'express';
import {ClientBase} from 'pg';
import {Meeting} from '../models/Meeting';
import {User} from '../models/User';
import { insertMeetingTransaction } from '../services/executor';
import {WithBody} from '../services/WithBody';
import {AbstractController} from './AbstractController';

export class MeetingController extends AbstractController {
    /**
     * @api {get} /api/v:version/meetings/own/query Find own meetings
     * @apiName getOwnMeetings
     * @apiGroup Meeting
     * @apiPermission logged-in
     * @apiDescription Get meetings for the logged in user
     * @apiParam (Path) {String} version Version number
     * @apiParam (Query) {Number} minDate A minimum epoch in milliseconds for timeBegin
     * @apiParam (Query) {String} search A name like
     * @apiParam (Query) {String} orderColumn A column to sort by, defaults timeBegin
     * @apiParam (Query) {String} orderAsc An order to sort by, defaults ASC
     * @apiParam (Query) {Number} offset An offset, 1500 max
     * @apiParam (Query) {Number} limit A limit, 30 max
     * @apiSuccess (Success 200) {Meeting[]} result The array of meetings to read
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    getOwnMeetings(req: Request, res: Response) {
        const user: User = res.locals.user;
        const ordersBy: string[] = ['ASC', 'DESC'];
        const columns: string[] = [
            'id',
            'name',
            'timeBegin',
            'timeEnd'
        ];
        const orderColumn: string = columns.includes(req.query.orderColumn) ? req.query.orderColumn : 'timeBegin';
        const orderAsc: string = ordersBy.includes(req.query.orderAsc) ? req.query.orderAsc : 'DESC';
        const order = JSON.stringify(orderColumn) + ' ' + orderAsc;
        const offset = Math.min(Math.max(0, parseInt(req.query.offset, 10)) || 0, 1500);
        const limit = req.query.limit === '0' ? 0 : Math.min(Math.max(0, parseInt(req.query.limit, 10)) || 30, 30);
        const inputs: any[] = [];
        if(req.query.minDate) inputs.push(new Date(parseInt(req.query.minDate, 10))); else inputs.push(1);
        if(req.query.search) inputs.push('%' + decodeURIComponent(req.query.search) + '%'); else inputs.push(1);
        this.repo.Meeting.getForUserViewCountBy(user.id, order, offset, limit, '1=1 AND ' + (req.query.minDate ? '"timeBegin" > $1' : '1=$1')
                + ' AND ' + (req.query.search ? '"name" ilike $2' : '1=$2') , inputs).then(values =>
            res.status(200).json({
                targetAppVesion: this.config.min_fe_version,
                result: values.views,
                count: values.count
            })).catch(err => res.status(500).json({
                error: {
                    errorKey: 'internal.db',
                    additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
                }
            }));
    }

    /**
     * @api {post} /api/v:version/meetings Create meeting
     * @apiName createMeeting
     * @apiGroup Meeting
     * @apiPermission logged-in
     * @apiDescription Create a meeting
     * @apiParam (Path) {String} version Version number
     * @apiParam (Body) {String} name The name
     * @apiParam (Body) {Number} time_begin Epoch of due start
     * @apiParam (Body) {Number} time_end Epoch of due end
     * @apiSuccess (Success 201) {Number} result The created resource ID
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 403 No admin
     * @apiError (Error 5XX) 500 Database error
     * @apiError (Error 6XX) 600 BC error
     */
    @WithBody({
        type: 'object',
        properties: {
            name: {type: 'string', maxLength: 200, required: true},
            time_begin: {type: 'integer', minimum: 0, required: true},
            time_end: {type: 'integer', minimum: 0, required: true}
        }
    })
    createMeeting(req: Request, res: Response) {
        const client: ClientBase = res.locals.dbClient;
        const meeting: Meeting = {
            name: req.body.name,
            timeBegin: new Date(req.body.time_begin),
            timeEnd: new Date(req.body.time_end),
            timeFrozen: undefined,
            contractAddress: undefined
        };
        insertMeetingTransaction(this.config, this.contracts.Meeting, meeting).then(contractAddress => {
            meeting.contractAddress = contractAddress;
            this.repo.Meeting.create(meeting, client).then(meetingId => {
                res.status(201).json({result: meetingId});
            }).catch(err => res.status(500).json({
                error: {
                    errorKey: 'internal.db',
                    additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
                }
            }));
        }).catch(err => res.status(600).json({
            error: {
                errorKey: 'external.down',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/meetings/:meeting_id/add_user Add user
     * @apiName addMeetingUser
     * @apiGroup Meeting
     * @apiPermission logged-in
     * @apiDescription Add user on a pending meeting
     * @apiParam (Path) {String} version Version number
     * @apiParam (Path) {Number} meeting_id The meeting to consider
     * @apiParam (Body) {Number} user_id The user to add
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 400 Meeting in a bad state
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 403 No admin
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object', properties: {
            user_id: {type: 'integer', minimum: 1, required: true}
        }
    })
    addMeetingUser(req: Request, res: Response) {
        const subject: Meeting = res.locals.subject;
        const client: ClientBase = res.locals.dbClient;
        if(subject.timeBegin < new Date()) {
            res.status(400).json({
                error: {
                    errorKey: 'client.badState',
                    additionalInfo: 'client.extended.notOpenLaunch'
                }
            });
            return;
        }
        this.repo.User.get(req.body.user_id, client, false).then(user => {
            return this.repo.UserMeeting.create({
                user__id: user.id,
                meeting_id: subject.id
            }, client).then(() => res.status(204).end());
        }).catch(err => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }

    /**
     * @api {post} /api/v:version/meetings/:meeting_id/delete_user Remove a user
     * @apiName deleteUserMeeting
     * @apiGroup Meeting
     * @apiPermission logged-in
     * @apiDescription Delete the user the meeting
     * @apiParam (Path) {String} version Version number
     * @apiParam (Path) {Number} meeting_id The meeting to act upon
     * @apiParam (Body) {Number} user__meeting_id The user bound to the meeting
     * @apiSuccess (Success 204) {Empty} _ Empty body
     * @apiError (Error 4XX) 400 Meeting in bad state
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 403 No admin
     * @apiError (Error 5XX) 500 Database error
     */
    @WithBody({
        type: 'object',
        properties: {
            user__meeting_id: {type: 'integer', minimum: 1, required: true}
        }
    })
    deleteUserMeeting(req: Request, res: Response) {
        const subject: Meeting = res.locals.subject;
        if(subject.timeBegin > new Date()) {
            res.status(400).json({
                error: {
                    errorKey: 'client.badState',
                    additionalInfo: 'client.extended.notOpenLaunch'
                }
            });
            return;
        }
        this.repo.UserMeeting.delete(req.body.user__meeting_id, res.locals.dbClient).then(() => {
            res.status(204).end();
        }).catch((err: any) => res.status(500).json({
            error: {
                errorKey: 'internal.db',
                additionalInfo: {message: err.message, stack: this.config.debug && err.stack}
            }
        }));
    }
}
