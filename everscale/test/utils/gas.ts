import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import { Address, Contract, toNano, WalletTypes } from 'locklift';
import { FactorySource, WalletAbi } from '../../build/factorySource';
import { Account } from 'everscale-standalone-client';
import { logContract } from './locklift';

type GasUtil = Contract<FactorySource["GasUtil"]>;

export async function deployGasUtil(nonce = locklift.utils.getRandomNonce()): Promise<GasUtil> {
    const signer = await locklift.keystore.getSigner("0")
    let {contract: util} = await  locklift.factory.deployContract({
        contract: 'GasUtil',
        constructorParams: {},
        initParams: { _randomNonce: nonce},
        publicKey: signer!.publicKey,
        value: locklift.utils.toNano(1)
    })

    return util
}

export let utilSingleton: GasUtil | null = null;

export async function gasToValue(account: Account, gas: string | number): Promise<string | undefined> {
    utilSingleton ??= await deployGasUtil()
    logContract(utilSingleton, "GasUtil")
    return utilSingleton.methods.GetGasToValue({gas}).sendWithResult({ from: account.address, amount: toNano(0.05) }).then(i => i.output?.value)
}
// export async function valueToGas(value: string | number): Promise<string> {
//     utilSingleton ??= await deployGasUtil()
//     return (await utilSingleton.methods.GetValueToGas({value}).call()).gas
// }