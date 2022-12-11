pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/IProjectCallback.sol";
import "../interfaces/IRefSystem.sol";
import "../interfaces/IUpgradeable.sol";

import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import '@broxus/contracts/contracts/access/InternalOwner.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";


contract Project is InternalOwner, IUpgradeable {

    uint32 public version_;
    TvmCell public _platformCode;

    address public _refFactory;
    address public _refSystem; // root
    bool public _isApproved;

    uint16 public _projectFee; 
    uint16 public _cashbackFee;
    uint16 public _feeDigits;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address, address, uint16, uint16, uint16, address sender, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be root");
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function acceptUpgrade(TvmCell newCode, TvmCell newParams, uint32 newVersion, address remainingGasTo) override external {
        require(msg.sender == _refSystem || msg.sender == _refFactory, 400, "Must be Ref System");
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
                owner,
                _isApproved,
                version_,
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

        address owner;
        uint32 oldVersion;
        address remainingGasTo;
        (
            _refFactory,
            _refSystem,
            owner,
            oldVersion,
            version_,
            _projectFee,
            _cashbackFee,
            _feeDigits,
            remainingGasTo,
            _platformCode
        ) = abi.decode(data, (
            address,
            address,
            address,
            uint32,
            uint32,
            uint16,
            uint16,
            uint16,
            address,
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

    function acceptInit() public {
        require(msg.sender == _refSystem, 400, "Must be RefSystem");
        _isApproved = true;
    }


    modifier approved() {
        require(_isApproved, 500, "Must Be Approved");
        _;
    }

    function _reserve() private returns (uint128) {
        return 0;
    }

    function meta(TvmCell payload) view external responsible returns (bool, uint128, uint128, TvmCell) {
        return (_isApproved, _cashbackFee, _projectFee, payload);
    }
}