// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/operatorforwarder/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

interface IPolicyRegistry {
    struct Policy {
        string policyId;
        address farmerWallet;
        string district;
        string season;
        string[] triggersSelected;
        uint256 coverageAmount;
        uint256 premiumAmount;
        string status;
        uint256 createdAt;
    }
    function getPolicy(string memory policyId) external view returns (Policy memory);
    function updatePolicyStatus(string memory policyId, string memory newStatus) external;
}

interface IPayoutVault {
    function executePayout(address payable farmer, uint256 amount) external;
}

contract TriggerOracle is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    address public policyRegistry;
    address public payoutVault;

    address private chainlinkOracle;
    bytes32 private jobId;
    uint256 private fee;

    bool public devMode = true;

    struct TriggerResult {
        string policyId;
        string triggerType;
        uint256 confidenceScore;
        bool fired;
        uint256 timestamp;
    }

    mapping(string => TriggerResult) public triggerResults;
    mapping(address => bool) public authorizedCallers;

    mapping(bytes32 => string) public requestIdToPolicyId;
    mapping(bytes32 => string) public requestIdToTriggerType;

    event TriggerRequested(bytes32 indexed requestId, string policyId, string district, int256 lat, int256 lon, string triggerType);
    event TriggerFulfilled(bytes32 indexed requestId, string policyId, uint256 fired, uint256 confidenceScore);
    event TriggerFired(string policyId, string triggerType, uint256 confidenceScore);
    event TriggerNotFired(string policyId, string triggerType, uint256 confidenceScore);
    event PayoutInitiated(string policyId, address farmerWallet, uint256 amount);

    constructor(address _policyRegistry, address _payoutVault) ConfirmedOwner(msg.sender) {
        policyRegistry = _policyRegistry;
        payoutVault = _payoutVault;

        // Default Sepolia settings for Chainlink
        _setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        // User needs to update these with their node's specific details
        // chainlinkOracle = YOUR_ORACLE_ADDRESS;
        // jobId = YOUR_JOB_ID;
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    function setOracleDetails(address _oracle, bytes32 _jobId, uint256 _fee) external onlyOwner {
        chainlinkOracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    function requestTriggerCheck(
        string memory policyId,
        string memory district,
        int256 lat,
        int256 lon,
        string memory triggerType
    ) external returns (bytes32 requestId) {
        // Build the Chainlink request
        Chainlink.Request memory req = _buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillTriggerRequest.selector
        );

        // Add parameters for the adapter
        req._add("policyId", policyId);
        req._add("district", district);
        req._addInt("lat", lat);
        req._addInt("lon", lon);
        req._add("triggerType", triggerType);

        // Send the request and store the mapping
        requestId = _sendChainlinkRequestTo(chainlinkOracle, req, fee);
        requestIdToPolicyId[requestId] = policyId;
        requestIdToTriggerType[requestId] = triggerType;

        emit TriggerRequested(requestId, policyId, district, lat, lon, triggerType);
    }

    function fulfillTriggerRequest(
        bytes32 requestId,
        bytes memory data
    ) public recordChainlinkFulfillment(requestId) {
        (uint256 fired, uint256 confidenceScore) = abi.decode(data, (uint256, uint256));

        string memory policyId = requestIdToPolicyId[requestId];
        string memory triggerType = requestIdToTriggerType[requestId];

        emit TriggerFulfilled(requestId, policyId, fired, confidenceScore);

        triggerResults[policyId] = TriggerResult({
            policyId: policyId,
            triggerType: triggerType,
            confidenceScore: confidenceScore,
            fired: fired == 1,
            timestamp: block.timestamp
        });

        if (fired == 1) {
            IPolicyRegistry registry = IPolicyRegistry(policyRegistry);
            IPolicyRegistry.Policy memory policy = registry.getPolicy(policyId);
            
            require(bytes(policy.policyId).length != 0, "Policy not found");
            
            // Basic protection to prevent double payouts
            require(
                keccak256(bytes(policy.status)) != keccak256(bytes("PaidOut")) && 
                keccak256(bytes(policy.status)) != keccak256(bytes("PendingPayout")), 
                "Payout already processed"
            );

            // Update status
            registry.updatePolicyStatus(policyId, "PendingPayout");

            // Execute payout
            IPayoutVault(payoutVault).executePayout(payable(policy.farmerWallet), policy.coverageAmount);
            
            // Mark as completely paid out if vault succeeds
            registry.updatePolicyStatus(policyId, "PaidOut");

            emit PayoutInitiated(policyId, policy.farmerWallet, policy.coverageAmount);
            emit TriggerFired(policyId, triggerType, confidenceScore);
        } else {
            emit TriggerNotFired(policyId, triggerType, confidenceScore);
        }
    }

    // Maintained for backward compatibility and testing
    function manualTrigger(string memory policyId, string memory triggerType) external {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Not authorized");
        require(devMode, "Manual trigger disabled in production");
        
        triggerResults[policyId] = TriggerResult({
            policyId: policyId,
            triggerType: triggerType,
            confidenceScore: 100,
            fired: true,
            timestamp: block.timestamp
        });

        IPolicyRegistry registry = IPolicyRegistry(policyRegistry);
        IPolicyRegistry.Policy memory policy = registry.getPolicy(policyId);
        
        require(bytes(policy.policyId).length != 0, "Policy not found");
        
        require(
            keccak256(bytes(policy.status)) != keccak256(bytes("PaidOut")) && 
            keccak256(bytes(policy.status)) != keccak256(bytes("PendingPayout")), 
            "Payout already processed"
        );

        registry.updatePolicyStatus(policyId, "PendingPayout");
        IPayoutVault(payoutVault).executePayout(payable(policy.farmerWallet), policy.coverageAmount);
        registry.updatePolicyStatus(policyId, "PaidOut");

        emit PayoutInitiated(policyId, policy.farmerWallet, policy.coverageAmount);
        emit TriggerFired(policyId, triggerType, 100);
    }

    function setDevMode(bool _devMode) external onlyOwner {
        devMode = _devMode;
    }

    function getTriggerResult(string memory policyId) external view returns (TriggerResult memory) {
        return triggerResults[policyId];
    }
}
