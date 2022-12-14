pragma ton-solidity >= 0.39.0;

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";

interface IRefSystem is IAcceptTokensTransferCallback {
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

    function deriveProject(address owner) external responsible returns (address);
    function deriveRefAccount(address owner) external responsible returns (address);
    function deriveRefLast(address owner) external responsible returns (address);

    function setSystemFee(uint128 fee) external;
    function setDeployAccountValue(uint128 value) external;
    function setDeployRefLastValue(uint128 value) external;
    function onAcceptTokensTransferPayloadEncoder(address projectOwner, address referred, address referrer) responsible external returns (TvmCell);
    function approveProject(address projectOwner) external;
}