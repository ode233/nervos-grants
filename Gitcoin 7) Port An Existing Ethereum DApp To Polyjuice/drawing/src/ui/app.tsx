/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { SimpleDrawingWrapper } from '../lib/contracts/SimpleDrawingWrapper';
import { CONFIG } from '../config';

import CanvasDraw from 'react-canvas-draw';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<SimpleDrawingWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);

    const canvasDraw = React.useRef<CanvasDraw>(null);

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];

    async function deployContract(drawingData: string) {
        const _contract = new SimpleDrawingWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);
            const transactionHash = await _contract.deploy(account, drawingData);

            setDeployTxHash(transactionHash);
            
            setContract(_contract);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            throw error;
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function setExistingContractAddress(contractAddress: string) {
        try{
            const _contract = new SimpleDrawingWrapper(web3);
            _contract.useDeployed(contractAddress.trim());
            setContract(_contract);

            const drawingData = await _contract.getStoredValue(account);
            console.log(drawingData);
            canvasDraw.current.loadSaveData(drawingData)
            toast('Successfully read latest stored value.', { type: 'success' });
        } catch (error){
            toast.error(
                error
            );
        }
    }

    async function save() {
        try {
            setTransactionInProgress(true);
            
            let drawingData = canvasDraw.current.getSaveData()
            console.log(drawingData);
            if(!contract?.address){
                toast(
                    'save to a new contract',
                    { type: 'info' }
                );
                await deployContract(drawingData);
            }
            else{
                toast(
                    `save to a exist contract\n${contract.address}`,
                    { type: 'info' }
                );
                await contract.setStoredValue(drawingData, account);
            }
            toast(
                'Successfully set latest stored drawing. You can refresh the read drawing now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    let state = {
        color: "#ffc600",
        width: 800,
        height: 400,
        brushRadius: 10,
        lazyRadius: 12
    };

    return (
        <div>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br />
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            Deploy transaction hash: <b>{deployTxHash || '-'}</b>
            <br />
            <hr />

            <p>
                The button below will deploy a SimpleDrawing smart contract where you can store a
                drawing.
            </p>
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />
            
            <button onClick={save}>
                Save
            </button>
            &nbsp;&nbsp;
            <button
                onClick={() => {
                    canvasDraw.current.clear();
                }}
            >
                Clear
            </button>
            &nbsp;&nbsp;
            <button
                onClick={() => {
                    canvasDraw.current.undo();
                }}
            >
                Undo
            </button>           
            <p>now contract address: {contract?.address}</p>
            <div>
                <CanvasDraw 
                    ref={canvasDraw}
                    brushColor={state.color}
                    brushRadius={state.brushRadius}
                    lazyRadius={state.lazyRadius}
                    canvasWidth={state.width}
                    canvasHeight={state.height}
                />
            </div>

            <br />
            <br />
            <hr />
            The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each
            transaction you might need to wait up to 120 seconds for the status to be reflected.
            <ToastContainer />
        </div>
    );
}
