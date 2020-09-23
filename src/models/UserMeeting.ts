import {ClientBase, Pool} from 'pg';
import {Logger} from 'winston';
import {MemoryCache} from './repository/MemoryCache';
import {Model, ModelDao} from './repository/ModelDao';
import {Meeting} from './Meeting';

export interface UserMeeting extends Model<number> {
    user__id: number;
    meeting_id: number;
}

export class UserMeetingRepository extends ModelDao<number, UserMeeting> {
    constructor(protected pool: Pool, protected logger: Logger, public cache: MemoryCache<UserMeeting[]>) {
        super(pool, logger, 'user__meeting', 2, 'user__id=$1,meeting_id=$2');
    }

    buildObject(q: any): UserMeeting {
        if(!q) return undefined;
        q.id = parseInt(q.id, 10);
        q.user__id = parseInt(q.user__id, 10);
        q.meeting_id = parseInt(q.meeting_id, 10);
        return q;
    }

    serialize(instance: UserMeeting): any[] {
        return [instance.user__id, instance.meeting_id];
    }

    update(instance: UserMeeting, client: ClientBase): Promise<number> {
        return super.update(instance, client).then(id => {
            this.cache.clear();
            return id;
        });
    }

    getForMeeting(meeting: Meeting, client?: ClientBase, lock = true, cache = true): Promise<UserMeeting[]> {
        const finish = () => (client || this.pool).query('SELECT t.* FROM ' + this.table + ' t INNER JOIN meeting'
            + ' j ON t."meeting_id"=j.id WHERE meeting_id=$1'
            + ((client && lock) ? ' FOR UPDATE' : ''), [meeting.id]).then(q => {
                const res = q.rows.map(r => this.buildObject(r));
                this.cache.set(meeting.id, res).catch(() => undefined);
                return res;
            });
        if(client || !cache) return finish();
        return this.cache.get(meeting.id).then(cached => {
            if(cached) return cached;
            return finish();
        });
    }
}
