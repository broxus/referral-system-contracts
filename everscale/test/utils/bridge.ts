import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import _ from 'underscore'

import { logContract, locklift, afterRun, KeyPair, Contract, Account } from './locklift';

export async function setupBridge(relays: KeyPair[]): Promise<[Contract, Account, Contract, Contract]> {
    const Account = await locklift.factory.getAccount('Wallet');
    const [keyPair] = await locklift.keys.getKeyPairs();

    const _randomNonce = locklift.utils.getRandomNonce();

    const owner = await locklift.giver.deployContract({
        contract: Account,
        constructorParams: {},
        initParams: {
            _randomNonce,
        },
        keyPair,
    }, locklift.utils.convertCrystal(1000, 'nano'));

    owner.setKeyPair(keyPair);
    owner.afterRun = afterRun;
    owner.name = 'Bridge owner';

    await logContract(owner);

    const StakingMockup = await locklift.factory.getContract('StakingMockup');

    const staking = await locklift.giver.deployContract({
        contract: StakingMockup,
        constructorParams: {},
        initParams: {
            _randomNonce,
            __keys: relays.map(r => `0x${r.public}`),
        },
        keyPair,
    }, locklift.utils.convertCrystal(1, 'nano'));

    await logContract(staking);

    const Bridge = await locklift.factory.getContract('Bridge');
    const Connector = await locklift.factory.getContract('Connector');

    const bridge = await locklift.giver.deployContract({
        contract: Bridge,
        constructorParams: {
            _owner: owner.address,
            _manager: owner.address,
            _staking: staking.address,
            _connectorCode: Connector.code,
            _connectorDeployValue: locklift.utils.convertCrystal(1, 'nano'),
        },
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce(),
        },
        keyPair
    }, locklift.utils.convertCrystal(1, 'nano'));


    await logContract(bridge);

    const CellEncoder = await locklift.factory.getContract('ProxyNftTransferCellEncoder');

    const cellEncoder = await locklift.giver.deployContract({
        contract: CellEncoder,
        keyPair,
        constructorParams: {},
        initParams: {
            _randomNonce: locklift.utils.getRandomNonce()
        },
    }, locklift.utils.convertCrystal(1, 'nano'));


    return [bridge, owner as Account, staking, cellEncoder];
};

export function setupRelays(amount = 20): Promise<KeyPair[]> {
    return Promise.all(_
        .range(amount)
        .map(async () => locklift.ton.client.crypto.generate_random_sign_keys())
    );
};

