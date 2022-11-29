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
import "../proxy/HookedProxyMultiVaultCellEncoder.sol";

import "./RefInstance.sol";
import "../interfaces/IRefSystem.sol";


contract RefSystem is
    IRefSystem,
    InternalOwner,
    RandomNonce
{
    address public _proxy;
    TvmCell _refCode;

    uint128 public _approvalFee;
    uint128 public _approvalFeeDigits;

    uint256 public DEBUG_RECV_COUNT;
    address[] public DEBUG_RECV_PARENTS;

    event DEBUG(TvmCell eventData, address[] parents);

    constructor(
        uint128 approvalFee,
        uint128 approvalFeeDigits,
        TvmCell refCode
    ) public {
        tvm.accept();
        require(approvalFee < approvalFeeDigits, 500);

        _approvalFee = approvalFee;
        _approvalFeeDigits = approvalFeeDigits;

        _refCode = refCode;
        setOwnership(msg.sender);

        // owner.transfer({
        //     value: 0,
        //     bounce: false,
        //     flag: MsgFlag.ALL_NOT_RESERVED
        // });
    }

    /// TODO
    function onCheck(TvmCell payload) virtual internal returns (bool, TvmCell) {
        return (true, payload);
    }

    function requestApproval(TvmCell payload) external responsible override returns (TvmCell) {
        // Take Fee
        uint128 refFee = msg.value*_approvalFee/_approvalFeeDigits;
        tvm.rawReserve(refFee, 4);
        // TODO
        return payload;
    }

    function deriveRef(address recipient) external responsible returns (address) {
       return _deriveRef(recipient);
    }

    function _deriveRef(address recipient) internal returns (address) {
       return address(tvm.hash(_buildRefInitData(recipient)));
    }

    function deployRef(address recipient, address parent, TvmCell eventData) internal returns (address) {
        return new RefInstance {
            stateInit: _buildRefInitData(recipient),
            value: 3 ton,
            flag: 0
            // flag: MsgFlag.ALL_NOT_RESERVED
        }(parent, eventData);
    }

    function deployEmptyRef() external returns (address) {
        TvmCell empty;
        return deployRef(msg.sender, address(0), empty);
    }

    function _buildRefInitData(address recipient) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefInstance,
            varInit: {
                recipient: recipient,
                factory: address(this)
            },
            pubkey: 0,
            code: _refCode
        });
    }

    function onRefDeploy(TvmCell eventData, address[] parents) external {
        tvm.accept();
        address origin = parents[parents.length -1];
        require(msg.sender == _deriveRef(origin), 401, "Permission Denied. Must Be Ref");
        
        runRewards(eventData, parents);
    }

    function runRewards(TvmCell eventData, address[] parents) internal virtual {
        // TODO
        emit DEBUG(eventData, parents);
        DEBUG_RECV_COUNT += 1;
        DEBUG_RECV_PARENTS = parents;
    }

}