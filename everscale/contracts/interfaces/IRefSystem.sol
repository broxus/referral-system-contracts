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

    function deriveProject(uint256 id) external responsible returns (address);
    function deriveRefAccount(address owner) external responsible returns (address);
    function deriveRefLast(address owner) external responsible returns (address);

    function setSystemFee(uint128 fee) external;
    function setDeployAccountGas(uint128 gas) external;
    function setDeployRefLastGas(uint128 gas) external;
    function setWalletDeployValue(uint128 value) external;
    
    function onAcceptTokensTransferPayloadEncoder(uint256 projectId, address referred, address referrer) responsible external returns (TvmCell);
    function setProjectApproval(uint256 projectId, bool value) external;
    function updateRefLast(uint256 projectId, address referred, address referrer, address remainingGasTo) external;
}