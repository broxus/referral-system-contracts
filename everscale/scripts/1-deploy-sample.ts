import { zeroAddress } from "locklift";

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
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
    value: locklift.utils.toNano(3)
  })

  console.log(`RefFactory deployed at: ${refFactory.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
