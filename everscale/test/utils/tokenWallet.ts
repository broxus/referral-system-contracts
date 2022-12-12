import BigNumber from "bignumber.js";
import { Account } from "everscale-standalone-client";
import { Address, Contract } from "locklift";
import { FactorySource } from "../../build/factorySource";
import logger from "mocha-logger"
import { logContract } from "./locklift";

type TokenRoot = Contract<FactorySource["TokenRoot"]>;
type TokenWallet = Contract<FactorySource["TokenWallet"]>;

// export async function deploy(account: Account, tokenRoot: TokenRoot): Promise<TokenWallet> {

//   let walletAddr = await tokenRoot.call({
//     method: 'walletOf',
//     params: {
//       walletOwner: account.address,
//       answerId: 0
//     }
//   });

//   await account.runTarget({
//     contract: tokenRoot,
//     method: 'deployWallet',
//     params: {
//       walletOwner: account.address,
//       deployWalletValue: locklift.utils.convertCrystal(0.1, 'nano'),
//       answerId: 0
//     },
//     keyPair: account.keyPair,
//     value: locklift.utils.convertCrystal(0.5, 'nano')
//   });

//   const TokenWallet = await locklift.factory.getContract("TokenWallet");
//   TokenWallet.setAddress(walletAddr);

//   return TokenWallet;
// }

// export function transfer(account: Account, wallet: Contract, amount: number, recipient: Address, payload = ''): Promise<Tx> {
//   return account.runTarget({
//     contract: wallet,
//     method: 'transfer',
//     params: {
//       amount,
//       recipient,
//       remainingGasTo: account.address,
//       notify: true,
//       deployWalletValue: 0,
//       payload,
//     },
//     keyPair: account.keyPair,
//     value: locklift.utils.convertCrystal(2, 'nano')
//   })
// }

export async function walletOf(tokenRoot: TokenRoot, owner: Address, name?: string){
  let { value0: addr} = await tokenRoot.methods.walletOf({walletOwner: owner, answerId: 0}).call()
  let contract = locklift.factory.getDeployedContract("TokenWallet", addr);;
  if (name) logContract(contract, name)
  return contract
}
