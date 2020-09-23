import {ClientBase, Pool} from 'pg';
import {Logger} from 'winston';

export interface Model<T> {
    id?: T;
    updatedOn?: Date;
}
export interface ArchivedModel<T> extends Model<T> {
    createdOn?: Date;
    archivedOn?: Date;
    replaced_id?: T;
    replaced_by_id?: T;
}

export interface ModelRepr {
    table: string;
}

export interface ViewCount<T> {
    views: T[];
    count: number;
}

abstract class Dao<R, T extends Model<R>> implements ModelRepr {
    constructor(protected pool: Pool, protected logger: Logger, public table: string, protected nFields: number,
                protected updateDefinition: string) {
    }

    update(instance: T, client: ClientBase): Promise<R> {
        if((<any>instance).archivedOn) return Promise.reject('Record archived!');
        instance.updatedOn = new Date();
        const props = this.serialize(instance);
        props.push(instance.id);
        return client.query('UPDATE ' + this.table + ' SET ' + this.updateDefinition + ' WHERE id=$' + (this.nFields + 1), props).then(() => instance.id);
    }

    create(instance: T, client?: ClientBase): Promise<R> {
        (<any>instance).createdOn = instance.updatedOn = new Date();
        const props = this.serialize(instance);
        return (client || this.pool).query('INSERT INTO ' + this.table + '(' + this.updateDefinition.replace(/=\$\d+/g, '').replace(/=[^)]+\)/g, '') + ')'
            + ' VALUES(' + new Array(this.nFields).fill(undefined).map((_, i: number) => '$' + (i + 1)).join(',') + ') RETURNING id',
            props).then(q => {
                const idNum = parseInt(q.rows[0].id, 10);
                if(String(idNum) !== q.rows[0].id) return q.rows[0].id;
                return idNum;
            });
    }

    createSeveral(instances: T[], client?: ClientBase): Promise<R[]> {
        if(!instances.length) return Promise.resolve([]);
        const now = new Date();
        instances.forEach(instance => (<any>instance).createdOn = instance.updatedOn = now);
        const props = [].concat.apply([], instances.map(instance => this.serialize(instance)));
        return (client || this.pool).query('INSERT INTO ' + this.table + '(' + this.updateDefinition.replace(/=\$\d+/g, '').replace(/=[^)]+\)/g, '') + ')'
            + ' VALUES' + instances.map((_, j) =>
                ('(' + new Array(this.nFields).fill(undefined).map((__, i: number) => '$' + (j * this.nFields + i + 1)).join(', ') + ')')).join(',') + ' RETURNING id',
            props).then(q => q.rows.map(r => {
                const idNum = parseInt(r.id, 10);
                if(String(idNum) !== q.rows[0].id) return r.id;
                return idNum;
            }));
    }

    protected abstract buildObject(q: any): T;

    protected abstract serialize(instance: T): any[];
}

export abstract class ModelDao<R, T extends Model<R>> extends Dao<R, T> {
    get(id: R, client?: ClientBase, lock = true): Promise<T> {
        return (client || this.pool).query('SELECT * FROM ' + this.table + ' WHERE id=$1' + ((client && lock) ? ' FOR UPDATE' : ''), [id]).then(q => this.buildObject(q.rows[0]));
    }

    count(where?: string, inputs: any[] = [], client?: ClientBase): Promise<number> {
        return (client || this.pool).query('SELECT count(*) AS cnt FROM ' + this.table + (where ? (' WHERE ' + where) : ''), inputs).then(q => parseInt(q.rows[0].cnt, 10));
    }

    getList(ids: R[], client?: ClientBase, lock = true): Promise<T[]> {
        return (client || this.pool).query('SELECT * FROM ' + this.table + ' WHERE id=ANY($1)' + ((client && lock) ? ' FOR UPDATE' : ''), [ids])
            .then(q => q.rows.map(r => this.buildObject(r)));
    }

    getAllBy(order?: string, offset?: number, limit?: number, where?: string, inputs: any[] = [], client?: ClientBase, lock = true): Promise<T[]> {
        return (client || this.pool).query('SELECT * FROM ' + this.table + (where ? (' WHERE ' + where) : '') + (order ? (' ORDER BY ' + order) : '')
            + (offset ? (' OFFSET ' + offset) : '') + (limit !== undefined ? (' LIMIT ' + limit) : '') + ((client && lock) ? ' FOR UPDATE' : ''), inputs)
            .then(q => q.rows.map(r => this.buildObject(r)));
    }

    getViewCountBy(order?: string, offset?: number, limit?: number, where?: string, inputs: any[] = [], client?: ClientBase, lock = true): Promise<ViewCount<T>> {
        return (client || this.pool).query('SELECT *, COUNT(*) OVER() AS cnt FROM ' + this.table + (where ? (' WHERE ' + where) : '') + (order ? (' ORDER BY ' + order) : '')
            + (offset ? (' OFFSET ' + offset) : '') + (limit !== undefined ? (' LIMIT ' + limit) : '') + ((client && lock) ? ' FOR UPDATE' : ''), inputs)
            .then(q => ({
                views: q.rows.map(r => this.buildObject(r)),
                count: q.rows.length ? parseInt(q.rows[0].cnt, 10) : 0
            }));
    }

    archive(id: R, replacedById: R, client: ClientBase): Promise<any> {
        return client.query('UPDATE ' + this.table + ' SET "archivedOn"=now(),replaced_by_id=$1 WHERE id=$2', [replacedById, id]);
    }

    delete(id: R, client: ClientBase): Promise<any> {
        return client.query('DELETE FROM ' + this.table + ' WHERE id=$1', [id]);
    }
}
