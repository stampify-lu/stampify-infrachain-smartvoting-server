import {Logger} from 'winston';

export function atob(str: string): string {
    return Buffer.from(str, 'base64').toString('binary');
}

export function btoa(str: string): string {
    return Buffer.from(str).toString('base64');
}

export function clientErrorHandle(this: Logger, err: any) {
    this.error('Error on DB client: %j', err);
}
export const utils: {[id: string]: any} = {
    clientErrorHandler: undefined
};
