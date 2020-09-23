import {Pool} from 'pg';
import {Logger} from 'winston';
import {ModelDao} from './repository/ModelDao';

export interface Migration {
    id: number;
    hash: string;
    sqlUp: string;
    sqlDown: string;
    state: number;
}

export class MigrationRepository extends ModelDao<number, Migration> {
    constructor(protected pool: Pool, protected logger: Logger) {
        super(pool, logger, 'migration', 5, 'id=$1,hash=$2,"sqlUp"=$3,"sqlDown"=$4,state=$5');
    }

    buildObject(q: any): Migration {
        if(!q) return undefined;
        q.id = parseInt(q.id, 10);
        q.hash = q.hash.trim();
        q.state = parseInt(q.state, 10);
        return q;
    }

    serialize(instance: Migration): any[] {
        return [instance.id, instance.hash, instance.sqlUp, instance.sqlDown, instance.state];
    }
}
