pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract ProjectPlatform {
    address static root;
    uint256 static id;
    
    constructor(
        TvmCell initCode,
        uint32 initVersion,
        address refFactory,
        address owner,
        uint128 projectFee,
        uint128 cashbackFee,
        address sender,
        address remainingGasTo
    )
        public
        functionID(0x15A038FB)
    {   
        tvm.accept();

        if (msg.sender == root || (sender.value != 0 && _getExpectedAddress(id) == msg.sender)) {
           initialize(initCode, initVersion, refFactory, owner, projectFee, cashbackFee, sender, remainingGasTo);
        } else {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.DESTROY_IF_ZERO,
                bounce: false
            });
        }
    }

    function _getExpectedAddress(uint256 target) private view returns (address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: ProjectPlatform,
            varInit: {
                root: root,
                id: target
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, address refFactory, address owner, uint128 projectFee, uint128 cashbackFee, address sender, address remainingGasTo) private {
        TvmCell inputData = abi.encode(
            refFactory,
            root,
            id,
            owner,
            uint32(0),
            initVersion,
            projectFee,
            cashbackFee,
            remainingGasTo,
            tvm.code()
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputData);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
