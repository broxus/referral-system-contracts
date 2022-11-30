pragma ton-solidity >= 0.39.0;

interface IProjectCallback {
    function onRefferal(address referrer, address referred, uint128 reward) external;
    function onApproval(address referrer, address referred, uint128 reward) external;
}