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


contract RefAccount is IUpgradeable {

    mapping (address => uint128) public _tokenBalance;

    uint32 public version_;
    TvmCell public _platformCode;
    address public owner;

    uint128 public _gasOnDeploy;
    address public _refFactory;
    address public _refSystem;

    constructor() public {
        revert();
    }

    modifier onlyOwner {
        require(msg.sender == owner, 400, "Must Be Owner");
        _;
    }

    function onDeployOrUpdate(TvmCell initCode, uint32 initVersion, address refFactory, address tokenWallet, uint128 reward, address sender, uint128 gasOnDeploy, address remainingGasTo) 
    external
    functionID(0x15A038FB)
    {
        require(msg.sender == _refSystem, 400, "Must be root");
        _tokenBalance[tokenWallet] += reward;
        tvm.rawReserve(_reserve(), 2);
        
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function _reserve() internal returns (uint128) {
        // return 0;
        return gasToValue(_gasOnDeploy, address(this).wid);
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
                owner,
                version_,
                newVersion,
                _tokenBalance,
                _gasOnDeploy,
                remainingGasTo,
                _platformCode
            );

            tvm.setcode(newCode);
            tvm.setCurrentCode(newCode);
            onCodeUpgrade(inputData);
        }
    }
    
    function onCodeUpgrade(TvmCell data) private {
        tvm.resetStorage();

        address firstWallet;
        uint128 firstReward;
        address remainingGasTo;

        (
            _refFactory,
            _refSystem, 
            owner,
            version_,
            firstWallet,
            firstReward,
            _gasOnDeploy,
            remainingGasTo,
            _platformCode
        ) = abi.decode(data,(
            address,
            address,
            address,
            uint32,
            address,
            uint128,
            uint128,
            address,
            TvmCell
        ));

        _tokenBalance[firstWallet] = firstReward;

        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            tvm.rawReserve(_reserve(), 2);

            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function requestTransfer(
        address tokenWallet,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) public onlyOwner {
        uint128 amount = _tokenBalance[tokenWallet];
        require(amount > 0);
        require(msg.value >= _reserve());
        tvm.rawReserve(_reserve(), 0);

        delete _tokenBalance[tokenWallet];
        IRefSystem(_refSystem).requestTransfer{flag: MsgFlag.ALL_NOT_RESERVED, value: 0}(owner, tokenWallet, amount, remainingGasTo, notify, payload);
    }

}