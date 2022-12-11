pragma ton-solidity >=0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "../interfaces/IProjectCallback.sol";
import "../interfaces/IRefSystem.sol";
import "@broxus/contracts/contracts/utils/RandomNonce.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

contract ProjectCellEncoder {
  constructor() public {
    tvm.accept();
  }

  function encode(
    uint32 initVersion,
    address refSystem,
    address refAuthority,
    uint16 projectFee,
    uint16 cashbackFee,
    uint16 feeDigits,
    address sender,
    address remainingGasTo
  ) external returns (TvmCell) {
    return abi.encode(
        initVersion, 
        refSystem, 
        refAuthority, 
        projectFee, 
        cashbackFee, 
        feeDigits, 
        sender, 
        remainingGasTo);
  }
}
