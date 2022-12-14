import { Address, AddressLiteral, toNano, zeroAddress } from "locklift";

import process from "process"
import prompt from "prompt"

const schema = {
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
  console.log("Deploying RefFactory:")
  prompt.start()
  let {owner, value, randomNonce} = await prompt.get(schema)
  let ownerAddr = new Address(owner);
  const signer = (await locklift.keystore.getSigner("0"))!;
  console.log(`Deploying RefFactory using Signer: ${signer.publicKey} with ${value} Ever to owner: ${owner.toString()}`);
  let { confirm } = await prompt.get([{name: 'confirm', message: 'Confirm? (t(True)/f(False))', type: 'boolean'}])
  if (!confirm) return;

  const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');
    const RefSystemPlatform = await locklift.factory.getContractArtifacts('RefSystemPlatform');
    
    const RefLast = await locklift.factory.getContractArtifacts('RefLast');
    const RefLastPlatform = await locklift.factory.getContractArtifacts('RefLastPlatform');

    const RefAccount = await locklift.factory.getContractArtifacts("RefAccount")
    const RefAccountPlatform = await locklift.factory.getContractArtifacts("RefAccountPlatform")

    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');
    const Project = await locklift.factory.getContractArtifacts('Project');

    const { contract: refFactory } = await locklift.factory.deployContract({
      contract: "RefFactory",
      constructorParams: {
          owner: ownerAddr,
          refSystemPlatformCode: RefSystemPlatform.code,
          refSystemCode: RefSystem.code,
          refLastPlatformCode: RefLastPlatform.code,
          refLastCode: RefLast.code,
          accountPlatformCode: RefAccountPlatform.code,
          accountCode: RefAccount.code,
          projectCode: Project.code,
          projectPlatformCode: ProjectPlatform.code,
      },
      initParams: {
          _randomNonce: randomNonce
      },
      publicKey: signer!.publicKey,
      value: locklift.utils.toNano(value)
  })

  console.log(`RefFactory deployed at: ${refFactory.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
