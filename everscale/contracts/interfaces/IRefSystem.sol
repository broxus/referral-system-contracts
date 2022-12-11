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
}