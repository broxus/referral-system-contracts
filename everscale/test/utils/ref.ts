import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import _ from 'underscore'

import { logContract, locklift, afterRun, KeyPair, Contract, Account, Address, Tx } from './locklift';

export async function deployRefSystem(approvalFee = 300, approvalFeeDigits = 1000): Promise<Contract> {
    const RefSystem = await locklift.factory.getContract('RefSystem');
    const RefInstance = await locklift.factory.getContract('RefInstance');
    const RefInstancePlatform = await locklift.factory.getContract('RefInstancePlatform');

    const [keyPair] = await locklift.keys.getKeyPairs();
    const _randomNonce = locklift.utils.getRandomNonce();

    const refSystem = await locklift.giver.deployContract({
        contract: RefSystem,
        constructorParams: {
            // proxy_: proxy.address,
            approvalFee,
            approvalFeeDigits,
            refPlatformCode: RefInstancePlatform.code,
            refCode: RefInstance.code
        },
        initParams: {
            _randomNonce
        },
        keyPair
    }, locklift.utils.convertCrystal(10, 'nano'))

    refSystem.setKeyPair(keyPair);
    refSystem.afterRun = afterRun;
    refSystem.name = 'RefSystem';
    await logContract(refSystem)
    
    return refSystem;
}

export function encodeAddress(factory: Contract, target: Address): Promise<string> {
    return factory.call({method: 'encodeAddress', params: { target }})
}

export function deployEmptyRef(account: Account, factory: Contract): Promise<Tx> {
    return account.runTarget({
        contract: factory,
        method: 'deployEmptyRef',
        params: {},
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(10, 'nano')
    })
}

export async function deriveRef(factory: Contract, recipient: Address): Promise<Contract> {
    const refInstance = await locklift.factory.getContract('RefInstance')
    const refAddr = await factory.call({ method: 'deriveRef', params: { recipient, answerId: 0 }})

    refInstance.setAddress(refAddr)
    refInstance.afterRun = afterRun
    refInstance.name = 'RefInstance'
    return refInstance
}

export function getRefParent(refInstance: Contract): Promise<Address> {
    return refInstance.call({method: 'parent', params: { answerId: 0}});
}