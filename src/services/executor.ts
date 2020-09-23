import {pki} from 'node-forge';
import {Configuration} from '..';
import {ContractRepr} from '../controllers/AbstractController';
import {Meeting, Vote} from '../models/Meeting';

export function insertMeetingTransaction(config: Configuration, Meeting: ContractRepr, meeting: Meeting): Promise<string> {
    return new Promise((resolve, reject) => {
        Meeting.abi.deploy({
            data: Meeting.bin,
            arguments: [Math.floor(meeting.timeBegin.getTime() / 1000), Math.floor(meeting.timeEnd.getTime() / 1000)]
        }).send({
            from: config.server.blockchain.address,
            gas: 1500000,
            gasPrice: '20000000000'
        }).on('error', err => {
            reject(err);
        }).then(contract => {
            resolve(contract.options.address);
        }).catch(reject);
    });
}

export function updateMeetingTransaction(config: Configuration, Meeting: ContractRepr, meeting: Meeting, vf: number, va: number, ve: number): Promise<undefined> {
    return new Promise((resolve, reject) => {
        Meeting.abi.options.address = meeting.contractAddress;
        Meeting.abi.methods.set_result(vf, va, ve).send({
            from: config.server.blockchain.address,
            gas: 1500000,
            gasPrice: '20000000000'
        }).on('error', (err: any) => {
            reject(err);
        }).then(() => {
            resolve();
        }).catch(reject);
    });
}

export function readMeetingVoteCall(config: Configuration, Meeting: ContractRepr, meeting: Meeting, addr: string): Promise<Vote> {
    return new Promise(resolve => {
        Meeting.abi.options.address = meeting.contractAddress;
        Meeting.abi.methods.get_vote_cypher(addr).call({
            from: config.server.blockchain.address,
            gas: 1500000,
            gasPrice: '20000000000'
        }).then((read: string) => {
            const decypherKey = pki.privateKeyFromPem(config.server.contractVoteDecypher);
            try {
                const msg = decypherKey.decrypt((<any>Meeting.abi).extend.utils.toAscii(read));
                resolve(parseInt(msg, 10));
            } catch(e) {
                resolve(Vote.BLANK);
            }
        }).catch(() => resolve(Vote.BLANK));
    });
}

