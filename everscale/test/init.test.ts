import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, runOnRefferral, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client";
// const { setupRelays, setupBridge } = require('./utils/bridge');

describe('Ref Init', function () {
    this.timeout(10000000);

    describe('RefFactory', function () {
        describe('constructor', function () {
            it('should deploy RefFactory', async function () {
                let refOwnerPair = await locklift.keystore.getSigner("0")
                let refFactoryOwner = await deployAccount(refOwnerPair!, 50, "RefFactoryOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                logContract(refFactory, "RefFactory")

                expect((await refFactory.methods.owner().call()).owner.equals(refFactoryOwner.address)).to.be.true
            })
        })
    })

    describe("RefSystemUpgradeable", function () {
        describe('constructor', function () {
            it('should deploy RefSystem', async () => {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("1")
                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let refFactory = await deployRefFactory(refFactoryOwner)
                logContract(refFactory, "refFactory")

                let refOwnerPair = await locklift.keystore.getSigner("1")
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300, 1000);
                logContract(refSystem, "refSystem")

                expect((await refSystem.methods._approvalFee().call())._approvalFee)
                    .to.be.bignumber.equal(300, 'Wrong Value');
            })

            it('should be upgradeable by owner', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("1")
                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let refFactory = await deployRefFactory(refFactoryOwner)
                logContract(refFactory, "refFactory")
    
                let refOwnerPair = await locklift.keystore.getSigner("1")
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");
    
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300, 1000);
                logContract(refSystem, "refSystem")
    
                const TestUpgrade = await locklift.factory.getContractArtifacts('TestUpgrade');
    
                await refFactory.methods.upgradeRefSystem({ owner: refSysOwner.address, newRefSystemCode: TestUpgrade.code, newParams: '', newVersion: 1, remainingGasTo: refSysOwner.address }).send({ from: refFactoryOwner.address, amount: toNano(4) })
    
                let testUpgrade = await locklift.factory.getDeployedContract("TestUpgrade", refSystem.address);
    
                expect((await testUpgrade.methods._isUpgraded().call())._isUpgraded).to.be.equal("true");
    
            })
            it('should have version', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("1")
                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let refFactory = await deployRefFactory(refFactoryOwner)
                logContract(refFactory, "refFactory")
    
                let refOwnerPair = await locklift.keystore.getSigner("1")
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");
    
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300, 1000);
                logContract(refSystem, "refSystem")
    
                expect((await refSystem.methods.version().call()).value0).to.be.equal('0');
            })
        })

        describe('deployProject', function () {
            let project: Contract<FactorySource["Project"]>;
            let refSystem: Contract<FactorySource["RefSystemUpgradeable"]>;
            let refSysOwner: Account;

            it('should deploy Project uninitialized', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300, 1000);
                logContract(refSystem, "RefSystem");

                project = await deployProject(projectOwner, refSystem, 5, 5, 100);
                logContract(project, "Project");

                let { owner } = await project.methods.owner().call()
                logger.log(owner, projectOwner.address);
                expect(owner.equals(projectOwner.address)).to.be.true
                expect((await (await project.methods._isApproved().call())._isApproved)).to.be.false;
            })

            it('should be approved by RefSystem', async function () {
                await approveProject(project, refSysOwner, refSystem)
                expect(((await project.methods._isApproved().call())._isApproved)).to.be.true;
            })
        })

        describe('_deployRefAccount', function() {
            it('should deploy RefAccount')
        })

        describe('_deployRefInstance', function() {
            it('should deploy RefInstance')
        })

    })

    describe('Project', function () {
        describe('constructor', function () {
            let project: Contract<FactorySource["Project"]>;
            let refSystem: Contract<FactorySource["RefSystemUpgradeable"]>;
            let refSysOwner: Account;
    
            it('should have version')
    
            it('should be upgraded by RefFactory', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")
    
                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");
    
                let refFactory = await deployRefFactory(refFactoryOwner)
                refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300, 1000);
                logContract(refSystem, "RefSystem");
    
                project = await deployProject(projectOwner, refSystem, 5, 5, 100);
                logContract(project, "Project");
    
                const TestUpgrade = await locklift.factory.getContractArtifacts('TestUpgrade');
    
                refFactory.methods.upgradeTarget({ target: project.address, targetCode: TestUpgrade.code, params: '', newVersion: '2', remainingGasTo: refFactoryOwner.address}).send({from: refFactoryOwner.address, amount: toNano(4)});
    
                let testUpgrade = new Contract(locklift.provider, TestUpgrade.abi, project.address)
    
                let res = (await testUpgrade.methods._isUpgraded().call())._isUpgraded;
                logger.log(res);
                expect(res).to.be.equal("true");
            })
            it('should be initialized by RefSystem')
        })
    })
})