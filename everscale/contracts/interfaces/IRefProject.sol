pragma ton-solidity >= 0.39.0;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IVersioned.sol";
import "./IUpgradeable.sol";

interface IRefProject is IVersioned, IUpgradeable{
    function setProjectFee(uint128 fee) external;
    function setCashbackFee(uint128 fee) external;
    function setApproval(bool value) external;
    function meta(TvmCell payload) external responsible returns (bool isApproved, address projectOwner, uint128 cashbackFee, uint128 projectFee, TvmCell forwardedPayload);
    function onRefLastUpdate(address referred, address referrer, address remainingGasTo) external;
}