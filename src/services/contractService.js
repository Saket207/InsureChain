import { ethers } from 'ethers';
import { getContracts } from '../config/contracts';

export { getContracts };

export const registerPolicyOnChain = async (signer, policyData, premiumETH) => {
  const contracts = getContracts(signer);
  
  // Safe string conversion to avoid scientific notation
  const premiumStr = Number(premiumETH).toFixed(18).replace(/\.?0+$/, "");
  const coverageStr = Number(policyData.coverageAmount).toFixed(18).replace(/\.?0+$/, "");

  console.log("Deploying with:", { premiumStr, coverageStr, policyId: policyData.policyId });

  const premiumInWei = ethers.parseEther(premiumStr);
  const coverageInWei = ethers.parseEther(coverageStr);

  const tx = await contracts.PolicyRegistry.registerPolicy(
    policyData.policyId,
    policyData.district,
    policyData.season,
    policyData.triggersSelected,
    coverageInWei,
    { 
      value: premiumInWei,
      gasLimit: 1000000 // Force a high enough gas limit
    }
  );

  await tx.wait();
  return tx.hash;
};

export const manualTriggerForTesting = async (signer, policyId, triggerType) => {
  const contracts = getContracts(signer);
  const tx = await contracts.TriggerOracle.manualTrigger(policyId, triggerType);
  await tx.wait();
  return tx.hash;
};

export const getVaultBalance = async (provider) => {
  const contracts = getContracts(provider);
  // In ethers v6, the contract address is accessible via .target
  const address = contracts.PayoutVault.target;
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
};

export const getPolicyOnChain = async (provider, policyId) => {
  const contracts = getContracts(provider);
  const policy = await contracts.PolicyRegistry.getPolicy(policyId);
  return policy;
};

export const getPoliciesOnChain = async (provider, farmerAddress) => {
  const contracts = getContracts(provider);
  const policies = await contracts.PolicyRegistry.getPoliciesByFarmer(farmerAddress);
  return policies;
};

export const isContractOwner = async (provider, address) => {
  const contracts = getContracts(provider);
  const owner = await contracts.PolicyRegistry.owner();
  return owner.toLowerCase() === address.toLowerCase();
};

export const getOracleRequests = async (provider, policyId) => {
  try {
    const contracts = getContracts(provider);
    const filter = contracts.TriggerOracle.filters.TriggerRequested(null, policyId);
    const events = await contracts.TriggerOracle.queryFilter(filter, -1000);
    return events.map(e => ({
      requestId: e.args.requestId,
      policyId: e.args.policyId,
      district: e.args.district,
      triggerType: e.args.triggerType,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash
    }));
  } catch (error) {
    console.error("Error fetching oracle requests:", error);
    return [];
  }
};

export const getOracleFulfillments = async (provider, policyId) => {
  try {
    const contracts = getContracts(provider);
    const filter = contracts.TriggerOracle.filters.TriggerFulfilled(null, policyId);
    const events = await contracts.TriggerOracle.queryFilter(filter, -1000);
    return events.map(e => ({
      requestId: e.args.requestId,
      policyId: e.args.policyId,
      fired: Number(e.args.fired),
      confidenceScore: Number(e.args.confidenceScore),
      blockNumber: e.blockNumber,
      txHash: e.transactionHash
    }));
  } catch (error) {
    console.error("Error fetching oracle fulfillments:", error);
    return [];
  }
};

export const getLinkBalance = async (provider, oracleAddress) => {
  try {
    const LINK_TOKEN_SEPOLIA = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
    const linkAbi = ['function balanceOf(address) view returns (uint256)'];
    const link = new ethers.Contract(LINK_TOKEN_SEPOLIA, linkAbi, provider);
    const balance = await link.balanceOf(oracleAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error fetching LINK balance:", error);
    return "0";
  }
};
