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
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        address sender,
        address remainingGasTo
    )
        public
        functionID(0x15A038FB)
    {   
        tvm.accept();

        if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
            initialize(initCode, initVersion, refPlatformCode, refCode, projectPlatformCode, projectCode, approvalFee, approvalFeeDigits, sender, remainingGasTo);
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
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        address sender,
        address remainingGasTo
    ) private {

        TvmCell inputCell = abi.encode(
            root,
            owner,
            uint32(0),
            initVersion,
            approvalFee,
            approvalFeeDigits,
            sender,
            remainingGasTo,
            tvm.code(),
            projectPlatformCode,
            projectCode,
            refPlatformCode,
            refCode
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputCell);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
