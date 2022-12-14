pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenWallet.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IVersioned.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/SID.sol";


import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "../RefLast.sol";
import "../RefLastPlatform.sol";
import "../RefAccountPlatform.sol";
import "../ProjectPlatform.sol";
import "../Project.sol";

import "../interfaces/IRefSystem.sol";
import "../interfaces/IUpgradeable.sol";

abstract contract RefSystemBase is
    IRefSystem,
    IVersioned,
    InternalOwner,
    SID,
    IAcceptTokensTransferCallback
{   
    uint32 version_;
    TvmCell public _platformCode;
    
    uint128 constant BPS = 1_000_000;

    address public _refFactory;
    TvmCell public _refLastCode;
    TvmCell public _refLastPlatformCode;
    TvmCell public _accountCode;
    TvmCell public _accountPlatformCode;
    TvmCell public _projectCode;
    TvmCell public _projectPlatformCode;

    uint128 public _deployAccountValue;
    uint128 public _deployRefLastValue;
    uint128 public _systemFee;
    
    function _reserve() virtual internal returns (uint128) {
        return 0.2 ton;
    }

    function setSystemFee(uint128 fee) external onlyOwner {
        require(fee <= BPS, 500, "Invalid Param");
        _systemFee = fee;
    }

    function setDeployAccountValue(uint128 value) external onlyOwner {
        _deployAccountValue = value;
    }

    function setDeployRefLastValue(uint128 value) external onlyOwner {
        _deployRefLastValue = value;
    }

    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) override external {
        require(amount != 0, 401, "Invalid Amount");
        (address projectOwner, address referred, address referrer) = abi.decode(payload, (address, address, address));
        address targetProject = _deriveProject(projectOwner);
        TvmCell acceptParams = abi.encode(msg.sender, tokenRoot, amount, sender, senderWallet, remainingGasTo, projectOwner, referred, referrer);
        
        Project(targetProject).meta{
            callback: RefSystemBase.getProjectMeta,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(acceptParams);
    }

    function onAcceptTokensTransferPayloadEncoder(address projectOwner, address referred, address referrer) responsible external returns (TvmCell) {
        return abi.encode(projectOwner, referred, referrer);
    }

    function getProjectMeta(
        bool isApproved,
        uint128 cashback,
        uint128 projectFee,
        TvmCell acceptParams
    ) external {
        (address tokenWallet,
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        address projectOwner,
        address referred,
        address referrer) = abi.decode(acceptParams, (address, address, uint128, address, address, address, address, address, address));
        require(msg.sender == _deriveProject(projectOwner), 400, "Not a valid Project");
        require(amount != 0, 400, "Invalid Amount");
        
        // If Amount or Project Invalid, simply receive full reward
        if(!isApproved || BPS < _systemFee + projectFee + cashback) {
            _deployRefAccount(owner, tokenWallet, amount, sender, remainingGasTo);
            return;
        }
        // Allocate to System Owner
        uint128 systemReward = uint128((uint(amount)*uint(_systemFee))/uint(BPS));
        _deployRefAccount(owner, tokenWallet, systemReward, sender, remainingGasTo);
        // Allocate to Project Owner
        uint128 projectReward = uint128((uint(amount)*uint(projectFee))/uint(BPS));
        _deployRefAccount(projectOwner, tokenWallet, projectReward, sender, remainingGasTo);
        
        // Allocate Rewards
        uint128 cashbackReward = uint128((uint(amount)*uint(cashback))/uint(BPS));
        _deployRefAccount(referred, tokenWallet, (amount*cashback)/BPS, sender, remainingGasTo);
        
        uint128 reward = amount - systemReward - projectReward - cashbackReward;
        if (reward != 0) _deployRefAccount(referrer, tokenWallet, reward, sender, remainingGasTo);
        
        // Update referred
        _deployRefLast(referred, tokenWallet, referred, referrer, amount, sender, remainingGasTo);
    }

    function requestTransfer(
        address recipient,
        address tokenWallet,
        uint128 balance,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) override external {
        require(msg.sender == _deriveRefAccount(recipient), 400, "Invalid Account");
        ITokenWallet(tokenWallet).transfer{flag: MsgFlag.REMAINING_GAS, value: 0 }(balance, recipient, 0.5 ton, remainingGasTo, notify, payload);
    }

    function deriveProject(address owner) external responsible returns (address) {
       return _deriveProject(owner);
    }

    function deriveRefAccount(address owner) external responsible returns (address) {
       return _deriveRefAccount(owner);
    }

    function deriveRefLast(address owner) external responsible returns (address) {
        return _deriveRefLast(owner);
    }

    function deployProject(
        address refSystem,
        uint128 projectFee,
        uint128 cashbackFee,
        address sender,
        address remainingGasTo
    ) override external returns (address) {
        return new ProjectPlatform {
            stateInit: _buildProjectInitData(msg.sender),
            value: 0,
            wid: address(this).wid,
            bounce: true,
            flag: MsgFlag.REMAINING_GAS
        }(
            _projectCode,
            version_,
            _refFactory,
            projectFee,
            cashbackFee,
            sender,
            remainingGasTo
        );
    }

    function deployRefAccount(
        address recipient,
        address tokenWallet,
        uint128 reward,
        address sender,
        address remainingGasTo
    ) external onlyOwner returns (address) {
        return _deployRefAccount(recipient, tokenWallet, reward, sender, remainingGasTo);
    }

    function deployRefLast(
        address owner,
        address lastRefWallet,
        address lastReferred,
        address lastReferrer,
        uint128 lastRefReward,
        address sender,
        address remainingGasTo
    ) external onlyOwner returns (address) {
        return _deployRefLast(owner, lastRefWallet,lastReferred,lastReferrer,lastRefReward,sender,remainingGasTo);
    }

    function approveProject(address projectOwner) onlyOwner public {
        Project(_deriveProject(projectOwner)).acceptInit();
    }

    function _deriveProject(address owner) internal returns (address) {
        return address(tvm.hash(_buildProjectInitData(owner)));
    }

    function _deriveRefAccount(address owner) internal returns (address) {
        return address(tvm.hash(_buildRefAccountInitData(owner)));
    }

    function _deriveRefLast(address owner) internal returns (address) {
        return address(tvm.hash(_buildRefLastInitData(owner)));
    }

    function _deployRefAccount(
        address recipient,
        address tokenWallet,
        uint128 reward,
        address sender,
        address remainingGasTo
    ) internal returns (address) {
        return new RefAccountPlatform {
            stateInit: _buildRefAccountInitData(recipient),
            value: _deployAccountValue,
            wid: address(this).wid,
            flag: 0,
            bounce: true
        }(_accountCode, version_, tokenWallet, reward, sender, remainingGasTo);
    }
    
    function _deployRefLast(
        address owner,
        address lastRefWallet,
        address lastReferred,
        address lastReferrer,
        uint128 lastRefReward,
        address sender,
        address remainingGasTo
    ) internal returns (address) {
        return new RefLastPlatform {
            stateInit: _buildRefLastInitData(owner),
            value: _deployRefLastValue,
            wid: address(this).wid,
            flag: 0,
            bounce: true
        }(_refLastCode, version_, lastRefWallet, lastReferred, lastReferrer, lastRefReward, sender, remainingGasTo);
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
    function _buildRefLastInitData(address owner) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefLastPlatform,
            varInit: {
                root: address(this),
                owner: owner
            },
            pubkey: 0,
            code: _refLastPlatformCode
        });
    }

    function _buildRefAccountInitData(address target) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefAccountPlatform,
            varInit: {
                root: address(this),
                owner: target
            },
            pubkey: 0,
            code: _accountPlatformCode
        });
    }

}