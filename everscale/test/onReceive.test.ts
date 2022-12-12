import { expect } from "chai";
import { afterRun, logContract, deployRefFactory, deployAccount, deriveRef, deployProject as deployProject, deployRefSystem, approveProject } from './utils';
import { FactorySource } from "../build/factorySource";

import logger from "mocha-logger"
import { Contract, toNano } from "locklift";
import { Account } from "everscale-standalone-client";
import { deployTokenRoot, mint } from "./utils/tokenRoot";
import { walletOf } from "./utils/tokenWallet";
// const { setupRelays, setupBridge } = require('./utils/bridge');

describe.only('RefSystem On Receive', function () {
    this.timeout(10000000);

    describe('onAcceptTokensTransfer()', function () {
        it('should deploy/update last refferer')
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
            let bob = await deployAccount(bobPair!, 50, 'bob');
            let alice = await deployAccount(alicePair!, 50, 'alice');
            let jerry = await deployAccount(jerryPair!, 50, 'jerry');

            let refFactory = await deployRefFactory(refFactoryOwner)
            let refSystem = await deployRefSystem(refFactoryOwner, refFactory, refSysOwner, toNano(1));
            let project = await deployProject(projectOwner, refSystem, toNano(5), toNano(5));
            await approveProject(project, refSysOwner, refSystem)

            let tokenRoot = await deployTokenRoot(tokenRootOwner, { name: "Test", symbol: "TST", decimals: "1000000" })
            await mint(tokenRootOwner, tokenRoot, toNano(100), app.address);

            let refSysOwnerWallet = await walletOf(tokenRoot, refSysOwner)
            let projectOwnerWallet = await walletOf(tokenRoot, projectOwner)
            let appWallet = await walletOf(tokenRoot, app)
            let bobWallet = await walletOf(tokenRoot, bob)
            let aliceWallet = await walletOf(tokenRoot, alice)
            let jerryWallet = await walletOf(tokenRoot, jerry)

            let { value0: appWalletBalance } = await appWallet.methods.balance({ answerId: 0 }).call()
            let { value0: refSysOwnerBalance } = await refSysOwnerWallet.methods.balance({ answerId: 0 }).call()
            let { value0: projectOwnerWalletBalance } = await projectOwnerWallet.methods.balance({ answerId: 0 }).call()
            let { value0: bobWalletBalance } = await bobWallet.methods.balance({ answerId: 0 }).call()
            let { value0: aliceWalletBalance } = await aliceWallet.methods.balance({ answerId: 0 }).call()
            let { value0: jerryWalletBalance } = await jerryWallet.methods.balance({ answerId: 0 }).call()

            let getRefAccount = async (acc: Account) => {
                let {value0} = await refSystem.methods.deriveRefAccount({owner: acc.address, answerId: 0}).call()
                return locklift.factory.getDeployedContract("RefAccount", value0)
            }

            let refSysOwnerRefAccount = await getRefAccount(refSysOwner)
            let projectOwnerRefAccount = await getRefAccount(projectOwner)
            let bobRefAccount = await getRefAccount(bob)
            let aliceRefAccount = await getRefAccount(alice)
            let jerryRefAccount = await getRefAccount(jerry)

            expect(appWalletBalance).to.equal(toNano(100))

            /// Encode Payload
            let { value0: payload } = await refSystem.methods.onAcceptTokensTransferPayloadEncoder({
                projectOwner: projectOwner.address,
                referred: alice.address,
                referrer: bob.address,
                answerId: 0
            }).call();

            // Run Wallet
            appWallet.methods.transfer({
                amount: toNano(100),
                recipient: project.address,
                deployWalletValue: toNano(2),
                remainingGasTo: app.address,
                notify: true, // Must Be Set to Trigger Project#onAcceptTokensTransfer
                payload
            }).send({ from: app.address, amount: toNano(10)})


            // let bobBalance = Number((await locklift.provider.getBalance(bob.address)))
            // let aliceBalance = Number(await locklift.provider.getBalance(alice.address))
            // let refSystemBalance = Number(await locklift.provider.getBalance(refSystem.address))
            // let projectBalance = Number(await locklift.provider.getBalance(project.address))

            // let new_bobBalance = Number(await locklift.provider.getBalance(bob.address))
            // let new_aliceBalance = Number(await locklift.provider.getBalance(alice.address))
            // let new_refSystemBalance = Number(await locklift.provider.getBalance(refSystem.address))
            // let new_projectBalance = Number(await locklift.provider.getBalance(project.address))


            // expect(new_projectBalance).to.equal(projectBalance+Number(locklift.utils.convertCrystal(reward*5/100, 'nano')))
            // expect(new_refSystemBalance).to.equal(refSystemBalance+Number(locklift.utils.convertCrystal(reward*30/100, 'nano')))

            expect(new_aliceBalance - aliceBalance).to.be.greaterThanOrEqual(Number(locklift.utils.fromNano(reward * 5 / 100)) * 0.95)
            expect(new_bobBalance - bobBalance).to.be.greaterThanOrEqual(Number(locklift.utils.fromNano(reward * 60 / 100)) * 0.95)

            let refInstance = await deriveRef(refSystem, alice.address)

            await logContract(refInstance, "RefInstance")
            expect((await refInstance.methods.lastRef_().call()).lastRef_.equals(bob.address)).to.be.true

            // Should Update Parent
            await runOnRefferral(projectOwner, project, jerry.address, alice.address, reward);
            expect((await refInstance.methods.lastRef_().call()).lastRef_.equals(jerry.address)).to.be.true

        })
    })


})