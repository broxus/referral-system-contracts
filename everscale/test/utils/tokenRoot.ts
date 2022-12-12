import BigNumber from "bignumber.js";
import { Account } from "everscale-standalone-client";
import { Address, Contract, getRandomNonce, toNano, zeroAddress } from "locklift";
import { FactorySource } from "../../build/factorySource";
import logger from "mocha-logger"

type TokenFactory = Contract<FactorySource["TokenFactory"]>
export async function deployTokenFactory(account: Account) {
  const TokenRoot = locklift.factory.getContractArtifacts("TokenRoot");
  const TokenRootPlatform = locklift.factory.getContractArtifacts("");
  const TokenRootUpgradeable = locklift.factory.getContractArtifacts("TokenRootUpgradeable");
  
  const TokenWallet = locklift.factory.getContractArtifacts("TokenWallet");
  const TokenWalletPlatform = locklift.factory.getContractArtifacts("TokenWalletPlatform");
  const TokenWalletUpgradeable = locklift.factory.getContractArtifacts("TokenWalletUpgradeable");
  const signer = await locklift.keystore.getSigner("0")

  let { contract } = await locklift.factory.deployContract({
    contract: "TokenFactory",
    constructorParams: {
      owner: account.address,
      deployValue: 0,
      rootCode: TokenRoot.code,
      walletCode: TokenWallet.code,
      rootUpgradeableCode: TokenRootUpgradeable.code,
      walletUpgradeableCode: TokenWalletUpgradeable.code,
      platformCode: ''
    },
    initParams: {
      _randomNonce: getRandomNonce()
    },
    publicKey: signer!.publicKey,
    value: toNano(1)
  });

  return contract;
}

export async function deployTokenRoot(
  account: Account,
  config: { 
    name: string;
    symbol: string; 
    decimals: string;
    initialSupply?: number | string;
    initialSupplyTo?: Address;
    deployWalletValue?: number |string;
    value?: number | string;
  }) {
  const TokenWallet = locklift.factory.getContractArtifacts("TokenWallet");

  let { name, symbol, decimals, initialSupply, initialSupplyTo, deployWalletValue, value } = config;
  decimals = decimals || '4';
  initialSupply = initialSupply || 0;
  initialSupplyTo = initialSupplyTo || account.address;
  value = value || toNano(2)

  deployWalletValue = deployWalletValue || toNano(0.2)
  const signer = await locklift.keystore.getSigner("0")
  let {contract} = await locklift.factory.deployContract({
    contract: "TokenRoot",
    constructorParams: {
      initialSupplyTo: zeroAddress,
      initialSupply: 0,
      deployWalletValue: toNano(0.2),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: account.address
    },
    initParams: {
      name_: name,
      symbol_: symbol,
      decimals_: 9,
      rootOwner_: account.address,
      walletCode_: TokenWallet.code,
      randomNonce_: getRandomNonce(),
      deployer_: zeroAddress
    },
    publicKey: signer!.publicKey,
    value: toNano(4)
  })
  return contract;
}

export async function mint(account: Account, tokenRoot: Contract<FactorySource["TokenRoot"]>, amount: number | string, recipient: Address) {
  return tokenRoot.methods.mint({
    amount,
    recipient,
    deployWalletValue: toNano(1),
    remainingGasTo: account.address,
    notify: false,
    payload: ''
  }).send({ from: account.address, amount: toNano(10) })
}
