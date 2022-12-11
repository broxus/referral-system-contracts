import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import { Address, Contract, toNano, WalletTypes } from 'locklift';
import { FactorySource, WalletAbi } from '../../build/factorySource';
import { Account } from 'everscale-standalone-client';

type RefFactory = Contract<FactorySource["RefFactory"]>

export async function deployRefFactory(owner:Account) {
    const RefFactory = await locklift.factory.getContractArtifacts('RefFactory')
    const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');
    const RefSystemPlatform = await locklift.factory.getContractArtifacts('RefSystemPlatform');

    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = await locklift.keystore.getSigner("0")
    const { contract: refFactory } = await locklift.factory.deployContract({
        contract: "RefFactory",
        constructorParams: {
            owner: owner.address,
            refSystemPlatformCode: RefSystemPlatform.code
        },
        initParams: {
            _randomNonce
        },
        publicKey: signer!.publicKey,
        value: locklift.utils.toNano(3)
    })

    return refFactory;
}
export async function deployRefSystem(refFactoryOwner: Account, refFactory: RefFactory, owner: Account, approvalFee = 300, approvalFeeDigits = 1000) {
    
    const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');
    
    const RefInstance = await locklift.factory.getContractArtifacts('RefInstance');
    const RefInstancePlatform = await locklift.factory.getContractArtifacts('RefInstancePlatform');
    
    const RefAccount = await locklift.factory.getContractArtifacts("RefAccount")
    const RefAccountPlatform = await locklift.factory.getContractArtifacts("RefAccountPlatform")
    
    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');
    const Project = await locklift.factory.getContractArtifacts('Project');

    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = await locklift.keystore.getSigner("0")

    await refFactory.methods.deployRefSystem({
        owner: owner.address,
        refSystemCode: RefSystem.code,
        approvalFee,
        approvalFeeDigits,
        refPlatformCode: RefInstancePlatform.code,
        refCode: RefInstance.code,
        accountPlatformCode: RefAccountPlatform.code,
        accountCode: RefAccount.code,
        projectCode: Project.code,
        projectPlatformCode: ProjectPlatform.code,
        sender: owner.address,
        remainingGasTo: owner.address,
    }).send({ from : refFactoryOwner.address, amount: toNano(3)})
    
    let {value0: refSysAddr } = await refFactory.methods.deriveRefSystem({owner: owner.address}).call();
    return locklift.factory.getDeployedContract("RefSystemUpgradeable", refSysAddr)
}

export async function deriveRef(factory: Contract<FactorySource["RefSystem"]>, recipient: Address): Promise<Contract<FactorySource["RefInstance"]>> {
    const RefInstance = await locklift.factory.getContractArtifacts('RefInstance');
    const {value0: refAddr} = await factory.methods.deriveRef({ recipient, answerId: 0 }).call();

    const refInstance = new Contract(locklift.provider,RefInstance.abi, refAddr )
    return refInstance
}