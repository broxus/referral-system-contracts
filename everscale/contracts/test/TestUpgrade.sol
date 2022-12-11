pragma ton-solidity >=0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

contract TestUpgrade {
    string public _isUpgraded;

    constructor() public {
        revert();
    }

    function onCodeUpgrade(TvmCell data) private {
        tvm.rawReserve(0, 2);
        tvm.resetStorage();
        tvm.accept();

        _isUpgraded = "true";
    }

}