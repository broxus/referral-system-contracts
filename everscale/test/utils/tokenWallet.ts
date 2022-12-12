import BigNumber from "bignumber.js";
import { Account } from "everscale-standalone-client";
import { Contract } from "locklift";
import { FactorySource } from "../../build/factorySource";

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

export async function walletOf(tokenRoot: TokenRoot, account: Account){
  let { value0: addr} = await tokenRoot.methods.walletOf({walletOwner: account.address, answerId: 0}).call()
  return locklift.factory.getDeployedContract("TokenWallet", addr);
}

export function getBalance(wallet: Contract): Promise<BigNumber> {
  return wallet.call({
    method: 'balance',
    params: { answerId: 0 }
  })
}
