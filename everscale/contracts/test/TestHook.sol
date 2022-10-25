pragma ton-solidity >= 0.57.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/IProxyHook.sol";

contract TestHook is IProxyHook {
    uint16 static _nonce;

    uint state;

    event StateChange(uint _state);
    event ReceivedEvent(TvmCell payload);

    constructor(uint _state) public {
        tvm.accept();

        setState(_state);
    }

    function onEventCompleted(TvmCell payload) override external {
        tvm.accept();
        emit ReceivedEvent(payload);
    }


    function setState(uint _state) public {
        tvm.accept();
        state = _state;

        emit StateChange(_state);
    }

    function getDetails()
        external
        view
    returns (
        uint _state
    ) {
        return state;
    }
}
