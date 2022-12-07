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

import "../interfaces/IRefSystem.sol";


contract RefSystem is
    IRefSystem,
    InternalOwner,
    RandomNonce
{
    address public _proxy;
    TvmCell _refCode;
    TvmCell _refPlatformCode;
    TvmCell _projectPlatformCode;

    uint128 public _approvalFee;
    uint128 public _approvalFeeDigits;

    uint256 public DEBUG_RECV_COUNT;
    address[] public DEBUG_RECV_PARENTS;
    
    mapping (address => address) public tempReq;

    event DEBUG(TvmCell eventData, address[] parents);

    constructor(
        address owner,
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        TvmCell refPlatformCode,
        TvmCell refCode,
        TvmCell projectPlatformCode
    ) public {
        tvm.accept();
        require(approvalFee < approvalFeeDigits, 500);

        _approvalFee = approvalFee;
        _approvalFeeDigits = approvalFeeDigits;

        _refPlatformCode = refPlatformCode;
        _refCode = refCode;
        _projectPlatformCode = projectPlatformCode;
        setOwnership(owner);

        // owner.transfer({
        //     value: 0,
        //     bounce: false,
        //     flag: MsgFlag.ALL_NOT_RESERVED
        // });
    }

    function requestApproval(address owner, address referrer, address referred, uint128 reward) external override {
        require(msg.sender == _deriveProject(owner), 404, "Must Be Project");
        // Take Fee
        uint128 refFee = (reward*_approvalFee)/_approvalFeeDigits;
        // Deploy or Update ref
        _deployRef(referred, referrer, reward);
        IProjectCallback(msg.sender).onApproval{value: reward - refFee - 0.2 ton, flag: 0}(referrer, referred, reward);
    }

    function deriveRef(address recipient) external responsible returns (address) {
       return _deriveRef(recipient);
    }

    function deriveProject(address owner) external responsible returns (address) {
       return _deriveProject(owner);
    }

    function deployProject(
        TvmCell initCode,
        uint32 initVersion,
        address refSystem,
        uint16 projectFee,
        uint16 cashbackFee,
        uint16 feeDigits,
        address sender,
        address remainingGasTo
    ) public returns (address) {
        return new ProjectPlatform {
            stateInit: _buildProjectInitData(msg.sender),
            value: 3 ton,
            wid: address(this).wid,
            flag: 0,
            bounce: true
            // flag: MsgFlag.ALL_NOT_RESERVED
        }(
            initCode,
            initVersion,
            refSystem,
            projectFee,
            cashbackFee,
            feeDigits,
            sender,
            remainingGasTo
        );
    }

    function approveProject(address projectOwner) public {
        ProjectPlatform(_deriveProject(projectOwner)).acceptInit();
    }

    function _deriveRef(address recipient) internal returns (address) {
       return address(tvm.hash(_buildRefInitData(recipient)));
    }

    function _deriveProject(address owner) internal returns (address) {
        return address(tvm.hash(_buildProjectInitData(owner)));
    }

    // function _deployProject(TvmCell projectCode, address owner, TvmCell payload) internal returns (address) {
    //     return new ProjectPlatform {
    //         stateInit: _buildRefInitData(owner),
    //         value: 3 ton,
    //         wid: address(this).wid,
    //         flag: 0,
    //         bounce: true
    //         // flag: MsgFlag.ALL_NOT_RESERVED
    //     }(projectCode, payload);
    // }

    function _deployRef(address recipient, address lastRef, uint128 lastRefReward) internal returns (address) {
        return new RefInstancePlatform {
            stateInit: _buildRefInitData(recipient),
            value: 3 ton,
            wid: address(this).wid,
            flag: 0,
            bounce: true
            // flag: MsgFlag.ALL_NOT_RESERVED
        }(_refCode, 0, lastRef, lastRefReward, recipient, address(this));
    }

    function _buildProjectInitData(address owner) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: ProjectPlatform,
            varInit: {
                root: address(this),
                owner: owner
            },
            pubkey: 0,
            code: _projectPlatformCode
        });
    }
    function _buildRefInitData(address target) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefInstancePlatform,
            varInit: {
                root: address(this),
                owner: target
            },
            pubkey: 0,
            code: _refPlatformCode
        });
    }

}