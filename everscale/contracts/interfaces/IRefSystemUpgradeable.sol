pragma ton-solidity >= 0.39.0;

import "./IRefSystem.sol";

interface IRefSystemUpgradeable is IRefSystem {
    function accountVersion() external view responsible returns (uint32);
    function projectVersion() external view responsible returns (uint32);
    function refLastVersion() external view responsible returns (uint32);
    
    function platformCode() external view responsible returns (TvmCell);

    function requestUpgradeAccount(uint32 currentVersion, address accountOwner, address remainingGasTo) external;
    function requestUpgradeProject(uint32 currentVersion, address projectOwner, address remainingGasTo) external;
    
    function setProjectCode(TvmCell code) external;
    function setAccountCode(TvmCell code) external;
    function setRefLastCode(TvmCell code) external;

    function upgrade(TvmCell code) external;
}