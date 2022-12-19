pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import '@broxus/contracts/contracts/access/InternalOwner.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IVersioned.sol";

import "./interfaces/IRefSystem.sol";
import "./interfaces/IUpgradeable.sol";
import "./interfaces/IRefSystemUpgradeable.sol";
import "./interfaces/IRefProject.sol";

contract Project is InternalOwner, IRefProject {

    uint128 constant BPS = 1_000_000;

    uint32 public version_;
    TvmCell public _platformCode;

    address public _refFactory;
    address public _refSystem; // root
    uint256 public _id; // id
    bool public _isApproved;

    uint128 public _projectFee; 
    uint128 public _cashbackFee;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address, address, uint128, uint128, address sender, address remainingGasTo) 
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

    function version() override external view responsible returns (uint32) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } version_;
    }

    function setProjectFee(uint128 fee) override external onlyOwner {
        require(fee < BPS, 500, "Invalid Parameter");
        _projectFee = fee;
    }

    function setCashbackFee(uint128 fee) override external onlyOwner {
        require(fee < BPS, 500, "Invalid Parameter");
        _cashbackFee = fee;
    }

    function upgrade(address remainingGasTo) override external onlyOwner {
        IRefSystemUpgradeable(_refSystem).requestUpgradeProject{ value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false }(
            version_,
            _id,
            remainingGasTo
        );
    }

    function acceptUpgrade(TvmCell newCode, uint32 newVersion, address remainingGasTo) override external {
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

        address owner;
        uint32 oldVersion;
        address remainingGasTo;
        (
            _refFactory,
            _refSystem,
            _id,
            owner,
            oldVersion,
            version_,
            _projectFee,
            _cashbackFee,
            remainingGasTo,
            _platformCode
        ) = abi.decode(data, (
            address,
            address,
            uint256,
            address,
            uint32,
            uint32,
            uint128,
            uint128,
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

    function acceptInit() override external {
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

    function meta(TvmCell payload) override view external responsible returns (bool, address, uint128, uint128, TvmCell) {
        return {value: 0, flag: MsgFlag.ALL_NOT_RESERVED}(_isApproved, owner, _cashbackFee, _projectFee, payload);
    }
}