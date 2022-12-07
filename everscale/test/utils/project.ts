import { Account, Address, Contract, deployAccount, locklift, logContract, Tx } from "./locklift";
import BigNumber from "bignumber.js"
import _ from "underscore"
import logger from "mocha-logger"

const chai = require('chai')
chai.use(require('chai-bignumber')())

const { expect } = chai;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Due to the network lag, graphql may not catch wallets updates instantly
async function afterRun(tx) {
    if (locklift.network === 'dev' || locklift.network === 'prod') {
        await sleep(100000);
    }
};

export async function deployProject(
    projectOwner: Account,
    refSystem: Contract,
    projectFee: number,
    cashbackFee: number,
    feeDigits: number): Promise<Contract> {
    
    const Project = await locklift.factory.getContract('Project');
    const ProjectPlatform = await locklift.factory.getContract('ProjectPlatform');
    
    await projectOwner.runTarget({
        contract: refSystem,
        method: "deployProject",
        params: {
            initCode: Project.code,
            initVersion: 0,
            refSystem: refSystem.address,
            projectFee,
            cashbackFee,
            feeDigits,
            sender: projectOwner.address,
            remainingGasTo: projectOwner.address
        },
        keyPair: projectOwner.keyPair,
        value: locklift.utils.convertCrystal(2, 'nano')
    });

    let projectAddr = await refSystem.call({ method: 'deriveProject', params: { owner: projectOwner.address, answerId: 0 } })

    let project = ProjectPlatform;
    project.setAddress(projectAddr)
    project.setKeyPair(projectOwner.keyPair)

    await logContract(project);

    return project;
}

export async function approveProject(platform: Contract, refSystemOwner: Account, refSystem: Contract): Promise<Contract> {
    let projectOwner: Address = await platform.call({method: "getOwner", params: { answerId: 0}})
    const Project = await locklift.factory.getContract('Project');
    
    await refSystemOwner.runTarget({
        contract: refSystem,
        method: 'approveProject',
        params: {
            projectOwner
        },
        keyPair: refSystemOwner.keyPair,
        value: locklift.utils.convertCrystal(0.1, 'nano')
    });
    
    let project = Project;
    project.setAddress(platform.address)

    await logContract(project)

    return project
}

export function runOnRefferral(account: Account, project: Contract, referrer: Address, referred: Address, reward: number): Promise<Tx> {
    return account.runTarget({
        contract: project,
        method: 'onRefferal',
        params: {
            referrer,
            referred,
            reward: locklift.utils.convertCrystal(reward, 'nano')
        },
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(reward + 0.01, 'nano')
    });
}

