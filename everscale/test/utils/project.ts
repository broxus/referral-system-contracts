import { Account, Address, Contract, deployAccount, locklift, logContract } from "./locklift";
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
    refSystem: Address,
    refAuthority: Address,
    projectFee: number,
    cashbackFee: number,
    feeDigits: number): Promise<Contract> {

    const _randomNonce = locklift.utils.getRandomNonce();
    const [keyPair] = await locklift.keys.getKeyPairs();

    // Deploy initializer account
    const initializer = await deployAccount(keyPair, 20)
    initializer.setKeyPair(keyPair);
    initializer.afterRun = afterRun;
    initializer.name = 'Event initializer';

    const Project = await locklift.factory.getContract('Project');
    
    const project = await locklift.giver.deployContract({
        contract: Project,
        constructorParams: {
            refSystem,
            refAuthority,
            projectFee,
            cashbackFee,
            feeDigits
        },
        initParams: {
            _randomNonce
        },
        keyPair
    }, locklift.utils.convertCrystal(2, 'nano'));

    await logContract(project);

    return project;
}

