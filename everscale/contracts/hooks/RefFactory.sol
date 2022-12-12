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
import "../interfaces/IUpgradeable.sol";

import "./RefInstance.sol";
import "./RefInstancePlatform.sol";
import "./ProjectPlatform.sol";
import "./Project.sol";
import "./RefSystemUpgradeable.sol";
import "./RefSystemPlatform.sol";

import "../interfaces/IRefSystem.sol";

contract RefFactory is InternalOwner, RandomNonce {
    TvmCell public _refSystemPlatformCode;

    constructor(
        address owner,
        TvmCell refSystemPlatformCode
    ) public {
        tvm.accept();
        _refSystemPlatformCode = refSystemPlatformCode;
        setOwnership(owner);
    }

    function deployRefSystem(
        address owner,
        TvmCell refSystemCode,
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 approvalFee,
        address sender,
        address remainingGasTo
    ) public onlyOwner returns (address) {
        return new RefSystemPlatform {
            stateInit: _buildRefSystemInitData(owner),
            wid: address(this).wid,
            value: 0,
            bounce: true,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(refSystemCode, 0, refPlatformCode, refCode, accountPlatformCode, accountCode, projectPlatformCode, projectCode, approvalFee, sender, remainingGasTo);
    }

    function upgradeRefSystem(
        address owner,
        TvmCell newRefSystemCode,
        TvmCell newParams,
        uint32 newVersion,
        address remainingGasTo
    ) public onlyOwner returns (address) {
        RefSystemUpgradeable(_deriveRefSystem(owner)).acceptUpgrade{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(newRefSystemCode, newParams, newVersion, remainingGasTo);
    }

    function upgradeTarget(
        address target,
        TvmCell targetCode,
        TvmCell params,
        uint32 newVersion,
        address remainingGasTo
    ) public onlyOwner returns (address) {
        tvm.accept();
        IUpgradeable(target).acceptUpgrade{value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(targetCode, params, newVersion, remainingGasTo);
    }

    function deriveRefSystem(address owner) public returns (address) {
        return _deriveRefSystem(owner);
    }
    
    function _deriveRefSystem(address owner) internal returns (address) {
        return address(tvm.hash(_buildRefSystemInitData(owner)));
    }

    function _buildRefSystemInitData(address owner) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefSystemPlatform,
            varInit: {
                root: address(this),
                owner: owner
            },
            pubkey: 0,
            code: _refSystemPlatformCode
        });
    }
    
}