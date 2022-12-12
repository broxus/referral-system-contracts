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


import "./../modules/TokenContracts/interfaces/IAcceptTokensTransferCallback.sol";

import "../interfaces/IProxyHook.sol";
import "../interfaces/IProjectCallback.sol";
import "../proxy/HookedProxyMultiVaultCellEncoder.sol";

import "./RefLast.sol";
import "./RefLastPlatform.sol";
import "./ProjectPlatform.sol";
import "./Project.sol";

import "../interfaces/IRefSystem.sol";
import "../interfaces/IUpgradeable.sol";

import "./RefSystemBase.sol";

contract RefSystemUpgradeable is RefSystemBase {   
    uint32 version_;
    constructor() public {
        revert();
    }

    function onDeployOrUpdate(
        TvmCell initCode,
        uint32 initVersion,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 approvalFee,
        address sender,
        address remainingGasTo
    ) 
    public
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
    
    function version() override public returns (uint32) {
        return version_;
    }

    function acceptUpgrade(TvmCell newCode, TvmCell newParams, uint32 newVersion, address remainingGasTo) override external {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        if (version_ == newVersion) {
            tvm.rawReserve(_reserve(), 0);
            remainingGasTo.transfer({
                value: 0,
                flag: TokenMsgFlag.ALL_NOT_RESERVED + TokenMsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        } else {
            TvmCell inputData = abi.encode(
                _refFactory,
                owner,
                version(),
                newVersion,
                remainingGasTo,
                _platformCode,
                newParams
            );

            tvm.setcode(newCode);
            tvm.setCurrentCode(newCode);
            onCodeUpgrade(inputData);
        }
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        address sender;
        address owner;

        (_refFactory,
        owner,
        oldVersion,
        version_,
        _approvalFee,
        sender,
        remainingGasTo,
        _platformCode,
        _projectPlatformCode,
        _projectCode,
        _refLastPlatformCode,
        _refLastCode,
        _accountPlatformCode,
        _accountCode
        ) = abi.decode(data,(
            address,
            address,
            uint32,
            uint32, 
            uint128,
            address,
            address,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell
        ));

        setOwnership(owner);
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }
}