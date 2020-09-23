import {Request, Response} from 'express';
import {scheduleJob} from 'node-schedule';
import {Logger} from 'winston';
import {Configuration} from '..';
import {MockResponse} from '../../test/mocks';
import {ContractRepr} from '../controllers/AbstractController';
import {ModelRepository} from '../models/repository/ModelRepository';
import { Vote } from '../models/Meeting';
import {readMeetingVoteCall, updateMeetingTransaction} from '../services/executor';
import {withTransaction} from '../services/WithTransaction';

declare const Promise: PromiseConstructor & {
    allConcurrent: <T>(n: number) => ((promiseProxies: (() => Promise<T>)[]) => Promise<T[]>);
};

export function watchEndVotes(repo: ModelRepository, logger: Logger, Meeting: ContractRepr, config: Configuration) {
    scheduleJob(Math.floor(Math.random() * 60) + ' * * * * *', () => withTransaction(repo, logger, (_: Request, res: Response) => {
        return repo.Meeting.getAllBy(undefined, undefined, undefined, '"timeEnd"<now() AND "timeFrozen" IS NULL').then(meetings => {
            return Promise.allConcurrent(1)(meetings.map(meeting => () => {
                return repo.UserMeeting.getForMeeting(meeting).then(ums => {
                    return Promise.all(ums.map(um => repo.User.get(um.user__id).then(u => readMeetingVoteCall(config, Meeting, meeting, u.publicAddress)))).then(votes => {
                        const vf = votes.reduce((prev, now) => prev + (now === Vote.POSITIVE ? 1 : 0), 0);
                        const va = votes.reduce((prev, now) => prev + (now === Vote.NEGATIVE ? 1 : 0), 0);
                        const ve = votes.reduce((prev, now) => prev + (now !== Vote.POSITIVE && now !== Vote.NEGATIVE ? 1 : 0), 0);
                        return updateMeetingTransaction(config, Meeting, meeting, vf, va, ve);
                    });
                }).then(() => {
                    meeting.timeFrozen = new Date();
                    return repo.Meeting.update(meeting, res.locals.dbClient);
                });
            })).then(() => res.status(204).end());
        }).catch(err => {
            logger.error('Cannot watch transfers: %j', err);
            res.status(500).end();
        });
    }).call({repo: repo}, undefined, new MockResponse({}, () => undefined), undefined));
}
