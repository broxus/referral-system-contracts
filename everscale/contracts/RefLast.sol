pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./RefLastPlatform.sol";
import "./RefSystemUpgradeable.sol";
import "./interfaces/IUpgradeable.sol";
import "./interfaces/IRefLast.sol";

contract RefLast is IRefLast {

    uint32 version_;
    TvmCell _platformCode;

    address public _refFactory;
    address public _refSystem;
    address public _owner;

    address public _lastReferrer;
    address public _lastReferred;
    uint64 public _lastRefUpdate;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address, address lastReferred, address lastReferrer, address sender, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be RefSystem");
        tvm.rawReserve(_reserve(), 0);
        
        _lastReferred = lastReferred;
        _lastReferrer = lastReferrer;
        _lastRefUpdate = block.timestamp;

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function version() override external view responsible returns (uint32) {
        return version_;
    }

    function meta() override responsible external returns (address referred, address referrer, uint64 time) {
        referred = _lastReferred;
        referrer = _lastReferrer;
        time = _lastRefUpdate;
    }

    function _reserve() internal returns (uint128) {
        return 0.02 ton;
    }

    function platformCode() external view responsible returns (TvmCell) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } _platformCode;
    }

    function _buildRefLastInitData(address root, address owner) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefLastPlatform,
            varInit: {
                root: root,
                owner: owner
            },
            pubkey: 0,
            code: _platformCode
        });
    }

    function acceptUpgrade(TvmCell newCode, uint32 newVersion, address remainingGasTo) override external {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        if (version_ == newVersion) {
            tvm.rawReserve(_reserve(), 0);
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        } else {
            TvmCell inputData = abi.encode(
                _refFactory,
                _refSystem,
                _owner,
                version_,
                newVersion,
                _lastReferred,
                _lastReferrer,
                remainingGasTo,
                _platformCode
            );

            tvm.setcode(newCode);
            tvm.setCurrentCode(newCode);
            onCodeUpgrade(inputData);
        }
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 0);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        (_refFactory,
        _refSystem,
        _owner,
        oldVersion,
        version_,
        _lastReferred,
        _lastReferrer,
        remainingGasTo,
        _platformCode
        ) = abi.decode(data,(address,address,address,uint32,uint32,address,address,address,TvmCell));

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }
}