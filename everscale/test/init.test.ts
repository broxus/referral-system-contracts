import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, runOnRefferral, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Contract, toNano, zeroAddress } from "locklift";
import { Account } from "everscale-standalone-client";
// const { setupRelays, setupBridge } = require('./utils/bridge');

if (locklift.context.network.name === "main") throw "NOT IN TEST MODE"

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

                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "refSystem")

                expect((await refSystem.methods._systemFee().call())._systemFee)
                    .to.be.bignumber.equal(300, 'Wrong Value');
            })

            it('should be upgradeable by owner', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("1")
                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let refFactory = await deployRefFactory(refFactoryOwner)
                logContract(refFactory, "refFactory")

                let refOwnerPair = await locklift.keystore.getSigner("1")
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "refSystem")

                const TestUpgrade = await locklift.factory.getContractArtifacts('TestUpgrade');

                await refFactory.methods.upgradeRefSystem({ refSysOwner: refSysOwner.address, code: TestUpgrade.code }).send({ from: refFactoryOwner.address, amount: toNano(4) })

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

                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "refSystem")

                expect((await refSystem.methods.version({ answerId: 0 }).call()).value0).to.be.equal('0');
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
                refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");

                project = await deployProject(projectOwner, refSystem, 5, 5);
                logContract(project, "Project");
                
                let { owner } = await project.methods.owner().call()
                logger.log(owner, projectOwner.address);
                
                let {_id: projectId } = await project.methods._id().call()
                expect(projectId).to.be.bignumber.equal(0);
                expect(owner.equals(projectOwner.address)).to.be.true
                expect((await (await project.methods._isApproved().call())._isApproved)).to.be.false;
            })

            it('should be approved by RefSystem', async function () {
                await approveProject(project, refSysOwner, refSystem)
                expect(((await project.methods._isApproved().call())._isApproved)).to.be.true;
            })
        })

        describe('requestUpgradeProject', function () {
            it('should upgrade project', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "refSystem")
                let project = await deployProject(projectOwner, refSystem, 5, 5);

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")

                /// Set New Project Code
                await refSystem.methods.setProjectCode({ code: TestUpgrade.code }).send({ from: refSysOwner.address, amount: toNano(5) })
                await refSystem.methods.requestUpgradeProject({
                    currentVersion: 99,
                    projectId: (await project.methods._id().call())._id,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(5) })
                logContract(project, "Project")
                let newProject = locklift.factory.getDeployedContract("TestUpgrade", project.address)
                let { _isUpgraded } = await newProject.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")
            })
        })

        describe('requestUpgradeAccount', function () {
            it('should upgrade account', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);

                let project = await deployProject(projectOwner, refSystem, 5, 5);

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")

                await refSystem.methods.deployRefAccount({
                    recipient: refSysOwner.address,
                    tokenWallet: zeroAddress,
                    reward: 0,
                    sender: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })
                let {value0: refSysAccountAddr} = await refSystem.methods.deriveRefAccount({answerId: 0, owner: refSysOwner.address}).call()

                
                /// Set New Account Code
                await refSystem.methods.setAccountCode({
                    code: TestUpgrade.code 
                }).send({ from: refSysOwner.address, amount: toNano(5) })

                // Run Upgrade Request
                await refSystem.methods.requestUpgradeAccount({
                    currentVersion: 99,
                    accountOwner: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let newAccount = locklift.factory.getDeployedContract("TestUpgrade", refSysAccountAddr)
                logContract(newAccount, "refAccount")

                let { _isUpgraded } = await newAccount.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")

            })
        })

        describe('requestUpgradeRefLast', function () {
            it('should upgrade refLast', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);

                let project = await deployProject(projectOwner, refSystem, 5, 5);

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")

                await refSystem.methods.deployRefLast({
                    owner: refSysOwner.address,
                    lastRefWallet: zeroAddress,
                    lastReferred: zeroAddress,
                    lastReferrer: zeroAddress,
                    lastRefReward: 0,
                    sender: zeroAddress,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let {value0: refLastAddr} = await refSystem.methods.deriveRefLast({answerId: 0, owner: refSysOwner.address}).call()
                let refLast = locklift.factory.getDeployedContract("RefLast", refLastAddr)

                /// Set New RefLast Code
                await refSystem.methods.setRefLastCode({
                    code: TestUpgrade.code 
                }).send({ from: refSysOwner.address, amount: toNano(5) })

                // Run Upgrade Request
                await refSystem.methods.requestUpgradeRefLast({
                    currentVersion: 99,
                    refLastOwner: refSysOwner.address,
                    remainingGasTo: refSysOwner.address,
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let newAccount = locklift.factory.getDeployedContract("TestUpgrade", refLast.address)
                logContract(refSystem, 'refSystem')
                logContract(newAccount, 'refLast')

                let { _isUpgraded } = await newAccount.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")

            })
        })

        describe('_deployRefAccount', function () {
            it('should deploy RefAccount', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                
                await refSystem.methods.deployRefAccount({
                    recipient: refSysOwner.address,
                    tokenWallet: zeroAddress,
                    reward: 0,
                    sender: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let {value0: refSysAccountAddr} = await refSystem.methods.deriveRefAccount({answerId: 0, owner: refSysOwner.address}).call()
                let refSysAccount = locklift.factory.getDeployedContract("RefAccount", refSysAccountAddr)
                
                expect((await refSysAccount.methods._refSystem().call())._refSystem.equals(refSystem.address)).to.be.true
                expect((await refSysAccount.methods.owner().call()).owner.equals(refSysOwner.address)).to.be.true
            
            })  
        })

        describe('_deployRefLast', function () {
            it('should update/deploy RefLast if RefSystem Owner', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, 'refSystem')
                await refSystem.methods.deployRefLast({
                    owner: refSysOwner.address,
                    lastRefWallet: zeroAddress,
                    lastReferred: zeroAddress,
                    lastReferrer: zeroAddress,
                    lastRefReward: 0,
                    sender: zeroAddress,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let {value0: refLastAddr} = await refSystem.methods.deriveRefLast({answerId: 0, owner: refSysOwner.address}).call()
                let refLast = locklift.factory.getDeployedContract("RefLast", refLastAddr)
                logContract(refLast, 'refLast')
                expect((await refLast.methods._refSystem().call())._refSystem.equals(refSystem.address)).to.be.true
            })
        })

    })

    describe.skip('Project', function () {
        describe('constructor', function () {
            let project: Contract<FactorySource["Project"]>;
            let refSystem: Contract<FactorySource["RefSystemUpgradeable"]>;
            let refSysOwner: Account;

            it('should have version')

            it('should be upgraded by RefFactory', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");

                project = await deployProject(projectOwner, refSystem, 5, 5);
                logContract(project, "Project");

                const TestUpgrade = locklift.factory.getContractArtifacts('TestUpgrade');

                refFactory.methods.upgradeTarget({ target: project.address, code: TestUpgrade.code, version: 99, remainingGasTo: refFactoryOwner.address }).send({ from: refFactoryOwner.address, amount: toNano(4) });

                let testUpgrade = new Contract(locklift.provider, TestUpgrade.abi, project.address)

                let res = (await testUpgrade.methods._isUpgraded().call())._isUpgraded;
                logger.log(res);
                expect(res).to.be.equal("true");
            })
            it('should be initialized by RefSystem')
        })
    })
})