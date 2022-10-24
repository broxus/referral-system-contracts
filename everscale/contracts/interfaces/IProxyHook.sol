pragma ton-solidity >= 0.39.0;

interface IProxyHook {
    function onEventCompleted(TvmCell payload) external;
}