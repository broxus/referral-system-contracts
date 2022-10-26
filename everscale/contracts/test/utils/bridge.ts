import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import _ from 'underscore'

import { logContract, afterRun, Account } from './utils';
import { Contract, Signer } from 'locklift';
import { FactorySource } from '../../../build/factorySource';


export type Bridge = Contract<FactorySource["Bridge"]>
export type StakingMockup = Contract<FactorySource["StakingMockup"]>
export type CellEncoderStandalone = Contract<FactorySource["CellEncoderStandalone"]>
export async function setupBridge(relays: Signer[]): Promise<[Bridge, Account, StakingMockup, CellEncoderStandalone]> {
    const ownerKey = await locklift.keystore.getSigner("0");

    const _randomNonce = locklift.utils.getRandomNonce();

    const owner = (await locklift.factory.deployContract({
        contract: 'Wallet',
        constructorParams: {},
        publicKey: ownerKey!.publicKey,
        initParams: {
            _randomNonce,
        },
        value: locklift.utils.toNano(1000)
    })).contract;
    
    
    // owner.contract.setKeyPair(keyPair);
    // owner.contract.afterRun = afterRun;
    // owner.contract.name = 'Bridge owner';

    await logContract(owner);

    const staking = (await locklift.factory.deployContract({
        contract: "StakingMockup",
        constructorParams: {},
        publicKey: ownerKey!.publicKey,
        initParams: {
            _randomNonce,
            __keys: relays.map(r => `0x${r.publicKey}`),
        },
        value: locklift.utils.toNano(1)
    })).contract;

    await logContract(staking);

    const Connector = await locklift.factory.getContractArtifacts('Connector');

    const bridge = (await locklift.factory.deployContract({
        contract: "Bridge",
        constructorParams: {
            _owner: owner.address,
            _manager: owner.address,
            _staking: staking.address,
            _connectorCode: Connector.code,
            _connectorDeployValue: locklift.utils.toNano(1),
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        publicKey: ownerKey!.publicKey,
        value: locklift.utils.toNano(1)
    })).contract;


    await logContract(bridge);

    const cellEncoder = (await locklift.factory.deployContract({
        contract: "CellEncoderStandalone",
        publicKey: ownerKey!.publicKey,
        constructorParams: {},
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce()
        },
        value: locklift.utils.toNano(1)
    })).contract;


    return [bridge, owner, staking, cellEncoder];
};

export function setupRelays(amount = 20): Promise<Signer[]> {
    return Promise.all(_
        .range(amount)
        .map(async (i:  number) => locklift.keystore.getSigner(i.toString()))
    );
};



