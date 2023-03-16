pragma ton-solidity >=0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import '@broxus/contracts/contracts/utils/RandomNonce.sol';
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract GasUtil is RandomNonce {

  constructor() public {
    tvm.accept();
  }

  function GetGasToValue(uint128 gas) external view returns (uint128 value) {
    return gasToValue(gas, address(this).wid);
  }

  function GetValueToGas(uint128 value) external view returns (uint128 gas) {
    return valueToGas(value, address(this).wid);
  } 

}
