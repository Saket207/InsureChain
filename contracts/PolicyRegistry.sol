// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyRegistry is Ownable {
    address public payoutVault;
    address public triggerOracle;

    struct Policy {
        string policyId;
        address farmerWallet;
        string district;
        string season;
        string[] triggersSelected;
        uint256 coverageAmount;
        uint256 premiumAmount;
        string status; // "Active", "PendingPayout", "PaidOut", "Expired"
        uint256 createdAt;
    }

    mapping(string => Policy) public policies;
    mapping(address => string[]) public farmerPolicies;

    event PolicyRegistered(string policyId, address indexed farmerWallet, uint256 premiumAmount, uint256 coverageAmount);
    event PolicyStatusUpdated(string policyId, string newStatus);

    constructor(address _payoutVault) Ownable(msg.sender) {
        payoutVault = _payoutVault;
    }

    function setTriggerOracle(address _triggerOracle) external onlyOwner {
        triggerOracle = _triggerOracle;
    }

    function registerPolicy(
        string memory policyId,
        string memory district,
        string memory season,
        string[] memory triggersSelected,
        uint256 coverageAmount
    ) external payable {
        require(msg.value > 0, "Premium must be greater than 0");
        require(bytes(policies[policyId].policyId).length == 0, "Policy already exists");

        // Forward premium to PayoutVault
        (bool success, ) = payoutVault.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success, "Failed to forward premium to vault");

        policies[policyId] = Policy({
            policyId: policyId,
            farmerWallet: msg.sender,
            district: district,
            season: season,
            triggersSelected: triggersSelected,
            coverageAmount: coverageAmount,
            premiumAmount: msg.value,
            status: "Active",
            createdAt: block.timestamp
        });

        farmerPolicies[msg.sender].push(policyId);

        emit PolicyRegistered(policyId, msg.sender, msg.value, coverageAmount);
    }

    function updatePolicyStatus(string memory policyId, string memory newStatus) external {
        require(msg.sender == triggerOracle, "Only TriggerOracle can update status");
        require(bytes(policies[policyId].policyId).length != 0, "Policy does not exist");
        
        policies[policyId].status = newStatus;
        emit PolicyStatusUpdated(policyId, newStatus);
    }

    function getPolicy(string memory policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    function getPoliciesByFarmer(address farmer) external view returns (string[] memory) {
        return farmerPolicies[farmer];
    }
}
