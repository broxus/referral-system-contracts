import {Account, deployAccount, logContract } from "./utils";
import BigNumber from "bignumber.js"
import _ from "underscore"
import logger from "mocha-logger"
import { Contract } from "locklift";

const chai = require('chai')
chai.use(require('chai-bignumber')())

const { expect } = chai


export async function setupAlienMultiVault(owner: Account, staking: Contract, options: { chainId: number}): Promise<[Contract, Contract, Contract, Account]> {
    const _randomNonce = locklift.utils.getRandomNonce();
    const [keyPair] = await locklift.keys.getKeyPairs();

    // Deploy initializer account
    const initializer = await deployAccount(keyPair, 20)
    initializer.setKeyPair(keyPair);
    initializer.afterRun = afterRun;
    initializer.name = 'Event initializer';

    await logContract(initializer);

    // Deploy proxy
    const Proxy = await locklift.factory.getContract('ProxyNftTransferAlien');
    const proxy = await locklift.giver.deployContract({
        contract: Proxy,
        constructorParams: {
            owner_: owner.address,
            codeCollection_: (await locklift.factory.getContract("CollectionAlien")).code,
            codeNft_: (await locklift.factory.getContract("ProxyNft")).code
        },
        initParams: {
            _randomNonce,
        },
        keyPair
    }, locklift.utils.convertCrystal(2, 'nano'));

    await logContract(proxy);

    // Deploy EVM configuration
    const EthereumEventConfiguration = await locklift.factory.getContract('EthereumEventConfiguration');
    const EthereumEvent = await locklift.factory.getContract('NftTransferEVMEventAlien');

    const evmEventConfiguration = await locklift.giver.deployContract({
        contract: EthereumEventConfiguration,
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
                staking: staking.address,
                eventCode: EthereumEvent.code,
            },
            networkConfiguration: {
                chainId: 1,
                eventEmitter: new BigNumber(0),
                eventBlocksToConfirm: 1,
                proxy: proxy.address,
                startBlockNumber: 0,
                endBlockNumber: 0,
            },
            _randomNonce
        },
        keyPair
    }, locklift.utils.convertCrystal(2, 'nano'));

    await logContract(evmEventConfiguration);

    // Deploy Everscale configuration
    const EverscaleEventConfiguration = await locklift.factory.getContract('EverscaleEventConfiguration');
    const EverscaleEvent = await locklift.factory.getContract('NftTransferEverscaleEventAlien');

    const everscaleEventConfiguration = await locklift.giver.deployContract({
        contract: EverscaleEventConfiguration,
        constructorParams: {
            _owner: owner.address,
            _meta: '',
        },
        initParams: {
            basicConfiguration: {
                eventABI: '',
                eventInitialBalance: locklift.utils.convertCrystal('2', 'nano'),
                staking: staking.address,
                eventCode: EverscaleEvent.code,
            },
            networkConfiguration: {
                eventEmitter: proxy.address,
                proxy: new BigNumber(0),
                startTimestamp: 0,
                endTimestamp: 0,
            },
            _randomNonce
        },
        keyPair
    }, locklift.utils.convertCrystal(2, 'nano'));

    await logContract(everscaleEventConfiguration);

    // Set proxy configuration
    const AlienCollection = await locklift.factory.getContract('CollectionAlien');
    const AlienNft = await locklift.factory.getContract('ProxyNft');
    
    await owner.runTarget({
        contract: proxy,
        method: 'setConfiguration',
        params: {
            _config: {
                everscaleConfiguration: everscaleEventConfiguration.address,
                ethereumConfigurations: [evmEventConfiguration.address],
                base_chainId: 0,
                base_nft: 0,
                alienCollectionCode: AlienCollection.code,
                alienNftCode: AlienNft.code
            },
            remainingGasTo: owner.address
        },
        keyPair: owner.keyPair,
        value: locklift.utils.convertCrystal(0.5, 'nano')
    });

    return [evmEventConfiguration, everscaleEventConfiguration, proxy, initializer];
}