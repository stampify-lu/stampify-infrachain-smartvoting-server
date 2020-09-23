import {ClientBase, Pool} from 'pg';
import {Logger} from 'winston';
import {Model, ModelDao, ViewCount} from './repository/ModelDao';

export const enum Vote {
    POSITIVE = 0,
    NEGATIVE = 1,
    BLANK = 2,
    ABST = 3
}

export interface Meeting extends Model<number> {
    name: string;
    timeBegin: Date;
    timeEnd: Date;
    timeFrozen: Date;
    contractAddress: string;
}

export class MeetingRepository extends ModelDao<number, Meeting> {
    constructor(protected pool: Pool, protected logger: Logger) {
        super(pool, logger, 'meeting', 6, '"updatedOn"=$1,"name"=$2,"timeBegin"=$3,"timeEnd"=$4,"timeFrozen"=$5,"contractAddress"=$6');
    }

    buildObject(q: any): Meeting {
        if(!q) return undefined;
        q.id = parseInt(q.id, 10);
        q.updatedOn = q.updatedOn && new Date(q.updatedOn);
        q.timeBegin = new Date(q.timeBegin);
        q.timeEnd = new Date(q.timeEnd);
        q.timeFrozen = new Date(q.timeFrozen);
        return q;
    }

    serialize(instance: Meeting): any[] {
        return [instance.updatedOn, instance.name, instance.timeBegin, instance.timeEnd, instance.timeFrozen, instance.contractAddress];
    }

    update(instance: Meeting, client?: ClientBase): Promise<number> {
        return super.update(instance, client || <any>this.pool);
    }

    getForUserViewCountBy(userId: number, order?: string, offset?: number, limit?: number, where?: string, inputs: any[] = [], client?: ClientBase, lock = true): Promise<ViewCount<Meeting>> {
        inputs = [...inputs, userId];
        return (client || this.pool).query('SELECT m.*, COUNT(*) OVER() AS cnt FROM ' + this.table + ' m INNER JOIN user__meeting um ON m.id=um.meeting_id '
            + ' WHERE um.user__id=$' + inputs.length + (where ? (' AND ' + where) : '') + (order ? (' ORDER BY ' + order) : '')
            + (offset ? (' OFFSET ' + offset) : '') + (limit !== undefined ? (' LIMIT ' + limit) : '') + ((client && lock) ? ' FOR UPDATE' : ''), inputs)
            .then(q => ({
                views: q.rows.map(r => this.buildObject(r)),
                count: q.rows.length ? parseInt(q.rows[0].cnt, 10) : 0
            }));
    }
}
