// @ts-check
const { expect } = require('chai');
const { locklift, afterRun, deployTestHook, logContract, deployRefFactory, deployEmptyRef, encodeAddress, deployAccount, deriveRef, deployProject, deployRefSystem } = require('./utils')
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
    })

})