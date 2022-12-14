pragma ton-solidity >= 0.39.0;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IVersioned.sol";
import "./IUpgradeable.sol";

interface IRefLast is IVersioned, IUpgradeable{
    function meta() responsible external returns (
        address wallet,
        address referred,
        address referrer,
        uint128 reward,
        uint64 time);
}