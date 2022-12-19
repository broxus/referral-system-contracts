import BigNumber from "bignumber.js"
import { FactorySource } from "../../build/factorySource";

import { Address, Contract, Signer } from "locklift";
import mlog from "mocha-logger"
import { Account } from "everscale-standalone-client";

const chai = require('chai')
chai.use(require('chai-bignumber')())

const { expect } = chai;

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deployProject(
    projectOwner: Account,
    refSystem: Contract<FactorySource["RefSystemUpgradeable"]>,
    projectFee: string | number,
    cashbackFee: string | number
): Promise<Contract<FactorySource["Project"]>> {

    const Project = await locklift.factory.getContractArtifacts("Project");
    const ProjectPlatform = await locklift.factory.getContractArtifacts('ProjectPlatform');

    let { _projectCounter } = await refSystem.methods._projectCounter().call()
    let { value0: projectAddr } = await refSystem.methods.deriveProject({ id: _projectCounter, answerId: 0 }).call();
    await refSystem.methods.deployProject({
        refSystem: refSystem.address,
        projectFee,
        cashbackFee,
        sender: projectOwner.address,
        remainingGasTo: projectOwner.address
    }).send({ from: projectOwner.address, amount: locklift.utils.toNano(5) })

    let project = new Contract(locklift.provider, Project.abi, projectAddr);

    return project;
}

export async function approveProject(project: Contract<FactorySource["Project"]>, refSystemOwner: Account, refSystem: Contract<FactorySource["RefSystemUpgradeable"]>) {
    let { _id } = await project.methods._id().call()

    return refSystem.methods.approveProject({
        projectId: _id
    }).send({ from: refSystemOwner.address, amount: locklift.utils.toNano(0.1) })
}

