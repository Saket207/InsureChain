import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PayoutVault
  const payoutVault = await hre.ethers.deployContract("PayoutVault");
  await payoutVault.waitForDeployment();
  const payoutVaultAddress = await payoutVault.getAddress();
  console.log("PayoutVault deployed to:", payoutVaultAddress);

  // Deploy PolicyRegistry
  const policyRegistry = await hre.ethers.deployContract("PolicyRegistry", [payoutVaultAddress]);
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("PolicyRegistry deployed to:", policyRegistryAddress);

  // Deploy TriggerOracle
  const triggerOracle = await hre.ethers.deployContract("TriggerOracle", [policyRegistryAddress, payoutVaultAddress]);
  await triggerOracle.waitForDeployment();
  const triggerOracleAddress = await triggerOracle.getAddress();
  console.log("TriggerOracle deployed to:", triggerOracleAddress);

  // Post-deployment setup
  console.log("Setting up contract permissions...");
  
  await (await payoutVault.setPolicyRegistry(policyRegistryAddress)).wait();
  await (await payoutVault.setTriggerOracle(triggerOracleAddress)).wait();
  
  await (await policyRegistry.setTriggerOracle(triggerOracleAddress)).wait();
  
  await (await triggerOracle.setAuthorizedCaller(deployer.address, true)).wait();
  
  console.log("Permissions setup complete.");

  // Export addresses and ABIs
  const deployedAddresses = {
    PayoutVault: payoutVaultAddress,
    PolicyRegistry: policyRegistryAddress,
    TriggerOracle: triggerOracleAddress
  };

  const configDir = path.join(__dirname, "../src/config");
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "deployedAddresses.json"),
    JSON.stringify(deployedAddresses, null, 2)
  );

  // Copy ABIs
  const abiDir = path.join(__dirname, "../src/abi");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
  
  const contracts = ["PayoutVault", "PolicyRegistry", "TriggerOracle"];
  contracts.forEach(contractName => {
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const artifact = require(artifactPath);
    fs.writeFileSync(
      path.join(abiDir, `${contractName}.json`),
      JSON.stringify(artifact.abi, null, 2)
    );
  });
  
  console.log("Exported addresses and ABIs to frontend src/config and src/abi");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
