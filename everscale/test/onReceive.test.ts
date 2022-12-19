import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Address, Contract, fromNano, getRandomNonce, toNano } from "locklift";
import { Account } from "everscale-standalone-client";
import { deployTokenFactory, deployTokenRoot, mint } from "./utils/tokenRoot";
import { walletOf } from "./utils/tokenWallet";
// const { setupRelays, setupBridge } = require('./utils/bridge');

if (locklift.context.network.name === "main") throw "NOT IN TEST MODE"

describe('RefSystem On Receive', function () {
    this.timeout(10000000);
    describe('onAcceptTokensTransfer()', function () {
        let FIRST_REWARD: number;
        let FIRST_REFERRED: Address;
        let FIRST_REFERRER: Address;

        let refSysOwner: Account;
        let projectOwner: Account;
        let tokenRootOwner: Account;
        let bob: Account;
        let alice: Account;
        let jerry: Account;
        let app: Account;

        let refSystem: Contract<FactorySource["RefSystemUpgradeable"]>;
        let project: Contract<FactorySource["Project"]>;

        let refSystemWallet: Contract<FactorySource["TokenWallet"]>;
        let appWallet: Contract<FactorySource["TokenWallet"]>
        let bobWallet: Contract<FactorySource["TokenWallet"]>
        let aliceWallet: Contract<FactorySource["TokenWallet"]>

        let bobRefAccount: Contract<FactorySource["RefAccount"]>;
        let aliceRefAccount: Contract<FactorySource["RefAccount"]>;

        it('should assign rewards to accounts', async function () {
            let refFactoryOwnerPair = await locklift.keystore.getSigner("0")
            let refOwnerPair = await locklift.keystore.getSigner("1")
            let projectOwnerPair = await locklift.keystore.getSigner("2")
            let tokenRootOwnerPair = await locklift.keystore.getSigner("3")
            let tokenWalletOwnerPair = await locklift.keystore.getSigner("4")

            let appPair = await locklift.keystore.getSigner("5")
            let bobPair = await locklift.keystore.getSigner("6")
            let alicePair = await locklift.keystore.getSigner("7")
            let jerryPair = await locklift.keystore.getSigner("8")

            let refFactoryOwner = await deployAccount(refFactoryOwnerPair!, 50, 'refSysOwner');
            refSysOwner = await deployAccount(refOwnerPair!, 50, 'refSysOwner');
            projectOwner = await deployAccount(projectOwnerPair!, 50, 'projectOwner');
            tokenRootOwner = await deployAccount(tokenRootOwnerPair!, 50, 'tokenRootOwner');
            let tokenWalletOwner = await deployAccount(tokenWalletOwnerPair!, 50, 'tokenWalletOwner');

            app = await deployAccount(appPair!, 50, 'app');
            bob = await deployAccount(bobPair!, 50, 'bob');
            alice = await deployAccount(alicePair!, 50, 'alice');
            jerry = await deployAccount(jerryPair!, 50, 'jerry');

            FIRST_REWARD = 100_000_000;
            FIRST_REFERRED = alice.address;
            FIRST_REFERRER = bob.address;

            const BPS = 1_000_000;
            const REFSYS_FEE = 10_000; // 1%;
            const PROJECT_FEE = 50_000;
            const CASHBACK_FEE = 50_000; // 5%
            const EXPECTED_REWARD = {
                REFSYS: 1_000_000,
                PROJECT: 5_000_000,
                CASHBACK: 5_000_000,
                REFERRER: 89_000_000
            };

            let refFactory = await deployRefFactory(refFactoryOwner)
            refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, REFSYS_FEE);
            project = await deployProject(projectOwner, refSystem, PROJECT_FEE, CASHBACK_FEE);
            await approveProject(project, refSysOwner, refSystem)

            logContract(refSystem, "RefSystem")
            logContract(project, "Project")

            let tokenRoot = await deployTokenRoot(tokenRootOwner, { name: "Test", symbol: "TST", decimals: 0 })
            logContract(tokenRoot, "tokenRoot " + "Test")

            await mint(tokenRootOwner, tokenRoot, FIRST_REWARD, app.address);

            refSystemWallet = await walletOf(tokenRoot, refSystem.address, "RefSystemWallet")
            let refSysOwnerWallet = await walletOf(tokenRoot, refSysOwner.address)
            let projectOwnerWallet = await walletOf(tokenRoot, projectOwner.address)
            appWallet = await walletOf(tokenRoot, app.address, "AppWallet")
            bobWallet = await walletOf(tokenRoot, bob.address)
            aliceWallet = await walletOf(tokenRoot, alice.address)
            let jerryWallet = await walletOf(tokenRoot, jerry.address)

            const getRefAccount = async (acc: Account) => {
                let { value0 } = await refSystem.methods.deriveRefAccount({ owner: acc.address, answerId: 0 }).call()
                return locklift.factory.getDeployedContract("RefAccount", value0)
            }

            let refSysOwnerRefAccount = await getRefAccount(refSysOwner)
            let projectOwnerRefAccount = await getRefAccount(projectOwner)
            bobRefAccount = await getRefAccount(bob)
            aliceRefAccount = await getRefAccount(alice)
            let jerryRefAccount = await getRefAccount(jerry)

            let { value0: appWalletBalance } = await appWallet.methods.balance({ answerId: 0 }).call()
            expect(appWalletBalance).to.be.bignumber.equal(FIRST_REWARD)

            let {_id: projectId} = await project.methods._id().call()
            /// Encode Payload
            let { value0: payload } = await refSystem.methods.onAcceptTokensTransferPayloadEncoder({
                projectId,
                referred: alice.address,
                referrer: bob.address,
                answerId: 0
            }).call();

            // Run Wallet
            await appWallet.methods.transfer({
                amount: FIRST_REWARD,
                recipient: refSystem.address,
                deployWalletValue: toNano(2),
                remainingGasTo: app.address,
                notify: true, // Must Be Set to Trigger Project#onAcceptTokensTransfer
                payload
            }).send({ from: app.address, amount: toNano(10) })

            let { value0: appWalletBalanceNew } = await appWallet.methods.balance({ answerId: 0 }).call()
            let { value0: refSysteWalletBalance } = await refSystemWallet.methods.balance({ answerId: 0 }).call()

            expect(appWalletBalanceNew).to.be.bignumber.equal(0)
            expect(refSysteWalletBalance).to.be.bignumber.equal(appWalletBalance)

            logContract(refSysOwnerRefAccount, "refSysOwnerAcc")
            logContract(bobRefAccount, 'bobAccount')

            const getBalances = async (refAccount: Contract<FactorySource['RefAccount']>) => {
                let { _tokenBalance: arr } = await refAccount.methods._tokenBalance().call()
                return Number(arr[0][1])
                // return new Map(arr.map(([k, v]) => [k.toString(), v]))
            }

            let bobAccountBalance = await getBalances(bobRefAccount)
            let aliceAccountBalance = await getBalances(aliceRefAccount)
            let refSysOwnerAccountBalance = await getBalances(refSysOwnerRefAccount)
            let projectOwnerAccountBalance = await getBalances(projectOwnerRefAccount)

            expect(refSysOwnerAccountBalance).to.be.equal(EXPECTED_REWARD.REFSYS)
            expect(projectOwnerAccountBalance).to.be.equal(EXPECTED_REWARD.PROJECT)
            expect(aliceAccountBalance).to.be.equal(EXPECTED_REWARD.CASHBACK)
            expect(bobAccountBalance).to.be.equal(EXPECTED_REWARD.REFERRER)
        })

        describe('LastRef on Update', function () {
            it('should be updated refLast referrer with last reward', async function () {
                let { value0: lastRefAddr } = await refSystem.methods.deriveRefLast({ answerId: 0, owner: FIRST_REFERRER }).call();
                let lastRef = locklift.factory.getDeployedContract("RefLast", lastRefAddr)
                logContract(lastRef, "RefLast");

                let { wallet, referrer, referred, reward, time } = await lastRef.methods.meta({ answerId: 0 }).call()
                expect(referrer.toString()).to.be.equal(FIRST_REFERRER.toString())
                expect(referred.toString()).to.be.equal(FIRST_REFERRED.toString())
                expect(reward).to.be.equal(FIRST_REWARD.toString());
            })
        })

        describe('RefAccount with Balance', function () {
            it('should allow account to claim reward', async function () {
                const getBalances = async (refAccount: Contract<FactorySource['RefAccount']>) => {
                    let { _tokenBalance: arr } = await refAccount.methods._tokenBalance().call()
                    return Number(fromNano(arr[0][1]))
                }

                let bobAccountBalance = await getBalances(bobRefAccount)
                // Should Allow Account To Get Reward
                await bobRefAccount.methods.requestTransfer({
                    tokenWallet: refSystemWallet.address,
                    remainingGasTo: bob.address,
                    notify: true,
                    payload: ''
                }).send({ from: bob.address, amount: toNano(3) })

                logContract(bobWallet, 'bobWallet')
                let { value0: bobWalletBalance } = await bobWallet.methods.balance({ answerId: 0 }).call()
                expect(bobWalletBalance).to.be.bignumber.equal(toNano(bobAccountBalance))
            })

            it('should zero out after claim', async function () {
                let { _tokenBalance } = await bobRefAccount.methods._tokenBalance().call()
                expect(_tokenBalance).to.be.deep.equal([])
            })
        })

        async function runRewardTest(param: {
            REWARD: number
            REFSYS_FEE: number
            PROJECT_FEE: number
            CASHBACK_FEE: number
            EXPECTED: {
                REFSYS: number,
                PROJECT: number,
                CASHBACK: number,
                REFERRER: number
            }
        }) {
            it(`should assign reward with: reward=${param.REWARD} refsys_fee=${param.REFSYS_FEE} project_fee=${param.PROJECT_FEE} cashback_fee=${param.CASHBACK_FEE}`, async function () {
                // SET FEES
                await refSystem.methods.setSystemFee({
                    fee: param.REFSYS_FEE
                }).send({ from: refSysOwner.address, amount: toNano(0.1) });
                await project.methods.setCashbackFee({
                    fee: param.CASHBACK_FEE
                }).send({ from: projectOwner.address, amount: toNano(0.1) })
                await project.methods.setProjectFee({
                    fee: param.PROJECT_FEE
                }).send({ from: projectOwner.address, amount: toNano(0.1) })

                let tokenRoot = await deployTokenRoot(tokenRootOwner, { name: "Test" + getRandomNonce(), symbol: "TST"+getRandomNonce(), decimals: 0 })
                await mint(tokenRootOwner, tokenRoot, param.REWARD, app.address);

                let refSysWallet = await walletOf(tokenRoot, refSystem.address)
                let appWallet = await walletOf(tokenRoot, app.address)
                let { _id: projectId } = await project.methods._id().call()
                /// Encode Payload
                let { value0: payload } = await refSystem.methods.onAcceptTokensTransferPayloadEncoder({
                    projectId,
                    referred: alice.address,
                    referrer: bob.address,
                    answerId: 0
                }).call();

                // Run Wallet
                await appWallet.methods.transfer({
                    amount: param.REWARD,
                    recipient: refSystem.address,
                    deployWalletValue: toNano(2),
                    remainingGasTo: app.address,
                    notify: true, // Must Be Set to Trigger Project#onAcceptTokensTransfer
                    payload
                }).send({ from: app.address, amount: toNano(10) })

                const getBalances = async (acc: Account) => {
                    let { value0: addr } = await refSystem.methods.deriveRefAccount({ owner: acc.address, answerId: 0 }).call()
                    let refAccount = locklift.factory.getDeployedContract("RefAccount", addr);
                    let { _tokenBalance: arr } = await refAccount.methods._tokenBalance().call()
                    let m = Object.fromEntries(arr.map(([k, v]) => [k.toString(), Number(v)]))
                    return m[refSysWallet.address.toString()] || 0
                }

                let bobBalance = await getBalances(bob)
                let aliceBalance = await getBalances(alice)
                let refSysOwnerBalance = await getBalances(refSysOwner)
                let projectOwnerBalance = await getBalances(projectOwner)

                let {value0: bobRefLastAddr} = await refSystem.methods.deriveRefLast({answerId: 0, owner: bob.address}).call();
                let bobRefLast = locklift.factory.getDeployedContract("RefLast", bobRefLastAddr)
                logContract(bobRefLast, "refLast")
                let {reward: lastReward} = await bobRefLast.methods.meta({answerId: 0}).call()

                expect(refSysOwnerBalance).to.be.equal(param.EXPECTED.REFSYS)
                expect(bobBalance).to.be.equal(param.EXPECTED.REFERRER)
                expect(aliceBalance).to.be.equal(param.EXPECTED.CASHBACK)
                expect(projectOwnerBalance).to.be.equal(param.EXPECTED.PROJECT)
                expect(lastReward).to.be.bignumber.equal(param.REWARD)
            })
        }

        describe('Break Tests', function() {
            runRewardTest({
                REWARD: 100_000_000,
                REFSYS_FEE: 500_000,
                CASHBACK_FEE: 250_000,
                PROJECT_FEE: 250_000,
                EXPECTED: { REFSYS: 50_000_000, CASHBACK: 25_000_000, PROJECT: 25_000_000, REFERRER: 0}
            })
    
            runRewardTest({
                REWARD: 100_000_000,
                REFSYS_FEE: 1_000_000,
                CASHBACK_FEE: 250_000,
                PROJECT_FEE: 250_000,
                EXPECTED: { REFSYS: 100_000_000, CASHBACK: 0, PROJECT: 0, REFERRER: 0}
            })
    
            runRewardTest({
                REWARD: 100_000_000,
                REFSYS_FEE: 1_500_000,
                CASHBACK_FEE: 250_000,
                PROJECT_FEE: 250_000,
                EXPECTED: { REFSYS: 100_000_000, CASHBACK: 0, PROJECT: 0, REFERRER: 0}
            })

            runRewardTest({
                REWARD: 100,
                REFSYS_FEE: 500_000,
                CASHBACK_FEE: 1,
                PROJECT_FEE: 9_999,
                EXPECTED: { REFSYS: 50, CASHBACK: 0, PROJECT: 0, REFERRER: 50}
            })

        })

    })

})