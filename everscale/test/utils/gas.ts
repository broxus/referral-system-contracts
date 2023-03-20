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
    logContract(util, "GasUtil")

    return util
}

export let utilSingleton: GasUtil | null = null;

export async function gasToValue(util: GasUtil, account: Account, gas: number): Promise<number> {
    let tx = await util.methods.GetGasToValue({gas}).sendWithResult({ from: account.address, amount: toNano(2) })
    console.log(tx)
    return parseInt(tx.output?.value!)
}
export async function valueToGas(util: GasUtil, account: Account, value: string | number): Promise<number> {
    let tx = await util.methods.GetValueToGas({value}).send({ from: account.address, amount: toNano(0.05)})
    console.log(tx)
    return parseInt(tx.outMessages[0].value)
}