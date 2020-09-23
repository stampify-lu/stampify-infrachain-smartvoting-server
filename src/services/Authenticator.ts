import * as jwt from 'jsonwebtoken';

interface Validator {
    validate(token: string): Promise<number>;
}

function deleteCache(token: string) {
    delete this.tokenCache[token];
}

export class Authenticator implements Validator {
    private tokenCache: {[id: string]: number} = {};

    constructor(private certificate: string | Buffer, private verify: boolean) {}

    validate(token: string): Promise<number> {
        if(this.tokenCache[token]) return Promise.resolve(this.tokenCache[token]);
        return new Promise((resolve, reject) => {
            if(this.verify) {
                jwt.verify(token, this.certificate, (err, decoded) => {
                    if(err) return reject(err);
                    this.tokenCache[token] = (<any>decoded).sub;
                    setTimeout(deleteCache.bind(this, token), Math.min((<any>decoded).exp * 1000 - Date.now(), 2147483647));
                    resolve(this.tokenCache[token]);
                });
            } else {
                const decoded = jwt.decode(token);
                return resolve((<any>decoded).sub);
            }
        });
    }
}
