pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./RefLastPlatform.sol";
import "./RefSystemUpgradeable.sol";

contract RefLast {

    uint32 version_;
    TvmCell _platformCode;

    address public _root;

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
        require(msg.sender == _root, 400, "Must be root");
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

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        (_root,
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