pragma ton-solidity >= 0.39.0;

interface IRefSystem {
    function requestApproval(TvmCell payload) external responsible returns (TvmCell);
}