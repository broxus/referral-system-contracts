import BigNumber from "bignumber.js"
import { FactorySource } from "../../build/factorySource";

import { Address, Contract, Signer } from "locklift";
import mlog from "mocha-logger"
import { Account } from "everscale-standalone-client";

const chai = require('chai')
chai.use(require('chai-bignumber')())

const { expect } = chai;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deployProject(
    projectOwner: Account,
    refSystem: Contract<FactorySource["RefSystem"]>,
    projectFee: number,
    cashbackFee: number,
    feeDigits: number): Promise<Contract<FactorySource["Project"]>> {
    
    const Project = await locklift.factory.getContractArtifacts("Project");
    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');

    await refSystem.methods.deployProject({
        initCode: Project.code,
        initVersion: 0,
        refSystem: refSystem.address,
        projectFee,
        cashbackFee,
        feeDigits,
        sender: projectOwner.address,
        remainingGasTo: projectOwner.address
    }).send({ from: projectOwner.address, amount: locklift.utils.toNano(3) })

    let { value0: projectAddr } = await refSystem.methods.deriveProject({owner: projectOwner.address, answerId: 0}).call();
    // let projectAddr = await refSystem.call({ method: 'deriveProject', params: { owner: projectOwner.address, answerId: 0 } })

    let project = new Contract(locklift.provider, Project.abi, projectAddr);

    return project;
}

export async function approveProject(platform: Contract<FactorySource["Project"]>, refSystemOwner: Account, refSystem: Contract<FactorySource["RefSystem"]>) {
    const Project = await locklift.factory.getContractArtifacts("Project");
    let {_owner: projectOwner } = await platform.methods._owner().call()
    
    return refSystem.methods.approveProject({
        projectOwner
    }).send({ from: refSystemOwner.address, amount: locklift.utils.toNano(0.1) })
}

export function runOnRefferral(account: Account, project: Contract<FactorySource["Project"]>, referrer: Address, referred: Address, reward: number) {
    return project.methods.onRefferal({
        referrer,
        referred,
        reward: locklift.utils.toNano(reward)
    }).send({ from: account.address, amount: locklift.utils.toNano(reward + 0.01)})

    // return account.runTarget({
    //     contract: project,
    //     method: 'onRefferal',
    //     params: {
    //         referrer,
    //         referred,
    //         reward: locklift.utils.convertCrystal(reward, 'nano')
    //     },
    //     keyPair: account.keyPair,
    //     value: locklift.utils.convertCrystal(reward + 0.01, 'nano')
    // });
}

