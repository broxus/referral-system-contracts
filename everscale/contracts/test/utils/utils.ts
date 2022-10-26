import BigNumber from "bignumber.js";
import { Contract, Signer, Address, Dimension, CheckAddress, zeroAddress } from "locklift"
import { FactorySource } from "../../../build/factorySource";
const logger = require('mocha-logger');
const chai = require('chai')


chai.use(require('chai-bignumber')());
export const isValidTonAddress = (address: string): Boolean => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);
export type Account = Contract<FactorySource["Wallet"]>

export const getRandomNonce = () => Math.random() * 64000 | 0;
export const toAddrs = (i: number): Address => {
  let zeroAddrs = zeroAddress.toString()
  let si = i.toString();
  return new Address(zeroAddrs.substr(0, zeroAddrs.length - si.length).concat(si))
}

export async function logContract(contract: Contract<any>) {
  const balance = await locklift.provider.getBalance(contract.address);
  logger.log(`${contract} (${contract.address}) - ${locklift.utils.convertAmount(balance, Dimension.FromNano)}`);
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function afterRun() {
  const network = locklift.context.network.name;
  if (network === 'dev' || network === 'prod') {
    await sleep(100000);
  }
};

export async function getAccount(signer: Signer, address: Address): Promise<Account> {
  const account = await locklift.factory.getDeployedContract("Wallet", address);
  return account;
}

export async function deployAccount(signer: Signer, balance: number): Promise<Account> {
  const { contract } = await locklift.factory.deployContract({
    contract: "Wallet",
    publicKey: signer.publicKey,
    constructorParams: {},
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce()
    },
    value: locklift.utils.toNano(balance)
  });

  return contract
}
