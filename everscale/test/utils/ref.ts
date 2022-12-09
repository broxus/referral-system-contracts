import logger from 'mocha-logger'
import BigNumber from 'bignumber.js'
import { Address, Contract, toNano, WalletTypes } from 'locklift';
import { FactorySource, WalletAbi } from '../../build/factorySource';
import { Account } from 'everscale-standalone-client';

type RefFactory = Contract<FactorySource["RefFactory"]>

export async function deployRefFactory(owner:Account) {
    const RefFactory = await locklift.factory.getContractArtifacts('RefFactory')
    const RefSystem = await locklift.factory.getContractArtifacts('RefSystem');
    const RefSystemPlatform = await locklift.factory.getContractArtifacts('RefSystemPlatform');

    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = await locklift.keystore.getSigner("0")
    const { contract: refFactory } = await locklift.factory.deployContract({
        contract: "RefFactory",
        constructorParams: {
            owner: owner.address,
            refSystemCode: RefSystem.code,
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
    
    const RefSystem = await locklift.factory.getContractArtifacts('RefSystem');
    const RefInstance = await locklift.factory.getContractArtifacts('RefInstance');
    const RefInstancePlatform = await locklift.factory.getContractArtifacts('RefInstancePlatform');
    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');
    const Project = await locklift.factory.getContractArtifacts('Project');

    const _randomNonce = locklift.utils.getRandomNonce();
    const signer = await locklift.keystore.getSigner("0")

    let {output} = await refFactory.methods.deployRefSystem({
        owner: owner.address,
        approvalFee,
        approvalFeeDigits,
        refPlatformCode: RefInstancePlatform.code,
        refCode: RefInstance.code,
        projectCode: Project.code,
        projectPlatformCode: ProjectPlatform.code,
        sender: owner.address,
        remainingGasTo: owner.address,
    }).sendWithResult({ from : owner.address, amount: toNano(3)})
    
    return locklift.factory.getDeployedContract("RefSystem", output?.value0!)
}

// export function encodeAddress(factory: Contract, target: Address): Promise<string> {
//     return factory.call({method: 'encodeAddress', params: { target }})
// }

// export function deployEmptyRef(account: Account, factory: Contract): Promise<Tx> {
//     return account.runTarget({
//         contract: factory,
//         method: 'deployEmptyRef',
//         params: {},
//         keyPair: account.keyPair,
//         value: locklift.utils.convertCrystal(10, 'nano')
//     })
// }

export async function deriveRef(factory: Contract<FactorySource["RefSystem"]>, recipient: Address): Promise<Contract<FactorySource["RefInstance"]>> {
    const RefInstance = await locklift.factory.getContractArtifacts('RefInstance');
    const {value0: refAddr} = await factory.methods.deriveRef({ recipient, answerId: 0 }).call();

    const refInstance = new Contract(locklift.provider,RefInstance.abi, refAddr )
    return refInstance
}