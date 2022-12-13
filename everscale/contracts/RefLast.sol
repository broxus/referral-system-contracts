pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./RefLastPlatform.sol";
import "./RefSystemUpgradeable.sol";
import "./interfaces/IUpgradeable.sol";

contract RefLast is IUpgradeable{

    uint32 version_;
    TvmCell _platformCode;

    address public _refSystem;

    address public _lastReferrer;
    address public _lastReferred;
    address public _lastRefWallet;
    uint128 public _lastRefReward;
    uint64 public _lastRefUpdate;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address lastRefWallet, address lastReferred, address lastReferrer, uint128 lastRefReward, address sender, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be RefSystem");
        _lastRefWallet = lastRefWallet;
        _lastReferred = lastReferred;
        _lastReferrer = lastReferrer;
        _lastRefReward = lastRefReward;
        _lastRefUpdate = block.timestamp;

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function meta() responsible external returns (address wallet, address referred, address referrer, uint128 reward, uint64 time) {
        wallet = _lastRefWallet;
        referred = _lastReferred;
        referrer = _lastReferrer;
        reward = _lastRefReward;
        time = _lastRefUpdate;
    }

    function _reserve() internal returns (uint128) {
        return 0;
    }

    function platformCode() external view responsible returns (TvmCell) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } _platformCode;
    }

    function _buildRefLastInitData(address root) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefLastPlatform,
            varInit: {
                root: root
            },
            pubkey: 0,
            code: _platformCode
        });
    }

    function acceptUpgrade(TvmCell newCode, uint32 newVersion, address remainingGasTo) override external {
        require(msg.sender == _refSystem, 400, "Must be Ref System");
        if (version_ == newVersion) {
            tvm.rawReserve(_reserve(), 0);
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        } else {
            TvmCell inputData = abi.encode(
                _refSystem,
                version_,
                newVersion,
                _lastRefWallet,
                _lastReferred,
                _lastReferrer,
                _lastRefReward,
                remainingGasTo,
                _platformCode
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
        (_refSystem,
        oldVersion,
        version_,
        _lastRefWallet,
        _lastReferred,
        _lastReferrer,
        _lastRefReward,
        remainingGasTo,
        _platformCode
        ) = abi.decode(data,(address,uint32,uint32,address,address,address,uint128,address,TvmCell));

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }
}