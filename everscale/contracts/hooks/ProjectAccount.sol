pragma ton-solidity >= 0.39.0;
pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

contract ProjectAccount {
    address static project;
    address static recipient;

    mapping (address => uint) tokenBalance;

    constructor() public {
        tvm.accept();
    }

    
}