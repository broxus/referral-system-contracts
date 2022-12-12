import BigNumber from "bignumber.js";
import { Account } from "everscale-standalone-client";
import { Address, Contract } from "locklift";
import { FactorySource } from "../../build/factorySource";
import logger from "mocha-logger"
import { logContract } from "./locklift";

type TokenRoot = Contract<FactorySource["TokenRoot"]>;
type TokenWallet = Contract<FactorySource["TokenWallet"]>;

export async function walletOf(tokenRoot: TokenRoot, owner: Address, name?: string){
  let { value0: addr} = await tokenRoot.methods.walletOf({walletOwner: owner, answerId: 0}).call()
  let contract = locklift.factory.getDeployedContract("TokenWallet", addr);;
  if (name) logContract(contract, name)
  return contract
}
