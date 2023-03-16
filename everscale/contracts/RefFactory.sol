pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./interfaces/IUpgradeable.sol";

import "./RefLast.sol";
import "./RefLastPlatform.sol";
import "./ProjectPlatform.sol";
import "./Project.sol";
import "./interfaces/IRefSystemUpgradeable.sol";
import "./RefSystemPlatform.sol";

import "./interfaces/IRefSystem.sol";

contract RefFactory is InternalOwner, RandomNonce {

    address public _manager;

    TvmCell public _refSystemPlatformCode;
    TvmCell public _refSystemCode;
    TvmCell public _refLastPlatformCode;
    TvmCell public _refLastCode;
    TvmCell public _accountPlatformCode;
    TvmCell public _accountCode;
    TvmCell public _projectPlatformCode;
    TvmCell public _projectCode;
    uint128 public _systemFee;

    modifier onlyManager {
        require(msg.sender == owner || msg.sender == _manager, 400, "Must be Owner or Manager");
        _;
    }
    constructor(
        address owner,
        TvmCell refSystemPlatformCode,
        TvmCell refSystemCode,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode
    ) public {
        tvm.accept();
        _refSystemPlatformCode = refSystemPlatformCode;
        _refSystemPlatformCode = refSystemPlatformCode;
        _refSystemCode = refSystemCode;
        _refLastPlatformCode = refLastPlatformCode;
        _refLastCode = refLastCode;
        _accountPlatformCode = accountPlatformCode;
        _accountCode = accountCode;
        _projectPlatformCode = projectPlatformCode;
        _projectCode = projectCode;
        setOwnership(owner);
    }

    function setManager(address newManager) external onlyOwner {
        _manager = newManager;
    }

    function setCode(
        TvmCell refSystemPlatformCode,
        TvmCell refSystemCode,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode
    ) external onlyOwner {
        _refSystemPlatformCode = refSystemPlatformCode;
        _refSystemPlatformCode = refSystemPlatformCode;
        _refSystemCode = refSystemCode;
        _refLastPlatformCode = refLastPlatformCode;
        _refLastCode = refLastCode;
        _accountPlatformCode = accountPlatformCode;
        _accountCode = accountCode;
        _projectPlatformCode = projectPlatformCode;
        _projectCode = projectCode;
    }

    function deployRefSystemAuto(
        address owner,
        uint32 version,
        uint128 systemFee,
        uint128 deployAccountGas,
        uint128 deployRefLastGas,
        uint128 deployWalletValue,
        address sender,
        address remainingGasTo
    ) public onlyManager returns (address) {
        return new RefSystemPlatform {
            stateInit: _buildRefSystemInitData(owner),
            wid: address(this).wid,
            value: 0,
            bounce: true,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(_refSystemCode, version, _refLastPlatformCode, _refLastCode, _accountPlatformCode, _accountCode, _projectPlatformCode, _projectCode, systemFee, deployAccountGas, deployRefLastGas, deployWalletValue, sender, remainingGasTo);
    }

    function deployRefSystem(
        address owner,
        uint32 version,
        TvmCell refSystemCode,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 systemFee,
        uint128 deployAccountGas,
        uint128 deployRefLastGas,
        uint128 deployWalletValue,
        address sender,
        address remainingGasTo
    ) public onlyOwner returns (address) {
        return new RefSystemPlatform {
            stateInit: _buildRefSystemInitData(owner),
            wid: address(this).wid,
            value: 0,
            bounce: true,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(refSystemCode, version, refLastPlatformCode, refLastCode, accountPlatformCode, accountCode, projectPlatformCode, projectCode, systemFee, deployAccountGas, deployRefLastGas, deployWalletValue, sender, remainingGasTo);
    }

    function upgradeTarget(
        address[] targets,
        uint32 version,
        TvmCell code,
        address remainingGasTo
    ) public onlyManager returns (address) {
        uint128 res = msg.value - 0.3 ton;
        uint128 perUpgrade = res / uint128(targets.length);
        for (address target : targets) {
            IUpgradeable(target).acceptUpgrade{value: perUpgrade, flag: 0}(code, version, remainingGasTo);
        }

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
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