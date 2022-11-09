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

contract RefFactory is
    IProxyHook,
    InternalOwner,
    RandomNonce
{
    address public proxy;
    TvmCell refCode;

    uint public DEBUG_RECV_COUNT;
    address[] public DEBUG_RECV_PARENTS;

    event DEBUG(TvmCell eventData, address[] parents);

    constructor(
        address proxy_,
        TvmCell refCode_
    ) public {
        tvm.accept();

        refCode = refCode_;
        setProxy(proxy_);
        setOwnership(msg.sender);

        // owner.transfer({
        //     value: 0,
        //     bounce: false,
        //     flag: MsgFlag.ALL_NOT_RESERVED
        // });
    }

    function setProxy(address proxy_) internal virtual {
        proxy = proxy_;
    }

    function decodeEventData(TvmCell eventData) internal returns (address recipient, address parent) {
        (
            uint256 base_chainId,
            uint160 base_token,
            string name,
            string symbol,
            uint8 decimals,
            uint128 amount,
            int8 recipient_wid,
            uint256 recipient_addr,
            address hook,
            TvmCell hookPayload
        ) = abi.decode(eventData, (uint256, uint160, string, string, uint8, uint128, int8, uint256, address, TvmCell));
        
        recipient = address.makeAddrStd(recipient_wid, recipient_addr);
        parent = abi.decode(hookPayload, address);
    }

    function onEventCompleted(TvmCell payload) external override {
        tvm.accept();
        require(msg.sender == proxy, 401, "Permission Denied. Must Be Proxy");
        IEthereumEvent.EthereumEventInitData initData = abi.decode(payload, IEthereumEvent.EthereumEventInitData);
        (address recipient, address parent) = decodeEventData(initData.voteData.eventData);
        
        deployRef(recipient, parent, initData.voteData.eventData);
    }

    function deriveRef(address recipient) public returns (address) {
       return address(tvm.hash(_buildRefInitData(recipient)));
    }

    function deployRef(address recipient, address parentRef, TvmCell eventData) internal returns (address) {
        return new RefInstance {
            stateInit: _buildRefInitData(recipient),
            value: 3 ton,
            flag: 0
            // flag: MsgFlag.ALL_NOT_RESERVED
        }(parentRef, eventData);
    }

    function createEmptyRef() responsible external returns (address) {
        TvmCell empty;
        return new RefInstance {
            stateInit: _buildRefInitData(msg.sender),
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(address(0), empty);
    }

    function _buildRefInitData(address recipient) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefInstance,
            varInit: {
                recipient: recipient,
                factory: address(this)
            },
            pubkey: 0,
            code: refCode
        });
    }

    function onRefDeploy(TvmCell eventData, address[] parents) external {
        tvm.accept();
        address origin = parents[0];
        require(msg.sender == deriveRef(origin), 401, "Permission Denied. Must Be Ref");
        
        runRewards(eventData, parents);
    }

    function runRewards(TvmCell eventData, address[] parents) internal virtual {
        // TODO
        emit DEBUG(eventData, parents);
        DEBUG_RECV_COUNT += 1;
        DEBUG_RECV_PARENTS = parents;
    }

}