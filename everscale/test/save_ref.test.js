// @ts-check
const { expect } = require('chai');
const { locklift, afterRun,logContract, deployRefFactory, deployEmptyRef, encodeAddress, deployAccount, deriveRef, deployProject, deployRefSystem, runOnRefferral, approveProject } = require('./utils')
const logger = require('mocha-logger')
// const { setupRelays, setupBridge } = require('./utils/bridge');

describe('Save Refferral', function () {
    this.timeout(10000000);

    describe("RefSystem", function() {
        describe('constructor', function() {
            it('should deploy RefSystem', async function() {
                let [, refOwnerPair] = await locklift.keys.getKeyPairs();
                let refSysOwner = await deployAccount(refOwnerPair, 50, 'refAuthority');

                let refSystem = await deployRefSystem(refSysOwner.address, 300, 1000);
                expect(await refSystem.call({method: '_approvalFee'}))
                    .to.be.bignumber.equal(300, 'Wrong Value');
            })
        })
        
        describe('deployProject', function() {
            let refSysOwner, projectOwner, refSystem, project;
            it('should deploy Project uninitialized', async function() {
                let [, refOwnerPair, projectOwnerPair,] = await locklift.keys.getKeyPairs();
                projectOwner = await deployAccount(projectOwnerPair, 50, 'refAuthority');
                refSysOwner = await deployAccount(refOwnerPair, 50, 'refAuthority');
    
                refSystem  = await deployRefSystem(refSysOwner.address, 30, 100);
                project = await deployProject(projectOwner, refSystem, 5, 5, 100);                
            
                expect(await project.call({method: "getOwner", params: { answerId: 0}}))
                    .to.be.equal(projectOwner.address, "Must be Owner")
            })
    
            it('should be initialized by RefSystem', async function() {

                project = await approveProject(project, refSysOwner, refSystem)
                expect(await project.call({method: '_refSystem', params: { answerId: 0}}))
                    .to.be.equal(refSystem.address, 'Must be Valid')
                expect(await project.call({method: '_projectFee', params: { answerId: 0}}))
                    .to.be.bignumber.equal(5, 'Must be Valid')
                expect(await project.call({method: '_cashbackFee', params: { answerId: 0}}))
                    .to.be.bignumber.equal(5, 'Must be Valid')
            })
        })

    })

    describe("RefSystemUpgradeable", function() {
        it('should be upgradeable by owner')
        it('should have version')
    })

    describe('ProjectUpgradeable', function() {
        it('should be upgradeable by owner')
        it('should have version')
        it('should not be initialized after upgrade')
        it('should be initialized by RefSystem')
    })

    describe('RefInstanceUpgradeable', function() {
        it('should be upgradeable by RefSystem')
        it('should have version')
    })

    describe('AccountUpgradeable', function() {
        it('should be upgradeable by RefSystem')
        it('should have version')
    })

    describe('Project', function() {
        describe('onRefferal()', function() {
            it('should pass on all fees on success', async function() {
                let [,ownerPair, bobPair, alicePair, jerryPair] = await locklift.keys.getKeyPairs();
                let projectOwner = await deployAccount(ownerPair, 50, 'refAuthority');
                let bob = await deployAccount(bobPair, 50, 'bob');
                let alice = await deployAccount(alicePair, 50, 'alice');
                let jerry = await deployAccount(jerryPair, 50, 'jerry');

                let refSystem = await deployRefSystem(30, 100);
                let project = await deployProject(projectOwner, refSystem, 5, 5, 100);

                let bobBalance = (await locklift.ton.getBalance(bob.address)).toNumber()
                let aliceBalance = (await locklift.ton.getBalance(alice.address)).toNumber()
                let refSystemBalance = (await locklift.ton.getBalance(refSystem.address)).toNumber()
                let projectBalance = (await locklift.ton.getBalance(project.address)).toNumber()

                let reward = 10;

                await runOnRefferral(projectOwner, project, bob.address, alice.address, reward);

                let new_bobBalance = (await locklift.ton.getBalance(bob.address)).toNumber()
                let new_aliceBalance = (await locklift.ton.getBalance(alice.address)).toNumber()
                let new_refSystemBalance = (await locklift.ton.getBalance(refSystem.address)).toNumber()
                let new_projectBalance = (await locklift.ton.getBalance(project.address)).toNumber()
                
                // expect(new_projectBalance).to.equal(projectBalance+Number(locklift.utils.convertCrystal(reward*5/100, 'nano')))
                // expect(new_refSystemBalance).to.equal(refSystemBalance+Number(locklift.utils.convertCrystal(reward*30/100, 'nano')))
                
                expect(new_aliceBalance - aliceBalance).to.be.greaterThanOrEqual(Number(locklift.utils.convertCrystal(reward*5/100, 'nano'))*0.95)
                expect(new_bobBalance - bobBalance).to.be.greaterThanOrEqual(Number(locklift.utils.convertCrystal(reward*60/100, 'nano'))*0.95)

                let refInstance = await deriveRef(refSystem, alice.address)

                await logContract(refInstance)
                expect(await refInstance.call({method: 'lastRef_', params: {answerId: 0}}))
                    .to.be.equal(bob.address)
                
                // Should Update Parent
                await runOnRefferral(projectOwner, project, jerry.address, alice.address, reward);
                expect(await refInstance.call({method: 'lastRef_', params: {answerId: 0}}))
                    .to.be.equal(jerry.address)
            })
        })

    })


})