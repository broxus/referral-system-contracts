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

contract RefSystem is
    IRefSystem,
    InternalOwner
{   
    uint32 public version_;
    TvmCell public _platformCode;
    
    address public _refFactory;
    TvmCell public _refCode;
    TvmCell public _refPlatformCode;
    TvmCell public _projectCode;
    TvmCell public _projectPlatformCode;

    uint128 public _approvalFee;
    uint128 public _approvalFeeDigits;

    uint256 public DEBUG_RECV_COUNT;
    address[] public DEBUG_RECV_PARENTS;
    
    mapping (address => address) public tempReq;

    event DEBUG(TvmCell eventData, address[] parents);

        constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address, address, uint16, uint16, uint16, address sender, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        address sender;
        address owner;
        TvmSlice s = data.toSlice();
        (_refFactory,
        owner,
        oldVersion,
        version_,
        _approvalFee,
        _approvalFeeDigits,
        sender,
        remainingGasTo
        ) = s.decode(
            address,
            address,
            uint32,
            uint32, 
            uint128,
            uint128,
            address,
            address
        );

        setOwnership(owner);

        _refPlatformCode = s.loadRef();
        _refCode = s.loadRef();
        _projectPlatformCode = s.loadRef();
        _projectCode = s.loadRef();
        _platformCode = s.loadRef();

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function _reserve() internal returns (uint128) {
        return 0;
    }

    // constructor(
    //     address owner,
    //     uint128 approvalFee,
    //     uint128 approvalFeeDigits,
    //     TvmCell refPlatformCode,
    //     TvmCell refCode,
    //     TvmCell projectPlatformCode,
    //     TvmCell projectCode
    // ) public {
    //     tvm.accept();
    //     require(approvalFee < approvalFeeDigits, 500);

    //     _approvalFee = approvalFee;
    //     _approvalFeeDigits = approvalFeeDigits;

    //     _refPlatformCode = refPlatformCode;
    //     _refCode = refCode;
    //     _projectPlatformCode = projectPlatformCode;
    //     _projectCode = projectCode;
    //     setOwnership(owner);

    //     // owner.transfer({
    //     //     value: 0,
    //     //     bounce: false,
    //     //     flag: MsgFlag.ALL_NOT_RESERVED
    //     // });
    // }

    // on


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
            _projectCode,
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
        Project(_deriveProject(projectOwner)).acceptInit();
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