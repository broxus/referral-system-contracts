pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../modules/bridge/interfaces/IProxyExtended.sol";
import "./../modules/bridge/interfaces/multivault/IProxyMultiVaultAlien_V3.sol";
import "./../modules/bridge/interfaces/event-configuration-contracts/IEverscaleEventConfiguration.sol";

import "./../modules/utils/ErrorCodes.sol";
import "./../modules/utils/TransferUtils.sol";

import "./../modules/bridge/alien-token/TokenRootAlienEVM.sol";
import "./../modules/bridge/alien-token-merge/MergePool.sol";
import "./../modules/bridge/alien-token-merge/MergeRouter.sol";
import "./../modules/bridge/alien-token-merge/MergePoolPlatform.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "../interfaces/IProxyHook.sol";
import "../interfaces/IProjectCallback.sol";
import "../proxy/HookedProxyMultiVaultCellEncoder.sol";

import "./RefInstance.sol";
import "./RefInstancePlatform.sol";
import "./ProjectPlatform.sol";
import "./Project.sol";

import "../interfaces/IRefSystem.sol";


import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract RefSystemPlatform {
    address static root;
    address static owner;
    
    constructor(
        TvmCell initCode,
        uint32 initVersion,
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        address sender,
        address remainingGasTo
    )
        public
        functionID(0x15A038FB)
    {   
        tvm.accept();

        if (msg.sender == owner || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
           initialize(initCode, initVersion, approvalFee, approvalFeeDigits, refPlatformCode, refCode, projectPlatformCode, projectCode, sender, remainingGasTo);
        } else {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.DESTROY_IF_ZERO,
                bounce: false
            });
        }
    }

    function _getExpectedAddress(address owner_) private view returns (address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: RefSystemPlatform,
            varInit: {
                root: root,
                owner: owner_
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(
        TvmCell initCode,
        uint32 initVersion,
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        address sender,
        address remainingGasTo
    ) private {
        TvmBuilder builder;

        builder.store(root); // _refFactory
        builder.store(owner);
        builder.store(uint32(0)); // oldVersion
        builder.store(initVersion); // initVersion

        builder.store(approvalFee);
        builder.store(approvalFeeDigits);
        builder.store(sender);
        builder.store(remainingGasTo);

        builder.store(refPlatformCode);
        builder.store(refCode);
        builder.store(projectPlatformCode);
        builder.store(projectCode);
        builder.store(tvm.code());

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {}
}
