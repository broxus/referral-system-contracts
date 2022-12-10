pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "./RefAccountPlatform.sol";

contract RefAccount {

    mapping (address => uint) public _tokenBalance;

    uint32 public version_;
    TvmCell public platformCode_;

    address public _refSystem;
    address public _recipient;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address walletRoot, uint128 reward, address, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be root");
        _tokenBalance[walletRoot] += reward;
        
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function _reserve() internal returns (uint128) {
        return 0;
    }

    function platformCode() external view responsible returns (TvmCell) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } platformCode_;
    }

    function deriveRef(address target) external returns (address) {
        return _deriveRef(target);
    }

    function _deriveRef(address target) internal returns (address) {
       return address(tvm.hash(_buildRefInitData(target)));
    }

    function _buildRefInitData(address target) internal returns (TvmCell) {
        return tvm.buildStateInit({
            contr: RefAccountPlatform,
            varInit: {
                root: _refSystem,
                recipient: target
            },
            pubkey: 0,
            code: platformCode_
        });
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        TvmSlice s = data.toSlice();
        address firstWalletRoot;
        uint128 firstReward;

        (_refSystem, _recipient, firstWalletRoot, firstReward) = s.decode(
            address,
            address,
            address,
            uint128
        );

        platformCode_ = s.loadRef();
    }
}