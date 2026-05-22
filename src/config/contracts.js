import { Contract } from 'ethers';
import deployedAddresses from './deployedAddresses.json';
import PayoutVaultABI from '../abi/PayoutVault.json';
import PolicyRegistryABI from '../abi/PolicyRegistry.json';
import TriggerOracleABI from '../abi/TriggerOracle.json';

export const CONTRACT_ADDRESSES = {
  PayoutVault: deployedAddresses.PayoutVault,
  PolicyRegistry: deployedAddresses.PolicyRegistry,
  TriggerOracle: deployedAddresses.TriggerOracle
};

export const CONTRACT_ABIS = {
  PayoutVault: PayoutVaultABI,
  PolicyRegistry: PolicyRegistryABI,
  TriggerOracle: TriggerOracleABI
};

export const getContracts = (signerOrProvider) => {
  return {
    PayoutVault: new Contract(CONTRACT_ADDRESSES.PayoutVault, CONTRACT_ABIS.PayoutVault, signerOrProvider),
    PolicyRegistry: new Contract(CONTRACT_ADDRESSES.PolicyRegistry, CONTRACT_ABIS.PolicyRegistry, signerOrProvider),
    TriggerOracle: new Contract(CONTRACT_ADDRESSES.TriggerOracle, CONTRACT_ABIS.TriggerOracle, signerOrProvider)
  };
};
