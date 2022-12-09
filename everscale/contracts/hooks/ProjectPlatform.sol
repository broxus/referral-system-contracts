pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract ProjectPlatform {
    address static root;
    address static owner;
    
    constructor(
        TvmCell initCode,
        uint32 initVersion,
        address refSystem,
        uint16 projectFee,
        uint16 cashbackFee,
        uint16 feeDigits,
        address sender,
        address remainingGasTo
    )
        public
        functionID(0x15A038FB)
    {   
        tvm.accept();

        if (msg.sender == owner || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
           initialize(initCode, initVersion, projectFee, cashbackFee, feeDigits, sender, remainingGasTo);
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
            contr: ProjectPlatform,
            varInit: {
                root: root,
                owner: owner_
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, uint16 projectFee, uint16 cashbackFee, uint16 feeDigits, address sender, address remainingGasTo) private {
        TvmBuilder builder;

        builder.store(root); // _refSystem
        builder.store(owner);
        builder.store(uint32(0)); // oldVersion
        builder.store(initVersion); // initVersion
        builder.store(projectFee);
        builder.store(cashbackFee);
        builder.store(feeDigits);
        builder.store(remainingGasTo);

        builder.store(tvm.code());

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(builder.toCell());
    }

    function onCodeUpgrade(TvmCell data) private {}
}
