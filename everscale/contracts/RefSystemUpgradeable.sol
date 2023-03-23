pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IVersioned.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./RefLast.sol";
import "./RefLastPlatform.sol";
import "./ProjectPlatform.sol";

import "./interfaces/IRefSystemUpgradeable.sol";
import "./interfaces/IRefSystem.sol";
import "./interfaces/IUpgradeable.sol";


import "./abstract/RefSystemBase.sol";

contract RefSystemUpgradeable is RefSystemBase, IRefSystemUpgradeable {   
    constructor() public {
        revert();
    }

    function onDeployOrUpdate(
        TvmCell initCode,
        uint32 initVersion,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 systemFee,
        uint128 deployAccountValue,
        uint128 deployRefLastValue,
        uint128 deployWalletValue,
        address sender,
        address remainingGasTo,
        TvmCell
    ) 
    public
    functionID(0x15A038FB)
    {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        if (remainingGasTo.value != 0 && remainingGasTo != address(this)) {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.IGNORE_ERRORS,
                bounce: false
            });
        }
    }

    function supportsInterface(bytes4 interfaceID) override external view responsible returns (bool) {
        return { value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false } (
            interfaceID == bytes4(0x3204ec29) || // SID
            interfaceID == bytes4(
                tvm.functionId(IRefSystem.requestTransfer)^
                tvm.functionId(IRefSystem.deployProject)^
                tvm.functionId(IRefSystem.deriveProject)^
                tvm.functionId(IRefSystem.deriveRefAccount)^
                tvm.functionId(IRefSystem.deriveRefLast)^
                tvm.functionId(IRefSystem.setSystemFee)^
                tvm.functionId(IRefSystem.setDeployAccountGas)^
                tvm.functionId(IRefSystem.setDeployRefLastGas)^
                tvm.functionId(IRefSystem.onAcceptTokensTransferPayloadEncoder)^
                tvm.functionId(IRefSystem.setProjectApproval)^
                tvm.functionId(IRefSystem.updateRefLast)
            ) || // IRefSystem
            interfaceID == bytes4(
                tvm.functionId(IRefSystemUpgradeable.accountVersion)^
                tvm.functionId(IRefSystemUpgradeable.projectVersion)^
                tvm.functionId(IRefSystemUpgradeable.refLastVersion)^
                tvm.functionId(IRefSystemUpgradeable.platformCode)^
                tvm.functionId(IRefSystemUpgradeable.setProjectCode)^
                tvm.functionId(IRefSystemUpgradeable.setAccountCode)^
                tvm.functionId(IRefSystemUpgradeable.setRefLastCode)
            ) || // IRefSystemUpgradeable
            interfaceID == bytes4(tvm.functionId(IUpgradeable.acceptUpgrade)) || // IRefSystemUpgradeable
            interfaceID == bytes4(tvm.functionId(IAcceptTokensTransferCallback.onAcceptTokensTransfer)) // IAcceptTokensTransferCallback
        );
    }
    
    function version() override external view responsible returns (uint32) {
        return version_;
    }

    function accountVersion() override external view responsible returns (uint32) {
        return version_;
    }

    function refLastVersion() override external view responsible returns (uint32) {
        return version_;
    }

    function projectVersion() override external view responsible returns (uint32) {
        return version_;
    }

    function platformCode() override external view responsible returns (TvmCell) {
        return _platformCode;
    }

    function setAccountCode(TvmCell code) override external onlyOwner {
        _accountCode = code;
    }
    function setProjectCode(TvmCell code) override external onlyOwner {
        _projectCode = code;
    }
    function setRefLastCode(TvmCell code) override external onlyOwner {
        _refLastCode = code;
    }
    

    function acceptUpgrade(TvmCell code, uint32 currentVersion, address remainingGasTo) override external {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        TvmCell empty;
        TvmCell initData = abi.encode(
            _refFactory,
            owner,
            uint32(0),
            version_,
            _systemFee,
            _deployAccountGas,
            _deployRefLastGas,
            _deployWalletValue,
            msg.sender,
            remainingGasTo,
            _platformCode,
            _projectPlatformCode,
            _projectCode,
            _refLastPlatformCode,
            _refLastCode,
            _accountPlatformCode,
            _accountCode,
            empty
        );
        tvm.setcode(code);
        tvm.setCurrentCode(code);
        onCodeUpgrade(initData);
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(_reserve(), 2);
        tvm.resetStorage();

        uint32 oldVersion;
        address remainingGasTo;
        address sender;
        address owner;
        TvmCell custom;

        (_refFactory,
        owner,
        oldVersion,
        version_,
        _systemFee,
        _deployAccountGas,
        _deployRefLastGas,
        _deployWalletValue,
        sender,
        remainingGasTo,
        _platformCode,
        _projectPlatformCode,
        _projectCode,
        _refLastPlatformCode,
        _refLastCode,
        _accountPlatformCode,
        _accountCode,
        custom
        ) = abi.decode(data,(
            address,
            address,
            uint32,
            uint32, 
            uint128,
            uint128,
            uint128,
            uint128,
            address,
            address,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
            TvmCell,
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

}