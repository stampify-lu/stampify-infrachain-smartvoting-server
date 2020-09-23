import * as Memcached from 'memcached';

export class MemoryCache<T> {

    private localCache = {};

    constructor(private localKey: string, private cache?: Memcached) {
    }

    list(): Promise<T[]> {
        if(this.cache) return new Promise(resolve => {
            let pending = true;
            setTimeout(() => {
                if(pending) {
                    pending = false;
                    resolve([]);
                }
            }, 250);
            this.cache.items((_, data) => {
                if(pending) {
                    pending = false;
                    resolve(data.map(s => {
                        const value = <string>s[Object.getOwnPropertyNames(s).find(sname => sname.startsWith(this.localKey))];
                        return value && JSON.parse(value);
                    }).filter(x => x));
                }
            });
        });
        else return Promise.resolve(Object.getOwnPropertyNames(this.localCache).map(key => this.localCache[key]));
    }

    get(key: string | number): Promise<T> {
        if(this.cache) return new Promise(resolve => {
            let pending = true;
            setTimeout(() => {
                if(pending) {
                    pending = false;
                    resolve(undefined);
                }
            }, 250);
            this.cache.get(this.localKey + key, (_, data) => {
                if(pending) {
                    pending = false;
                    resolve(data && JSON.parse(data));
                }
            });
        });
        else return Promise.resolve(this.localCache[key]);
    }

    set(key: string | number, val: T): Promise<void> {
        if(this.cache) return new Promise(resolve => this.cache.add(this.localKey + key, JSON.stringify(val), 15 * 60, resolve));
        else {
            this.localCache[key] = val;
            return Promise.resolve();
        }
    }

    delete(key: string | number): Promise<void> {
        if(this.cache) {
            return new Promise(resolve => {
                let fired = false;
                const handler = setTimeout(() => {
                    fired = true;
                    resolve();
                }, 50);
                this.cache.del(this.localKey + key, () => {
                    if(!fired) {
                        clearTimeout(handler);
                        resolve();
                    }
                });
            });
        } else {
            this.localCache[key] = undefined;
            return Promise.resolve();
        }
    }

    clear() {
        if(this.cache) {
            this.localKey = this.localKey + '_';
            if(this.localKey.length > 40)
                this.localKey = this.localKey.replace(/_+$/, '');
        } else this.localCache = {};
    }
}
