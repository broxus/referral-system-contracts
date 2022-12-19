pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenRoot.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import '@broxus/contracts/contracts/access/InternalOwner.sol';

import "./interfaces/IRefSystem.sol";
import "./RefAccountPlatform.sol";
import "./interfaces/IUpgradeable.sol";


contract RefAccount is InternalOwner, IUpgradeable {

    mapping (address => uint128) public _tokenBalance;

    uint32 public version_;
    TvmCell public _platformCode;

    address public _refSystem;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell initCode, uint32 initVersion, address tokenWallet, uint128 reward, address sender, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be root");
        _tokenBalance[tokenWallet] += reward;
        
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
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } _platformCode;
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
                owner: target
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
                // _refFactory,
                _refSystem,
                owner,
                version_,
                newVersion,
                _tokenBalance,
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

        address firstWallet;
        uint128 firstReward;
        address newOwner;
        (
            _refSystem,
            newOwner,
            version_,
            firstWallet,
            firstReward,
            _platformCode
        ) = abi.decode(data,(
            address,
            address,
            uint32,
            address,
            uint128,
            TvmCell
        ));

        setOwnership(newOwner);
        _tokenBalance[firstWallet] = firstReward;

    }

    function requestTransfer(
        address tokenWallet,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) public onlyOwner {
        uint128 amount = _tokenBalance[tokenWallet];
        delete _tokenBalance[tokenWallet];
        IRefSystem(_refSystem).requestTransfer{flag: MsgFlag.REMAINING_GAS}(owner, tokenWallet, amount, remainingGasTo, notify, payload);
    }

}