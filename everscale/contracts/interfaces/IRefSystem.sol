pragma ton-solidity >= 0.39.0;

interface IRefSystem {
    function requestApproval(address projectOwner, address referrer, address referred, uint128 reward) external;
}