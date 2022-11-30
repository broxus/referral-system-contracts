pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/IProjectCallback.sol";
import "../interfaces/IRefSystem.sol";
import "./ProjectAccount.sol";
import '@broxus/contracts/contracts/utils/RandomNonce.sol';


contract Project is IProjectCallback, RandomNonce {
    address public _refSystem;
    address public _refAuthority;

    uint16 public _projectFee; 
    uint16 public _cashbackFee;
    uint16 public _feeDigits;
    TvmCell public _accountCode;

    constructor(address refSystem, address refAuthority, uint16 projectFee, uint16 cashbackFee, uint16 feeDigits) public {
        tvm.accept();
        _refSystem = refSystem;
        _refAuthority = refAuthority;
        _projectFee = projectFee;
        _cashbackFee = cashbackFee;
        _feeDigits = feeDigits;
        // _accountCode = accountCode;
    }
    

    function onRefferal(address referrer, address referred, uint128 reward) override external {
        require(msg.sender == _refAuthority, 400, 'Must be RefAuthority');
        require(msg.value >= reward, 402, "Must Provide Reward");

        IRefSystem(_refSystem).requestApproval{value: reward, flag: 0}(referrer, referred, reward);
    }

    function onApproval(address referrer, address referred, uint128 reward) override external {
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

    onBounce(TvmSlice slice) external {
        uint32 selector = slice.decode(uint32);

        if (
            selector == tvm.functionId(IRefSystem.requestApproval) &&
            msg.sender == _refSystem
        ) {
            
            (,, uint128 reward) = slice.decode(address, address, uint128);
            // TODO
            _refAuthority.transfer(reward, false, 0);
        }
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