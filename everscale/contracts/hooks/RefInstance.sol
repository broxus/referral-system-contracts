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
import "./RefSystem.sol";

contract RefInstance {

    address static factory;
    address static recipient;
    address public lastParent;
    uint128 public lastReward;

    constructor(address parent_, uint128 reward_) public {
        tvm.accept();
        lastParent = parent_;
        lastReward = reward_;
        
        // Single-Level
        RefSystem(factory).onRefDeploy{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(recipient, lastParent, lastReward);

        // // Multi-Level
        // // Start Parent Chain Query
        // if(parent != address(0)) {
        //     address parentRef = _deriveRef(parent);
        //     RefInstance(parentRef).getParents{
        //         value: 0,
        //         flag: MsgFlag.ALL_NOT_RESERVED
        //     }(eventData, [recipient]);
        // } else {
        //     RefSystem(factory).onRefDeploy{
        //         value: 0,
        //         flag: MsgFlag.ALL_NOT_RESERVED
        //     }(eventData, [recipient]);
        // }
    }

    function queryLast(TvmCell payload) external responsible returns (address, uint128, TvmCell) {
        return (lastParent, lastReward, payload);
    }
    function setLast(address parent_, address, uint128 reward_) external {
        require(msg.sender == factory, 401, "Must be RefSystem");
        lastParent = parent_;
        lastReward = reward_;
    }

    function _deriveRef(address target) internal returns (address) {
       return address(tvm.hash(_buildRefInitData(target)));
    }

    function _buildRefInitData(address target) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefInstance,
            varInit: {
                recipient: target,
                factory: factory
            },
            pubkey: 0,
            code: tvm.code()
        });
    }

    // function getParents(TvmCell eventData, address[] parents) external {
    //     tvm.accept();
    //     require(msg.sender == _deriveRef(parents[parents.length -1]), 401, 'Permission Denied. Must Be Ref');
    //     parents.push(recipient);

    //     if(parent != address(0)) {
    //         address parentRef = _deriveRef(parent);
    //         RefInstance(parentRef).getParents{
    //             value: 0,
    //             flag: MsgFlag.ALL_NOT_RESERVED
    //         }(eventData, parents);
    //     } else {
    //         RefSystem(factory).onRefDeploy{
    //             value: 0,
    //             flag: MsgFlag.ALL_NOT_RESERVED
    //         }(eventData, parents);
    //     }
    // }

}