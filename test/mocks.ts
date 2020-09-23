export class MockResponse {
    statusCode: number;
    body: any;
    constructor(public locals: any, private cb: (res: MockResponse) => void) {}
    type(_?: string) {return this; }
    status(code: number) {this.statusCode = code; return this; }
    json(body?: any) {this.body = body; this.cb(this); }
    end() {this.cb(this); }
    write(body?: any) {try {this.body = JSON.parse(body || '{}'); } catch(err) {this.body = body; }}
}
