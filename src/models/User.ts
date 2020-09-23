import {ClientBase, Pool} from 'pg';
import {Logger} from 'winston';
import {MemoryCache} from './repository/MemoryCache';
import {Model, ModelDao} from './repository/ModelDao';
import {ModelRepository} from './repository/ModelRepository';

export const enum UserPlatformRole {
    CUSTOMER = 0,
    ADMIN = 1
}
export const enum I18nLang {
    EN = 0,
    FR = 1,
    IT = 2
}
export function i18nToString(i18n: I18nLang): string {
    switch(i18n) {
        case I18nLang.EN: return 'en';
        case I18nLang.FR: return 'fr';
        case I18nLang.IT: return 'it';
        default: return 'en';
    }
}

export interface User extends Model<number> {
    firstName: string;
    lastName: string;
    lang: I18nLang;
    role: UserPlatformRole;
    accountName: string;
    passwordHash: string;
    salt: string;
    publicAddress: string;
    resetKey: string;
}

export class UserRepository extends ModelDao<number, User> {

    constructor(_: ModelRepository, protected pool: Pool, protected logger: Logger, public cache: MemoryCache<User>) {
        super(pool, logger, 'user_', 10, '"updatedOn"=$1,"firstName"=$2,"lastName"=$3,"lang"=$4,' +
            '"role"=$5,"accountName"=$6,"passwordHash"=$7,salt=$8,"publicAddress"=$9,"resetKey"=$10');
    }

    buildObject(q: any): User {
        if(!q) return undefined;
        q.id = parseInt(q.id, 10);
        q.updatedOn = q.updatedOn && new Date(q.updatedOn);
        q.lang = parseInt(q.lang, 10);
        q.role = parseInt(q.role, 10);
        return q;
    }

    serialize(instance: User): any[] {
        return [instance.updatedOn, instance.firstName, instance.lastName, instance.lang,
            instance.role, instance.accountName, instance.passwordHash, instance.salt, instance.publicAddress, instance.resetKey];
    }

    get(id: number, client?: ClientBase, lock = true): Promise<User> {
        const finish = () => (client || this.pool).query(`SELECT * FROM ${this.table} u WHERE u.id=$1 ${(client && lock) ? ' FOR UPDATE OF u' : ''}`,
            [id]).then(q => {
                const user = this.buildObject(q.rows[0]);
                if(!user) return undefined;
                this.cache.set(user.id, user).catch(() => undefined);
                return user;
            });
        if(client) return finish();
        return this.cache.get(id).then(cached => {
            if(cached) return cached;
            return finish();
        });
    }

    getByAccountName(accountName: string, client?: ClientBase, lock = true): Promise<User> {
        return (client || this.pool).query(`SELECT * FROM ${this.table} u WHERE u."accountName"=$1 ${(client && lock) ? ' FOR UPDATE OF u' : ''}`,
            [accountName]).then(q => {
                const user = this.buildObject(q.rows[0]);
                if(!user) return undefined;
                this.cache.set(user.id, user).catch(() => undefined);
                return user;
            });
    }

    getList(ids: number[], client?: ClientBase, lock = true): Promise<User[]> {
        return (client || this.pool).query(`SELECT * FROM ${this.table} u WHERE u.id=ANY($1) ${(client && lock) ? ' FOR UPDATE OF u' : ''}`,
            [ids]).then(q => {
                const users = q.rows.map(r => this.buildObject(r));
                Promise.all(users.map(u => this.cache.set(u.id, u))).catch(() => undefined);
                return users;
            });
    }

    search(search: string, client?: ClientBase): Promise<User[]> {
        return (client || this.pool).query(`SELECT * FROM ${this.table} u
WHERE ("firstName" ilike $1 OR "lastName" ilike $1 OR "accountName" ilike $1 OR id like $1)`, ['%' + search + '%'])
            .then(q => q.rows.map(r => this.buildObject(r)));
    }

    update(instance: User, client: ClientBase): Promise<undefined> {
        instance.updatedOn = new Date();
        const props = this.serialize(instance);
        props.push(instance.id);
        return client.query('UPDATE ' + this.table + ' SET ' + this.updateDefinition + ' WHERE id=$' + (this.nFields + 1), props)
            .then(() => this.cache.delete(instance.id)).then(() => undefined);
    }

    delete(id: number, client: ClientBase): Promise<any> {
        return super.delete(id, client).then(() => this.cache.delete(id));
    }
}

export function toUserView(_: ModelRepository, user: User): Promise<any> {
    const view = {
        ...user
    };
    delete view.passwordHash;
    delete view.salt;
    delete view.publicAddress;
    return Promise.resolve(view);
}
