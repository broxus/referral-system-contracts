pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract RefLastPlatform {
    address static root;

    constructor(TvmCell initCode, uint32 initVersion,address lastRefWallet, address lastReferred, address lastReferrer, uint128 lastRefReward, address sender, address remainingGasTo)
        public
        functionID(0x15A038FB)
    {   
        if (msg.sender == root) {
        // if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
           initialize(initCode, initVersion, lastRefWallet, lastReferred, lastReferrer, lastRefReward, remainingGasTo);
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
            contr: RefLastPlatform,
            varInit: {
                root: root
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, address lastRefWallet, address lastReferred, address lastReferrer, uint128 lastRefReward, address remainingGasTo) private {
        
        TvmCell inputData = abi.encode(
            root,
            uint32(0),
            initVersion,
            lastRefWallet,
            lastReferred,
            lastReferrer,
            lastRefReward,
            remainingGasTo,
            tvm.code()
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputData);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
