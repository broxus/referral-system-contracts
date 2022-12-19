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
        address sender,
        address remainingGasTo
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
            interfaceID == bytes4(0x3204ec29)   // SID
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

    // function requestUpgradeAccount(uint32 currentVersion, address accountOwner, address remainingGasTo) override external {
    //     require(msg.sender == _deriveRefAccount(accountOwner) || msg.sender == _refFactory || msg.sender == owner, 400);
        
    //     tvm.rawReserve(_reserve(), 0);

    //     if (currentVersion == version_) {
    //         remainingGasTo.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    //     } else {
    //         IUpgradeable(_deriveRefAccount(accountOwner)).acceptUpgrade{
    //             value: 0,
    //             flag: MsgFlag.ALL_NOT_RESERVED,
    //             bounce: false
    //         }(
    //             _accountCode,
    //             currentVersion,
    //             remainingGasTo
    //         );
    //     }
    // }

    // function requestUpgradeProject(uint32 currentVersion, uint256 projectId, address remainingGasTo) override external {
    //     require(msg.sender == _deriveProject(projectId) || msg.sender == _refFactory || msg.sender == owner, 400);
                
    //     tvm.rawReserve(_reserve(), 0);

    //     if (currentVersion == version_) {
    //         remainingGasTo.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    //     } else {
    //         IUpgradeable(_deriveProject(projectId)).acceptUpgrade{
    //             value: 0,
    //             flag: MsgFlag.ALL_NOT_RESERVED,
    //             bounce: false
    //         }(
    //             _projectCode,
    //             currentVersion,
    //             remainingGasTo
    //         );
    //     }
    // }

    // function requestUpgradeRefLast(uint32 currentVersion,address refLastOwner, address remainingGasTo) override external {
    //     require(msg.sender == _deriveRefLast(refLastOwner) || msg.sender == _refFactory || msg.sender == owner, 400);
                
    //     tvm.rawReserve(_reserve(), 0);

    //     if (currentVersion == version_) {
    //         remainingGasTo.transfer({ value: 0, flag: MsgFlag.ALL_NOT_RESERVED });
    //     } else {
    //         IUpgradeable(_deriveRefLast(refLastOwner)).acceptUpgrade{
    //             value: 0,
    //             flag: MsgFlag.ALL_NOT_RESERVED,
    //             bounce: false
    //         }(
    //             _refLastCode,
    //             currentVersion,
    //             remainingGasTo
    //         );
    //     }
    // }
    

    function acceptUpgrade(TvmCell code, uint32 currentVersion, address remainingGasTo) override external {
        require(msg.sender == _refFactory, 400, "Must be Ref Factory");
        TvmCell initData = abi.encode(
            _refFactory,
            owner,
            uint32(0),
            version_,
            _systemFee,
            _deployAccountValue,
            _deployRefLastValue,
            msg.sender,
            remainingGasTo,
            _platformCode,
            _projectPlatformCode,
            _projectCode,
            _refLastPlatformCode,
            _refLastCode,
            _accountPlatformCode,
            _accountCode
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

        (_refFactory,
        owner,
        oldVersion,
        version_,
        _systemFee,
        _deployAccountValue,
        _deployRefLastValue,
        sender,
        remainingGasTo,
        _platformCode,
        _projectPlatformCode,
        _projectCode,
        _refLastPlatformCode,
        _refLastCode,
        _accountPlatformCode,
        _accountCode
        ) = abi.decode(data,(
            address,
            address,
            uint32,
            uint32, 
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