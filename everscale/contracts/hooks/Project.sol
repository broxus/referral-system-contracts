pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/IProjectCallback.sol";
import "../interfaces/IRefSystem.sol";
import "./ProjectAccount.sol";
import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract Project is IProjectCallback {

    uint32 version_;
    TvmCell platformCode_;

    address public _refSystem; // root
    address public _owner;
    bool public _isApproved;

    uint16 public _projectFee; 
    uint16 public _cashbackFee;
    uint16 public _feeDigits;
    TvmCell public _platformCode;

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

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        (
            _refSystem,
            _owner,
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
            uint32,
            uint32,
            uint16,
            uint16,
            uint16,
            address,
            TvmCell
        ));

        // _platformCode = s.loadRef();

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

    function onRefferal(address referrer, address referred, uint128 reward) approved override external {
        require(msg.value >= reward, 402, "Must Provide Reward");
        IRefSystem(_refSystem).requestApproval{value: reward - 0.1 ton, flag: 0}(_owner, referrer, referred, reward);
    }

    function onApproval(address referrer, address referred, uint128 reward) approved override external {
        require(msg.sender == _refSystem, 400, 'Must be RefSystem');
        
        uint128 forProject = (reward*_projectFee)/_feeDigits;
        uint128 forReferred = (reward*_cashbackFee)/_feeDigits;
        uint128 forReferrer = msg.value - forProject - forReferred;
        
        // Keep for Project // original_balance + forProject;
        tvm.rawReserve(forProject - 0.1 ton, 4);
        // Send Reward
        referrer.transfer(forReferrer, false, 0);
        // Send Cashback
        referred.transfer(forReferred, false, 0);
    }

    // function deriveAccount(address recipient) external responsible returns (address) {
    //    return _deriveAccount(recipient);
    // }

    // function _deriveAccount(address recipient) internal returns (address) {
    //    return address(tvm.hash(_buildAccountInitData(recipient)));
    // }

    // function deployAccount(address recipient, address parent, TvmCell eventData) internal returns (address) {
    //     return new ProjectAccount {
    //         stateInit: _buildAccountInitData(recipient),
    //         value: 3 ton,
    //         flag: 0
    //         // flag: MsgFlag.ALL_NOT_RESERVED
    //     }(parent, eventData);
    // }

    // function deployEmptyAccount() external returns (address) {
    //     TvmCell empty;
    //     return deployAccount(msg.sender, address(0), empty);
    // }

    // function _buildAccountInitData(address recipient) internal returns (TvmCell) {
    //     return tvm.buildStateInit({
    //         contr: ProjectAccount,
    //         varInit: {
    //             recipient: recipient,
    //             project: address(this)
    //         },
    //         pubkey: 0,
    //         code: _accountCode
    //     });
    // }

}