// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PayoutVault is Ownable {
    address public policyRegistry;
    address public triggerOracle;

    event Deposit(address indexed sender, uint256 amount);
    event PayoutExecuted(address indexed farmer, uint256 amount);
    
    constructor() Ownable(msg.sender) {}

    function setPolicyRegistry(address _policyRegistry) external onlyOwner {
        policyRegistry = _policyRegistry;
    }

    function setTriggerOracle(address _triggerOracle) external onlyOwner {
        triggerOracle = _triggerOracle;
    }

    // Accept ETH deposits from anyone (usually PolicyRegistry when premium is paid)
    function deposit() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function executePayout(address payable farmer, uint256 amount) external {
        require(msg.sender == triggerOracle, "Only TriggerOracle can execute payouts");
        require(address(this).balance >= amount, "Insufficient funds in vault");
        
        (bool success, ) = farmer.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit PayoutExecuted(farmer, amount);
    }

    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow owner or triggerOracle to refund premium on policy rejection
    function refundPremium(address payable farmer, uint256 amount) external {
        require(msg.sender == owner() || msg.sender == triggerOracle, "Not authorized to refund");
        require(address(this).balance >= amount, "Insufficient funds in vault");
        
        (bool success, ) = farmer.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit PayoutExecuted(farmer, amount); // Reusing event or we can add a new one, but let's stick to existing or emit Deposit reversed. Actually, emit PayoutExecuted is fine for trace, or let's just let it transfer.
    }

    // Allow direct ETH transfers to the vault
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
