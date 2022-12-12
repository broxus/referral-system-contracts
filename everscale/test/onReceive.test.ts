import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Address, Contract, fromNano, toNano } from "locklift";
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

        let refSystemOwner: Account;
        let bob: Account;
        let alice: Account;
        let jerry: Account;

        let refSystem: Contract<FactorySource["RefSystemUpgradeable"]>;
        let project: Contract<FactorySource["Project"]>;
        let refSystemWallet: Contract<FactorySource["TokenWallet"]>;
        let bobWallet: Contract<FactorySource["TokenWallet"]>
        let bobRefAccount: Contract<FactorySource["RefAccount"]>;

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
            let refSysOwner = await deployAccount(refOwnerPair!, 50, 'refSysOwner');
            let projectOwner = await deployAccount(projectOwnerPair!, 50, 'projectOwner');
            let tokenRootOwner = await deployAccount(tokenRootOwnerPair!, 50, 'tokenRootOwner');
            let tokenWalletOwner = await deployAccount(tokenWalletOwnerPair!, 50, 'tokenWalletOwner');

            let app = await deployAccount(appPair!, 50, 'app');
            bob = await deployAccount(bobPair!, 50, 'bob');
            alice = await deployAccount(alicePair!, 50, 'alice');
            jerry = await deployAccount(jerryPair!, 50, 'jerry');

            FIRST_REWARD = 100;
            FIRST_REFERRED = alice.address;
            FIRST_REFERRER = bob.address;

            const REFSYS_FEE = 1;
            const PROJECT_FEE = 5;
            const CASHBACK_FEE = 5;

            let refFactory = await deployRefFactory(refFactoryOwner)
            refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, toNano(REFSYS_FEE));
            project = await deployProject(projectOwner, refSystem, toNano(PROJECT_FEE), toNano(CASHBACK_FEE));

            await approveProject(project, refSysOwner, refSystem)
            logContract(refSystem, "RefSystem")
            logContract(project, "Project")

            let tokenRoot = await deployTokenRoot(tokenRootOwner, { name: "Test", symbol: "TST", decimals: "1000000" })
            logContract(tokenRoot, "tokenRoot " + "Test")

            await mint(tokenRootOwner, tokenRoot, toNano(100), app.address);

            refSystemWallet = await walletOf(tokenRoot, refSystem.address, "RefSystemWallet")
            let refSysOwnerWallet = await walletOf(tokenRoot, refSysOwner.address)
            let projectOwnerWallet = await walletOf(tokenRoot, projectOwner.address)
            let appWallet = await walletOf(tokenRoot, app.address, "AppWallet")
            bobWallet = await walletOf(tokenRoot, bob.address)
            let aliceWallet = await walletOf(tokenRoot, alice.address)
            let jerryWallet = await walletOf(tokenRoot, jerry.address)

            const getRefAccount = async (acc: Account) => {
                let { value0 } = await refSystem.methods.deriveRefAccount({ owner: acc.address, answerId: 0 }).call()
                return locklift.factory.getDeployedContract("RefAccount", value0)
            }

            let refSysOwnerRefAccount = await getRefAccount(refSysOwner)
            let projectOwnerRefAccount = await getRefAccount(projectOwner)
            bobRefAccount = await getRefAccount(bob)
            let aliceRefAccount = await getRefAccount(alice)
            let jerryRefAccount = await getRefAccount(jerry)

            let { value0: appWalletBalance } = await appWallet.methods.balance({ answerId: 0 }).call()
            expect(appWalletBalance).to.equal(toNano(100))

            /// Encode Payload
            let { value0: payload } = await refSystem.methods.onAcceptTokensTransferPayloadEncoder({
                projectOwner: projectOwner.address,
                referred: alice.address,
                referrer: bob.address,
                answerId: 0
            }).call();

            // Run Wallet
            await appWallet.methods.transfer({
                amount: toNano(FIRST_REWARD),
                recipient: refSystem.address,
                deployWalletValue: toNano(2),
                remainingGasTo: app.address,
                notify: true, // Must Be Set to Trigger Project#onAcceptTokensTransfer
                payload
            }).send({ from: app.address, amount: toNano(10) })

            let { value0: appWalletBalanceNew } = await appWallet.methods.balance({ answerId: 0 }).call()
            let { value0: refSysteWalletmBalance } = await refSystemWallet.methods.balance({ answerId: 0 }).call()

            // let { value0: projectWalletBalance } = await projectWallet.methods.balance({ answerId: 0 }).call()
            // let { value0: refSysOwnerBalance } = await refSysOwnerWallet.methods.balance({ answerId: 0 }).call()
            // let { value0: projectOwnerWalletBalance } = await projectOwnerWallet.methods.balance({ answerId: 0 }).call()
            // let { value0: bobWalletBalance } = await bobWallet.methods.balance({ answerId: 0 }).call()
            // let { value0: aliceWalletBalance } = await aliceWallet.methods.balance({ answerId: 0 }).call()
            // let { value0: jerryWalletBalance } = await jerryWallet.methods.balance({ answerId: 0 }).call()

            expect(appWalletBalanceNew).to.be.bignumber.equal(0)
            expect(refSysteWalletmBalance).to.be.bignumber.equal(appWalletBalance)

            logContract(refSysOwnerRefAccount, "refSysOwnerAcc")
            logContract(bobRefAccount, 'bobAccount')

            const getBalances = async (refAccount: Contract<FactorySource['RefAccount']>) => {
                let { _tokenBalance: arr } = await refAccount.methods._tokenBalance().call()
                return Number(fromNano(arr[0][1]))
                // return new Map(arr.map(([k, v]) => [k.toString(), v]))
            }

            let bobAccountBalance = await getBalances(bobRefAccount)
            let aliceAccountBalance = await getBalances(aliceRefAccount)
            let refSysOwnerAccountBalance = await getBalances(refSysOwnerRefAccount)
            let projectOwnerAccountBalance = await getBalances(projectOwnerRefAccount)

            expect(refSysOwnerAccountBalance).to.be.equal(REFSYS_FEE)
            expect(projectOwnerAccountBalance).to.be.equal(PROJECT_FEE)
            expect(aliceAccountBalance).to.be.equal(CASHBACK_FEE)
            expect(bobAccountBalance).to.be.equal(FIRST_REWARD - REFSYS_FEE - PROJECT_FEE - CASHBACK_FEE)
        })
        describe('LastRef on Update', function() {
            it('should be updated with last reward', async function() {
                let {value0: lastRefAddr} = await refSystem.methods.deriveRefLast({answerId: 0, root: refSystem.address}).call();
                let lastRef = locklift.factory.getDeployedContract("RefLast", lastRefAddr)
                logContract(lastRef, "RefLast");

                let { wallet, referrer, referred, reward, time } = await lastRef.methods.meta({answerId: 0}).call()
                expect(referrer.toString()).to.be.equal(FIRST_REFERRER.toString())
                expect(referred.toString()).to.be.equal(FIRST_REFERRED.toString())
                expect(reward).to.be.equal(toNano(FIRST_REWARD));
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

            it('should zero out after claim', async function() {
                let { _tokenBalance } = await bobRefAccount.methods._tokenBalance().call()
                expect(_tokenBalance).to.be.deep.equal([])
            })
        })
    })


})