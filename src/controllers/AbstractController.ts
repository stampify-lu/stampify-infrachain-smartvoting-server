import {Contract} from 'web3-eth-contract';
import {Logger} from 'winston';
import {Configuration} from '../index';
import {ModelRepository} from '../models/repository/ModelRepository';

export interface ContractRepr {
    abi: Contract;
    bin: string;
    json: string;
}

export class AbstractController {
    constructor(public repo: ModelRepository, public config: Configuration, public logger: Logger,
                public contracts: {

                    Meeting: ContractRepr
        },
                public plugins: {}) {
    }
}
