// @ts-check
const { expect } = require('chai');
const { locklift, afterRun, deployTestHook, logContract, deployRefFactory, deployEmptyRef, encodeAddress, deployAccount, deriveRef, deployProject, deployRefSystem, runOnRefferral } = require('./utils')
const logger = require('mocha-logger')
// const { setupRelays, setupBridge } = require('./utils/bridge');

const {
    setupRelays,
    setupBridge,
    setupAlienMultiVault,
    ...utils
} = require('./old_utils.js');


describe.only('Refferrals', function () {
    this.timeout(10000000);

    describe("RefSystem", function() {
        it('should deploy RefSystem', async function() {
            let refSystem = await deployRefSystem(300, 1000);
            expect(await refSystem.call({method: '_approvalFee'}))
                .to.be.bignumber.equal(300, 'Wrong Value');
        })
    })

    describe('Project', function() {
        it('should deploy Project', async function() {
            let [,keyPair] = await locklift.keys.getKeyPairs();
            let auth = await deployAccount(keyPair, 100, 'refAuthority');

            let refSystem = await deployRefSystem(30, 100);
            let project = await deployProject(refSystem.address, auth.address, 5, 5, 100);

            expect(await project.call({method: '_refSystem', params: { answerId: 0}}))
                .to.be.equal(refSystem.address, 'Must be Valid')
            expect(await project.call({method: '_refAuthority', params: { answerId: 0}}))
                .to.be.equal(auth.address, 'Must be Valid')
            expect(await project.call({method: '_projectFee', params: { answerId: 0}}))
                .to.be.bignumber.equal(5, 'Must be Valid')
            expect(await project.call({method: '_cashbackFee', params: { answerId: 0}}))
                .to.be.bignumber.equal(5, 'Must be Valid')
            
        })

        describe('onRefferal()', function() {
            it('should pass on all fees on success', async function() {
                let [,authPair, bobPair, alicePair, jerryPair] = await locklift.keys.getKeyPairs();
                let auth = await deployAccount(authPair, 50, 'refAuthority');
                let bob = await deployAccount(bobPair, 50, 'refAuthority');
                let alice = await deployAccount(alicePair, 50, 'refAuthority');
                let jerry = await deployAccount(jerryPair, 50, 'refAuthority');

                let refSystem = await deployRefSystem(30, 100);
                let project = await deployProject(refSystem.address, auth.address, 5, 5, 100);

                let bobBalance = (await locklift.ton.getBalance(bob.address)).toNumber()
                let aliceBalance = (await locklift.ton.getBalance(alice.address)).toNumber()
                let refSystemBalance = (await locklift.ton.getBalance(refSystem.address)).toNumber()
                let projectBalance = (await locklift.ton.getBalance(project.address)).toNumber()

                let reward = 10;

                await runOnRefferral(project, auth, bob.address, alice.address, reward);

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
                await runOnRefferral(project, auth, jerry.address, alice.address, reward);
                expect(await refInstance.call({method: 'lastRef_', params: {answerId: 0}}))
                    .to.be.equal(jerry.address)
            })
        })

    })


})