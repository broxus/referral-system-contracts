import BigNumber from "bignumber.js";
import { Account, Signer } from "everscale-standalone-client";
import { Address, Contract, WalletTypes, toNano, zeroAddress } from "locklift";
const logger = require('mocha-logger');
const chai = require('chai')

chai.use(require('chai-bignumber')());

export const getRandomNonce = () => Math.random() * 64000 | 0;
export const toAddrs = (i: number): Address => {
  let zeroAddrs = zeroAddress
  let si = i.toString();
  return zeroAddrs.substr(0, zeroAddrs.length - si.length).concat(si) as Address
}

export async function logContract(contract: Contract<any> | Account, name: string) {
  const balance = await locklift.provider.getBalance(contract.address);
  logger.log(`${name} (${contract.address}) - ${locklift.utils.fromNano(balance)}`);
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function afterRun() {
  if (locklift.context.network.name === 'dev' || locklift.context.network.name === 'prod') {
    await sleep(100000);
  }
};

export async function getAccount(signer: Signer, address: Address) {
  return locklift.factory.accounts.addExistingAccount({
    address,
    type: WalletTypes.EverWallet,
  });
}

export async function deployAccount(signer: Signer, balance: number = 20, name?: string) {
  const {account} = await locklift.factory.accounts.addNewAccount({
    type: WalletTypes.EverWallet, // or WalletTypes.HighLoadWallet or WalletTypes.WalletV3,
    //Value which will send to the new account from a giver
    value: toNano(balance),
    //owner publicKey
    publicKey: signer.publicKey,
    nonce: getRandomNonce(),
  });

  if(name) {
    // console.log(account.address, "Account")
    logContract(account, name);
  }

  return account;
}
