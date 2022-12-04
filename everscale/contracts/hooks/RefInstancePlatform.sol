pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract RefInstancePlatform {
    address static root;
    address static owner;

    constructor(TvmCell initCode, uint32 initVersion, address lastRef, uint128 lastRefReward, address sender, address remainingGasTo)
        public
        functionID(0x15A038FB)
    {   
        if (msg.sender == root) {
        // if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
           initialize(initCode, initVersion, lastRef, lastRefReward, remainingGasTo);
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
            contr: RefInstancePlatform,
            varInit: {
                root: root,
                owner: owner_
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, address lastRef, uint128 lastRefReward, address remainingGasTo) private {
        TvmBuilder builder;

        builder.store(root);
        builder.store(owner);
        builder.store(lastRef);
        builder.store(lastRefReward);
        // builder.store(uint32(0));
        // builder.store(initVersion);
        // builder.store(remainingGasTo);

        builder.store(tvm.code());

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {}
}
