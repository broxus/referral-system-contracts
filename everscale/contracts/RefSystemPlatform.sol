pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";

import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/CheckPubKey.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

import "./RefLast.sol";
import "./RefLastPlatform.sol";
import "./ProjectPlatform.sol";
import "./Project.sol";

import "./interfaces/IRefSystem.sol";

contract RefSystemPlatform {
    address static root;
    address static owner;
    
    constructor(
        TvmCell initCode,
        uint32 initVersion,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 systemFee,
        uint128 deployAccountGas,
        uint128 deployRefLastGas,
        uint128 deployWalletValue,
        address sender,
        address remainingGasTo,
        TvmCell custom
    )
        public
        functionID(0x15A038FB)
    {   

        if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
            initialize(
                initCode,
                initVersion,
                refLastPlatformCode,
                refLastCode,
                accountPlatformCode,
                accountCode,
                projectPlatformCode,
                projectCode,
                systemFee,
                deployAccountGas,
                deployRefLastGas,
                deployWalletValue,
                sender,
                remainingGasTo,
                custom
            );
        } else {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.DESTROY_IF_ZERO,
                bounce: false
            });
        }
    }

    function _getExpectedAddress(address owner_) private view returns (address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: RefSystemPlatform,
            varInit: {
                root: root,
                owner: owner_
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(
        TvmCell initCode,
        uint32 initVersion,
        TvmCell refLastPlatformCode,
        TvmCell refLastCode,
        TvmCell accountPlatformCode,
        TvmCell accountCode,
        TvmCell projectPlatformCode,
        TvmCell projectCode,
        uint128 systemFee,
        uint128 deployAccountGas,
        uint128 deployRefLastGas,
        uint128 deployWalletValue,
        address sender,
        address remainingGasTo,
        TvmCell custom
    ) private {

        TvmCell inputCell = abi.encode(
            root,
            owner,
            uint32(0),
            initVersion,
            systemFee,
            deployAccountGas,
            deployRefLastGas,
            deployWalletValue,
            sender,
            remainingGasTo,
            tvm.code(),
            projectPlatformCode,
            projectCode,
            refLastPlatformCode,
            refLastCode,
            accountPlatformCode,
            accountCode,
            custom
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputCell);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
