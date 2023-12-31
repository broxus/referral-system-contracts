pragma ton-solidity >= 0.57.0;

pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract RefLastPlatform {
    address static root;
    address static owner;

    constructor(TvmCell initCode, uint32 initVersion, address refFactory, address lastReferred, address lastReferrer, address sender, address remainingGasTo)
        public
        functionID(0x15A038FB)
    {   
        if (msg.sender == root) {
           initialize(initCode, initVersion, refFactory, lastReferred, lastReferrer, remainingGasTo);
        } else {
            remainingGasTo.transfer({
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED + MsgFlag.DESTROY_IF_ZERO,
                bounce: false
            });
        }
    }

    function _getExpectedAddress(address _owner) private view returns (address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: RefLastPlatform,
            varInit: {
                root: root,
                owner: _owner
            },
            pubkey: 0,
            code: tvm.code()
        });

        return address(tvm.hash(stateInit));
    }

    function initialize(TvmCell initCode, uint32 initVersion, address refFactory, address lastReferred, address lastReferrer, address remainingGasTo) private {
        
        TvmCell inputData = abi.encode(
            refFactory, 
            root,
            owner,
            uint32(0),
            initVersion,
            lastReferred,
            lastReferrer,
            remainingGasTo,
            tvm.code()
        );

        tvm.setcode(initCode);
        tvm.setCurrentCode(initCode);

        onCodeUpgrade(inputData);
    }

    function onCodeUpgrade(TvmCell data) private {}
}
