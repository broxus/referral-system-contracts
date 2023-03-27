import { Address, AddressLiteral, toNano, zeroAddress } from "locklift";

import process from "process"
import prompt from "prompt"

const schema: prompt.Properties = {
  properties: {
    owner: {
      pattern: /^(?:-1|0):[0-9a-fA-F]{64}$/,
      message: 'Must Be Valid Ton Address',
      required: true
    },
    value: {
      type: 'number',
      message: 'Must be Number',
      required: true,
    },
    randomNonce: {
      type: 'number',
      default: locklift.utils.getRandomNonce()
    }
  }
};

async function main() {
  console.log("Deploying TokenFactory:")
  console.log(`Giver Address: ${locklift.giver}`)
  prompt.start()
  let {owner, value, randomNonce} = await prompt.get(schema)
  console.log(value + ' ' + toNano(value))
  let ownerAddr = new Address(owner);
  const signer = (await locklift.keystore.getSigner("0"))!;
  
  console.log(`Deploying TokenFactory using Signer: ${signer.publicKey} with ${value} Ever to owner: ${owner.toString()}`);
  let { confirm } = await prompt.get([{name: 'confirm', message: 'Confirm? (t(True)/f(False))', type: 'boolean'}])
  if (!confirm) return;

  const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');

    const code = (c: any) => locklift.factory.getContractArtifacts(c).code

    const { contract: refFactory } = await locklift.factory.deployContract({
      contract: "TokenFactory",
      constructorParams: {
          owner: ownerAddr,
          deployValue: toNano(0.4),
          platformCode: code("TokenWalletPlatform"),
          walletCode: code("TokenWallet"),
           rootCode: code("TokenRoot"),
          rootUpgradeableCode: code("TokenRootUpgradeable"),
          walletUpgradeableCode: code("TokenWalletUpgradeable")
      },
      initParams: {
          _randomNonce: randomNonce
      },
      publicKey: signer!.publicKey,
      value: locklift.utils.toNano(value)
  })

  console.log(`TokenFactory deployed at: ${refFactory.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
