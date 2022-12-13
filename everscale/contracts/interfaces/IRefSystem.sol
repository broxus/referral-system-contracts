pragma ton-solidity >= 0.39.0;

interface IRefSystem {
    function requestTransfer(
        address recipient,
        address tokenWallet,
        uint128 reward,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    ) external;

    function deployProject(
        address refSystem,
        uint128 projectFee,
        uint128 cashbackFee,
        address sender,
        address remainingGasTo
    ) external returns (address);
}