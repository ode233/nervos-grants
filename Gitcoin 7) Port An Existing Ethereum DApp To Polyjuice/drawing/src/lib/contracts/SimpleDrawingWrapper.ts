import Web3 from 'web3';
import * as SimpleDrawingJSON from '../../../build/contracts/SimpleDrawing.json';
import { SimpleDrawing } from '../../types/SimpleDrawing';

const DEFAULT_SEND_OPTIONS = {
    gas: 60000000
};

export class SimpleDrawingWrapper {
    web3: Web3;

    contract: SimpleDrawing;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(SimpleDrawingJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getStoredValue(fromAddress: string) {
        const drawingData = await this.contract.methods.get().call({ from: fromAddress });

        return drawingData;
    }

    async setStoredValue(value: string, fromAddress: string) {
        const tx = await this.contract.methods.set(value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
        });

        return tx;
    }

    async deploy(fromAddress: string, drawingData: string) {
        const deployTx = await (this.contract
            .deploy({
                data: SimpleDrawingJSON.bytecode,
                arguments: [drawingData]
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
