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
        address refFactory,
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

        if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(sender) == msg.sender)) {
           initialize(initCode, initVersion, refFactory, projectFee, cashbackFee, feeDigits, sender, remainingGasTo);
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

    function initialize(TvmCell initCode, uint32 initVersion, address refFactory, uint16 projectFee, uint16 cashbackFee, uint16 feeDigits, address sender, address remainingGasTo) private {
        TvmCell inputData = abi.encode(
            refFactory,
            root,
            owner,
            uint32(0),
            initVersion,
            projectFee,
            cashbackFee,
            feeDigits,
            remainingGasTo,
            tvm.code()
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputData);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
