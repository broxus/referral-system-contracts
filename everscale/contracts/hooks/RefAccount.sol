pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./../modules/TokenContracts/interfaces/ITokenRoot.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import '@broxus/contracts/contracts/access/InternalOwner.sol';

// import "./RefSystemBase.sol";
import "./RefAccountPlatform.sol";

contract RefAccount is InternalOwner {

    mapping (address => uint) public _tokenBalance;

    uint32 public version_;
    TvmCell public _platformCode;

    address public _refSystem;

    constructor() public {
        revert();
    }

    function onDeployOrUpdate(TvmCell, uint32, address tokenWallet, uint128 reward, address, address remainingGasTo) 
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

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        address firstWalletRoot;
        uint128 firstReward;
        address owner;
        (
            _refSystem,
            owner,
            firstWalletRoot,
            firstReward,
            _platformCode
        ) = abi.decode(data,(
            address,
            address,
            address,
            uint128,
            TvmCell
        ));

        setOwnership(owner);
    }

    // function requestTransfer(
    //     address tokenWallet,
    //     address remainingGasTo,
    //     bool notify,
    //     TvmCell payload
    // ) public onlyOwner {
    //     // TODO: Auth tokenWallet?
    //     RefSystemBase(_refSystem).requestTransfer(owner, tokenWallet, _tokenBalance[tokenWallet], remainingGasTo, notify, payload);
    // }
}