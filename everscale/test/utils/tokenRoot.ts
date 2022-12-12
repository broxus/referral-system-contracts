import BigNumber from "bignumber.js";
import { Account } from "everscale-standalone-client";
import { Address, Contract, getRandomNonce, toNano } from "locklift";
import { FactorySource } from "../../build/factorySource";

export async function deployTokenRoot(account: Account, config: { name: string; symbol: string; decimals: string; initialSupply?: string; deployWalletValue?: string; }) {
  let { name, symbol, decimals, initialSupply, deployWalletValue } = config;
  decimals = decimals || '4';
  initialSupply = initialSupply || new BigNumber(10000000).shiftedBy(2).toFixed();

  // deployWalletValue = deployWalletValue || locklift.utils.convertCrystal('1', 'nano')
  deployWalletValue = toNano(0.1)

  const TokenWallet = await locklift.factory.getContractArtifacts("TokenWallet");
  const signer = await locklift.keystore.getSigner("0")

  let { contract } = await locklift.factory.deployContract({
    contract: "TokenRoot",
    constructorParams: {
      initialSupplyTo: account.address,
      initialSupply,
      deployWalletValue,
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: account.address
    },
    initParams: {
      deployer_: account.address,
      randomNonce_: getRandomNonce(),
      rootOwner_: account.address,
      name_: name,
      symbol_: symbol,
      decimals_: decimals,
      walletCode_: TokenWallet.code
    },
    publicKey: signer!.publicKey,
    value: toNano(3)
  });

  return contract;

}

export async function mint(account: Account, tokenRoot: Contract<FactorySource["TokenRoot"]>, amount: number | string, recipient: Address) {
  return tokenRoot.methods.mint({
    amount,
    recipient,
    deployWalletValue: 0,
    remainingGasTo: account.address,
    notify: false,
    payload: ''
  }).send({from: account.address, amount: toNano(0.4)})
}
