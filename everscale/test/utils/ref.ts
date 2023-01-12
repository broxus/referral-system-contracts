import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import { Address, Contract, toNano, WalletTypes } from 'locklift';
import { FactorySource, WalletAbi } from '../../build/factorySource';
import { Account } from 'everscale-standalone-client';

type RefFactory = Contract<FactorySource["RefFactory"]>

export async function deployRefFactory(owner: Account) {
    const RefFactory = await locklift.factory.getContractArtifacts('RefFactory')
    
    const RefSystem = await locklift.factory.getContractArtifacts('RefSystemUpgradeable');
    const RefSystemPlatform = await locklift.factory.getContractArtifacts('RefSystemPlatform');
    
    const RefLast = await locklift.factory.getContractArtifacts('RefLast');
    const RefLastPlatform = await locklift.factory.getContractArtifacts('RefLastPlatform');

    const RefAccount = await locklift.factory.getContractArtifacts("RefAccount")
    const RefAccountPlatform = await locklift.factory.getContractArtifacts("RefAccountPlatform")

    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');
    const Project = await locklift.factory.getContractArtifacts('Project');

    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = await locklift.keystore.getSigner("0")
    
    const { contract: refFactory } = await locklift.factory.deployContract({
        contract: "RefFactory",
        constructorParams: {
            owner: owner.address,
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
            _randomNonce
        },
        publicKey: signer!.publicKey,
        value: locklift.utils.toNano(3)
    })

    return refFactory;
}
export async function deployRefSystem(
    refFactoryOwner: Account,
    refFactory: RefFactory,
    owner: Account,
    systemFee: string | number,
    onDeploy: string | number = toNano(2),
    deployProjectValue: string | number = toNano(1),
    deployAccountValue: string | number = toNano(0.05),
    deployRefLastValue: string | number = toNano(0.1),
    projectVersion: number = 0,
    accountVersion: number = 0,
    refLastVersion: number = 0) {

    await refFactory.methods.deployRefSystemAuto({
        owner: owner.address,
        version: 0,
        deployAccountValue,
        deployRefLastValue,
        systemFee,
        sender: owner.address,
        remainingGasTo: owner.address,
    }).send({ from: refFactoryOwner.address, amount: toNano(3) })

    let { value0: refSysAddr } = await refFactory.methods.deriveRefSystem({ owner: owner.address }).call();
    return locklift.factory.getDeployedContract("RefSystemUpgradeable", refSysAddr)
}

export async function deriveRef(factory: Contract<FactorySource["RefSystem"]>, recipient: Address): Promise<Contract<FactorySource["RefLast"]>> {
    const RefLast = await locklift.factory.getContractArtifacts('RefLast');
    const { value0: refAddr } = await factory.methods.deriveRef({ recipient, answerId: 0 }).call();

    const refInstance = new Contract(locklift.provider, RefLast.abi, refAddr)
    return refInstance
}