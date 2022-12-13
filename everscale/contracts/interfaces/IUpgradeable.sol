pragma ton-solidity >= 0.39.0;

interface IUpgradeable {
    function acceptUpgrade(TvmCell newCode, uint32 newVersion, address remainingGasTo) external;
}