pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract RefAccountPlatform {
    address static root;
    address static recipient;

    mapping (address => uint) tokenBalance;

    constructor(TvmCell initCode, uint32 initVersion, address walletRoot, uint128 reward, address sender, address remainingGasTo)
        public
        functionID(0x15A038FB)
    {   
        if (msg.sender == root) {
           initialize(initCode, initVersion, walletRoot, reward, remainingGasTo);
        } else {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.DESTROY_IF_ZERO,
                bounce: false
            });
        }
    }

    function _getExpectedAddress(address target) private view returns (address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: RefAccountPlatform,
            varInit: {
                root: root,
                recipient: target
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, address walletRoot, uint128 reward, address remainingGasTo) private {
        TvmBuilder builder;

        builder.store(root);
        builder.store(recipient);
        builder.store(walletRoot);
        builder.store(reward);
        // builder.store(initVersion);
        // builder.store(remainingGasTo);

        builder.store(tvm.code());

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {}
}