pragma ton-solidity >=0.39.0;

import "../interfaces/IProxyHook.sol";
import "@broxus/contracts/contracts/utils/RandomNonce.sol";

contract TestHook is IProxyHook, RandomNonce {
  event RawTestEvent(TvmCell payload);
  uint256 public recievedEvents;

  constructor() public {
    tvm.accept();
  }

  function onEventCompleted(TvmCell payload) override external {
    tvm.accept();
    recievedEvents += 1;
    emit RawTestEvent(payload);
  }

  
}
