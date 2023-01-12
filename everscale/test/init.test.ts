import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, runOnRefferral, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Contract, fromNano, toNano, zeroAddress } from "locklift";
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
        describe('setManager', function() {
            it('should set Manager if owner', async function() {
                let refOwnerPair = await locklift.keystore.getSigner("0")
                let refManagerPair = await locklift.keystore.getSigner("0")

                let refFactoryOwner = await deployAccount(refOwnerPair!, 50, "RefFactoryOwner");
                let refFactoryManager = await deployAccount(refManagerPair!, 50, "RefFactoryManager");

                let refFactory = await deployRefFactory(refFactoryOwner)
                await refFactory.methods.setManager({newManager: refFactoryManager.address}).send({from: refFactoryOwner.address, amount: toNano(0.8)});
                let { _manager } = await refFactory.methods._manager().call();
                expect(_manager.equals(refFactoryManager.address)).to.be.true;

            })
        })

        describe('setState', function() {
            it('should update code state if owner', async function() {
                let refOwnerPair = await locklift.keystore.getSigner("0")
                let refManagerPair = await locklift.keystore.getSigner("0")

                let refFactoryOwner = await deployAccount(refOwnerPair!, 50, "RefFactoryOwner");
                let refFactory = await deployRefFactory(refFactoryOwner)

                await refFactory.methods.setCode({
                    refSystemPlatformCode: "",
                    refSystemCode: "",
                    refLastPlatformCode: "",
                    refLastCode: "",
                    accountPlatformCode: "",
                    accountCode: "",
                    projectPlatformCode: "",
                    projectCode: "",
                }).send({ from: refFactoryOwner.address, amount: toNano(0.8)})

                let {_refSystemPlatformCode} = await refFactory.methods._refSystemPlatformCode().call();
                let {_refSystemCode} = await refFactory.methods._refSystemCode().call();
                let {_refLastPlatformCode} = await refFactory.methods._refLastPlatformCode().call();
                let {_refLastCode} = await refFactory.methods._refLastCode().call();
                let {_accountPlatformCode} = await refFactory.methods._accountPlatformCode().call();
                let {_accountCode} = await refFactory.methods._accountCode().call();
                let {_projectPlatformCode} = await refFactory.methods._projectPlatformCode().call();
                let {_projectCode} = await refFactory.methods._projectCode().call();

                const EMPTY_CELL = "te6ccgEBAQEAAgAAAA=="
                expect(_refSystemPlatformCode).to.equal(EMPTY_CELL)
                expect(_refSystemCode).to.equal(EMPTY_CELL)
                expect(_refLastPlatformCode).to.equal(EMPTY_CELL)
                expect(_refLastCode).to.equal(EMPTY_CELL)
                expect(_accountPlatformCode).to.equal(EMPTY_CELL)
                expect(_accountCode).to.equal(EMPTY_CELL)
                expect(_projectPlatformCode).to.equal(EMPTY_CELL)
                expect(_projectCode).to.equal(EMPTY_CELL)
            })
        })
        describe('upgradeTarget', function () {
            it('should upgrade RefSystem if Manager', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")
                await refFactory.methods.upgradeTarget({
                    targets: [refSystem.address],
                    version: 99,
                    code: TestUpgrade.code,
                    remainingGasTo: refFactoryOwner.address 
                }).send({ from: refFactoryOwner.address, amount: toNano(3) })

                let upgraded = locklift.factory.getDeployedContract("TestUpgrade", refSystem.address)

                let { _isUpgraded } = await upgraded.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")
            })
            it('should upgrade RefProject', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");

                let project = await deployProject(projectOwner, refSystem, 5, 5);
                logContract(project, "Project");

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")
                await refFactory.methods.upgradeTarget({
                    targets: [project.address],
                    version: 99,
                    code: TestUpgrade.code,
                    remainingGasTo: refFactoryOwner.address 
                }).send({ from: refFactoryOwner.address, amount: toNano(3) })

                let upgraded = locklift.factory.getDeployedContract("TestUpgrade", project.address)

                let { _isUpgraded } = await upgraded.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")
            })
            it('should upgrade RefAccount', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");
                
                await refSystem.methods.deployRefAccount({
                    recipients: [refSysOwner.address],
                    tokenWallet: zeroAddress,
                    rewards: [0],
                    sender: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let { value0: refSysAccountAddr } = await refSystem.methods.deriveRefAccount({ answerId: 0, owner: refSysOwner.address }).call()
                let refSysAccount = locklift.factory.getDeployedContract("RefAccount", refSysAccountAddr)

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")
                await refFactory.methods.upgradeTarget({
                    targets: [refSysAccount.address],
                    version: 99,
                    code: TestUpgrade.code,
                    remainingGasTo: refFactoryOwner.address 
                }).send({ from: refFactoryOwner.address, amount: toNano(3) })

                let upgraded = locklift.factory.getDeployedContract("TestUpgrade", refSysAccount.address)

                let { _isUpgraded } = await upgraded.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")
            })

            it('should upgrade RefLast', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                await refSystem.methods.deployRefLast({
                    owner: refSysOwner.address,
                    lastRefWallet: zeroAddress,
                    lastReferred: zeroAddress,
                    lastReferrer: zeroAddress,
                    lastRefReward: 0,
                    sender: zeroAddress,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let { value0: refLastAddr } = await refSystem.methods.deriveRefLast({ answerId: 0, owner: refSysOwner.address }).call()
                let refLast = locklift.factory.getDeployedContract("RefLast", refLastAddr)

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")
                await refFactory.methods.upgradeTarget({
                    targets: [refLast.address],
                    version: 99,
                    code: TestUpgrade.code,
                    remainingGasTo: refFactoryOwner.address 
                }).send({ from: refFactoryOwner.address, amount: toNano(3) })

                let upgraded = locklift.factory.getDeployedContract("TestUpgrade", refLast.address)

                let { _isUpgraded } = await upgraded.methods._isUpgraded().call()
                expect(_isUpgraded).to.be.equal("true")
            })

            it('should upgrade multiple targets', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");
                logContract(refFactory, "RefFactory");
                
                let userAccounts = await Promise.all(["4", "5", "6", "7", "8", "9", "10", "11", "12"].map(async v => {
                    let pair = await locklift.keystore.getSigner(v)
                    let user = await deployAccount(pair!, 10);

                    return user
                }))

                await refSystem.methods.deployRefAccount({
                    recipients: userAccounts.map(a => a.address),
                    tokenWallet: zeroAddress,
                    rewards: userAccounts.map(() => 12),
                    sender: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(16) })

                let userRefAccounts = await Promise.all(userAccounts.map(async acc => {
                    let {value0:addr} = await refSystem.methods.deriveRefAccount({answerId: 0, owner: acc.address}).call()
                    return addr;
                }))

                let TestUpgrade = locklift.factory.getContractArtifacts("TestUpgrade")
                await refFactory.methods.upgradeTarget({
                    targets: userRefAccounts.map(u => u),
                    version: 99,
                    code: TestUpgrade.code,
                    remainingGasTo: refFactoryOwner.address 
                }).send({ from: refFactoryOwner.address, amount: toNano(10) })


                for await (let user of userRefAccounts) {
                    let upgraded = locklift.factory.getDeployedContract("TestUpgrade", user)
    
                    let { _isUpgraded } = await upgraded.methods._isUpgraded().call()
                    expect(_isUpgraded).to.be.equal("true")
                }
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

                let { _id: projectId } = await project.methods._id().call()
                expect(projectId).to.be.bignumber.equal(0);
                expect(owner.equals(projectOwner.address)).to.be.true
                expect((await (await project.methods._isApproved().call())._isApproved)).to.be.false;
            })

            it('should be approved by RefSystem', async function () {
                let { _id: projectId } = await project.methods._id().call()
                await refSystem.methods.setProjectApproval({ projectId, value: true }).send({from: refSysOwner.address, amount: toNano(0.6)})
                expect(((await project.methods._isApproved().call())._isApproved)).to.be.true;
            })

        })

        describe('_deployRefAccount', function () {
            it('should deploy RefAccount', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);

                await refSystem.methods.deployRefAccount({
                    recipients: [refSysOwner.address],
                    tokenWallet: zeroAddress,
                    rewards: [0],
                    sender: refSysOwner.address,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(2) })

                let { value0: refSysAccountAddr } = await refSystem.methods.deriveRefAccount({ answerId: 0, owner: refSysOwner.address }).call()
                let refSysAccount = locklift.factory.getDeployedContract("RefAccount", refSysAccountAddr)

                expect((await refSysAccount.methods._refSystem().call())._refSystem.equals(refSystem.address)).to.be.true
                expect((await refSysAccount.methods.owner().call()).owner.equals(refSysOwner.address)).to.be.true

            })
        })

        describe('_deployRefLast', function () {
            it('should update/deploy RefLast if RefSystem Owner', async function () {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")

                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, 'refSystem')
                let prev_balance = Number(await locklift.provider.getBalance(refSysOwner.address))

                await refSystem.methods.deployRefLast({
                    owner: refSysOwner.address,
                    lastRefWallet: zeroAddress,
                    lastReferred: zeroAddress,
                    lastReferrer: zeroAddress,
                    lastRefReward: 0,
                    sender: zeroAddress,
                    remainingGasTo: refSysOwner.address
                }).send({ from: refSysOwner.address, amount: toNano(0.6) })
                let new_balance = Number(await locklift.provider.getBalance(refSysOwner.address))
                logger.log(prev_balance, new_balance, fromNano(prev_balance - new_balance))
                let { value0: refLastAddr } = await refSystem.methods.deriveRefLast({ answerId: 0, owner: refSysOwner.address }).call()
                let refLast = locklift.factory.getDeployedContract("RefLast", refLastAddr)
                logContract(refLast, 'refLast')
                expect((await refLast.methods._refSystem().call())._refSystem.equals(refSystem.address)).to.be.true
            })
        })

        describe('updateRefLast', function() {
            it('should deploy refLast by project manager', async function() {
                let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
                let projectOwnerPair = await locklift.keystore.getSigner("1")
                let refOwnerPair = await locklift.keystore.getSigner("2")
                let projectManagerPair = await locklift.keystore.getSigner("3")


                let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50);
                let projectOwner = await deployAccount(projectOwnerPair!, 50, "projectOwner");
                let refSysOwner = await deployAccount(refOwnerPair!, 50, "refSysOwner");
                let projectManager = await deployAccount(projectManagerPair!, 50);

                let refFactory = await deployRefFactory(refFactoryOwner)
                let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, 300);
                logContract(refSystem, "RefSystem");

                let project = await deployProject(projectOwner, refSystem, 5, 5);
                logContract(project, "Project");

                await refSystem.methods.setProjectApproval({
                    projectId: 0,
                    value: true
                }).send({ from: refSysOwner.address, amount: toNano(0.8)})

                await project.methods.setManager({
                    manager: projectManager.address
                }).send({from: projectOwner.address, amount: toNano(0.6)});


                let prev_balance = Number(await locklift.provider.getBalance(projectManager.address))
                let p_prev_balance = Number(await locklift.provider.getBalance(project.address))
                let s_prev_balance = Number(await locklift.provider.getBalance(refSystem.address))
                
                await project.methods.onRefLastUpdate({
                    tokenWallet: zeroAddress,
                    referred: zeroAddress,
                    referrer: project.address,
                    amount: 123,
                    remainingGasTo: projectManager.address
                }).send({from: projectManager.address, amount: toNano(0.5)})
                
                let s_new_balance = Number(await locklift.provider.getBalance(refSystem.address))

                let p_new_balance = Number(await locklift.provider.getBalance(project.address))
                let new_balance = Number(await locklift.provider.getBalance(projectManager.address))
                
                logger.log(prev_balance+p_prev_balance, p_new_balance+new_balance, fromNano((prev_balance+p_prev_balance+s_prev_balance) - (s_new_balance + new_balance + p_new_balance)))
                
                let {value0: refLastAddr} = await refSystem.methods.deriveRefLast({answerId: 0, owner: project.address}).call()
                let refLast = locklift.factory.getDeployedContract("RefLast", refLastAddr)
                logContract(refLast, 'RefLast')
                let {_owner} = await refLast.methods._owner().call()
                expect(_owner.equals(project.address)).to.be.true
            })
        })

    })

})