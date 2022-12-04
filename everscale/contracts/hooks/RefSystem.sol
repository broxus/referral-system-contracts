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

import "../interfaces/IRefSystem.sol";


contract RefSystem is
    IRefSystem,
    InternalOwner,
    RandomNonce
{
    address public _proxy;
    TvmCell _refCode;
    TvmCell _refPlatformCode;

    uint128 public _approvalFee;
    uint128 public _approvalFeeDigits;

    uint256 public DEBUG_RECV_COUNT;
    address[] public DEBUG_RECV_PARENTS;
    
    mapping (address => address) public tempReq;

    event DEBUG(TvmCell eventData, address[] parents);

    constructor(
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        TvmCell refPlatformCode,
        TvmCell refCode
    ) public {
        tvm.accept();
        require(approvalFee < approvalFeeDigits, 500);

        _approvalFee = approvalFee;
        _approvalFeeDigits = approvalFeeDigits;

        _refPlatformCode = refPlatformCode;
        _refCode = refCode;
        setOwnership(msg.sender);

        // owner.transfer({
        //     value: 0,
        //     bounce: false,
        //     flag: MsgFlag.ALL_NOT_RESERVED
        // });
    }

    function requestApproval(address referrer, address referred, uint128 reward) external override {
        // Take Fee
        uint128 refFee = (reward*_approvalFee)/_approvalFeeDigits;
        // tvm.rawReserve(refFee, 4);

        // Deploy or Update ref
        deployRef(referred, referrer, reward);

        // // TEST
        // deployRef(referred, referrer);

        // RefInstance(_deriveRef(referred)).queryLast{callback: RefSystem.onCheck}(abi.encode(msg.sender, referrer, referred, reward));
    
        IProjectCallback(msg.sender).onApproval{value: reward - refFee - 0.2 ton, flag: 0}(referrer, referred, reward);
    }

    // function onCheck(address parent, uint128 lastReward, TvmCell payload) external {
    //     (address project, address referrer, address referred, uint128 reward) = abi.decode(payload, (address, address, address, uint128));
    //     require(msg.sender == _deriveRef(referred), 402, 'Must be valid RefInstance');
    //     uint128 refFee = (reward*_approvalFee)/_approvalFeeDigits;

    //     IProjectCallback(project).onApproval{value: reward - refFee, flag: 0}(referrer, referred, reward);
    // }

    function deriveRef(address recipient) external responsible returns (address) {
       return _deriveRef(recipient);
    }

    function _deriveRef(address recipient) internal returns (address) {
       return address(tvm.hash(_buildRefInitData(recipient)));
    }

    function deployRef(address recipient, address lastRef, uint128 lastRefReward) internal returns (address) {
        return new RefInstancePlatform {
            stateInit: _buildRefInitData(recipient),
            value: 3 ton,
            wid: address(this).wid,
            flag: 0,
            bounce: true
            // flag: MsgFlag.ALL_NOT_RESERVED
        }(_refCode, 0, lastRef, lastRefReward, recipient, address(this));
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