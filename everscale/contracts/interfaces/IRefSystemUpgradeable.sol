pragma ton-solidity >= 0.39.0;

import "./IRefSystem.sol";
import "./IUpgradeable.sol";

interface IRefSystemUpgradeable is IUpgradeable, IRefSystem {
    function accountVersion() external view responsible returns (uint32);
    function projectVersion() external view responsible returns (uint32);
    function refLastVersion() external view responsible returns (uint32);
    
    function platformCode() external view responsible returns (TvmCell);

    function setProjectCode(TvmCell code) external;
    function setAccountCode(TvmCell code) external;
    function setRefLastCode(TvmCell code) external;
}