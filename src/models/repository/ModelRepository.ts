import * as fs from 'fs';
import * as Memcached from 'memcached';
import {md} from 'node-forge';
import {ClientBase, Pool} from 'pg';
import {Logger} from 'winston';
import {MeetingRepository} from '../Meeting';
import {Migration, MigrationRepository} from '../Migration';
import {User, UserRepository} from '../User';
import {MemoryCache} from './MemoryCache';
import {ModelRepr} from './ModelDao';
import {UserMeetingRepository, UserMeeting} from '../UserMeeting';

export class ModelRepository {
    Migration: MigrationRepository;
    User: UserRepository;
    UserMeeting: UserMeetingRepository;
    Meeting: MeetingRepository;

    constructor(public db: Pool, public dbSpare: Pool, public logger: Logger, public cache: Memcached) {
        const dbQuery = db.query.bind(db);
        db.query = (function (text: any, values: any, cb: any) {
            if((this.idleCount + this.waitingCount) >= this.totalCount && this.totalCount === this.options.max)
                return dbSpare.query(text, values, cb);
            return dbQuery(text, values, cb);
        }).bind(db);
        this.Migration = new MigrationRepository(db, logger);
        this.User = new UserRepository(this, db, logger, new MemoryCache<User>('user', cache));
        this.UserMeeting = new UserMeetingRepository(db, logger, new MemoryCache<UserMeeting[]>('user__meeting'));
        this.Meeting = new MeetingRepository(db, logger);
    }

    migrate(migrationsPath: string, callback: (() => void)) {
        this.db.query('CREATE TABLE IF NOT EXISTS migration (' +
            'id integer PRIMARY KEY,' +
            'hash text NOT NULL,' +
            '"sqlUp" text NOT NULL,' +
            '"sqlDown" text NOT NULL,' +
            'state integer NOT NULL' +
            ')').then(() => {
            this.Migration.getAllBy('id').then((migrations: Migration[]) => {
                if(migrations.find(migration => migration.state !== 0)) process.exit(4); // Have to fix manually
                // Read the new ones
                fs.readdir(migrationsPath, (_, files) => {
                    const migrationsAvailable = files
                        .filter(file => /[0-9]+\.sql/.test(file))
                        .map(file => parseInt(file.split('.sql')[0], 10))
                        .filter(file => file > 0)
                        .sort((a, b) => a - b)
                        .map(file => {
                            const content = fs.readFileSync(migrationsPath + file + '.sql', 'utf-8');
                            return {
                                id: file,
                                content: content,
                                hash: md.sha256.create().update(content).digest().toHex()
                            };
                        });
                    if(migrationsAvailable.length === 0
                        || migrationsAvailable.length
                        !== migrationsAvailable[migrationsAvailable.length - 1].id) process.exit(5); // Did not use OK files
                    let highestCommon = 0;
                    while(highestCommon < migrations.length && highestCommon < migrationsAvailable.length
                    && migrations[highestCommon].hash === migrationsAvailable[highestCommon].hash)
                        highestCommon++;
                    this.applyDownUntil(migrations, migrations.length, highestCommon).then(() => {
                        this.applyUpUntil(migrationsAvailable, highestCommon, migrationsAvailable.length).then(callback, process.exit);
                    }, process.exit);
                });
            }, () => process.exit(3));
        }, () => process.exit(2));
    }

    lockTables(tables: ModelRepr[], client: ClientBase): Promise<any> {
        return Promise.all(tables.map(t => client.query('LOCK TABLE ' + t.table + ' IN EXCLUSIVE MODE')));
    }

    private applyUpUntil(migrations: {id: number, content: string, hash: string}[], current: number, until: number): Promise<void> {
        if(current < until)
            return this.applyUp(migrations[current]).then(() => this.applyUpUntil(migrations, current + 1, until));
        return Promise.resolve();
    }

    private applyUp(migration: {id: number, content: string, hash: string}): Promise<void> {
        return new Promise((resolve, reject) => {
            const sqlParts = migration.content.split('----');
            this.Migration.create({
                id: migration.id,
                hash: migration.hash,
                sqlUp: sqlParts[0],
                sqlDown: sqlParts[1],
                state: 2
            }).then(() => {
                this.db.query(sqlParts[0], (err: any) => {
                    if(err) {
                        console.error(err);
                        reject(10);
                    } else {
                        this.db.query('UPDATE "migration" SET "state"=0 WHERE "id"=' + migration.id, (err2: any) => {
                            if(err2) reject(11); // No cleanup
                            else resolve();
                        });
                    }
                });
            }, () => process.exit(9));
        });
    }

    private applyDownUntil(migrations: Migration[], current: number, until: number): Promise<void> {
        if(current > until) {
            current--;
            return this.applyDown(migrations[current]).then(() => this.applyDownUntil(migrations, current, until));
        }
        return Promise.resolve();
    }

    private applyDown(migration: Migration): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.query('UPDATE "migration" SET "state"=1 WHERE "id"=' + migration.id, (err: any) => {
                if(err) reject(6); // No required change
                else this.db.query(migration.sqlDown, (err2: any) => {
                    if(err2) {
                        console.error(err2);
                        reject(7);
                    } // No apply down
                    else this.db.query('DELETE FROM "migration" WHERE "id"=' + migration.id, (err3: any) => {
                        if(err3 && migration.id !== 1) reject(8); // No cleanup for not base migration
                        else {
                            if(migration.id === 1) {
                                this.db.query('CREATE TABLE IF NOT EXISTS migration (' +
                                    'id integer PRIMARY KEY,' +
                                    'hash text NOT NULL,' +
                                    '"sqlUp" text NOT NULL,' +
                                    '"sqlDown" text NOT NULL,' +
                                    'state integer NOT NULL' +
                                    ')').then(() => resolve(), reject);
                            } else resolve();
                        }
                    });
                });
            });
        });
    }
}
