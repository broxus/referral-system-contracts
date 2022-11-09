import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import _ from 'underscore'

import { logContract, locklift, afterRun, KeyPair, Contract, Account, Address, Tx } from './locklift';

export async function deployRefFactory(proxy: Contract): Promise<Contract> {
    const RefFactory = await locklift.factory.getContract('RefFactory');
    const RefInstance = await locklift.factory.getContract('RefInstance');
    const [keyPair] = await locklift.keys.getKeyPairs();
    const _randomNonce = locklift.utils.getRandomNonce();

    const refFactory = await locklift.giver.deployContract({
        contract: RefFactory,
        constructorParams: {
            proxy_: proxy.address,
            refCode_: RefInstance.code
        },
        initParams: {
            _randomNonce
        },
        keyPair
    }, locklift.utils.convertCrystal(10, 'nano'))

    refFactory.setKeyPair(keyPair);
    refFactory.afterRun = afterRun;
    refFactory.name = 'RefFactory';

    return refFactory;
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