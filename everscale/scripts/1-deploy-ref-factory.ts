import { toNano, zeroAddress } from "locklift";

import process from "process"

async function main() {
  let amount = process.env["DEPLOY_VALUE"] || 0.5;
  const signer = (await locklift.keystore.getSigner("0"))!;
  console.log(`Deploying RefFactory using Signer: ${signer.publicKey} with ${amount} Ever`);
  
  const RefFactory = await locklift.factory.getContractArtifacts('RefFactory')
  const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');
  const RefSystemPlatform = await locklift.factory.getContractArtifacts('RefSystemPlatform');

  const _randomNonce = locklift.utils.getRandomNonce();

  const { contract: refFactory } = await locklift.factory.deployContract({
    contract: "RefFactory",
    constructorParams: {
      owner: zeroAddress,
      refSystemPlatformCode: RefSystemPlatform.code
    },
    initParams: {
      _randomNonce
    },
    publicKey: signer!.publicKey,
    value: locklift.utils.toNano(amount)
  })

  console.log(`RefFactory deployed at: ${refFactory.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
