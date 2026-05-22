import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("InsureChain Contracts", function () {
  let payoutVault, policyRegistry, triggerOracle;
  let owner, farmer, otherAccount;

  beforeEach(async function () {
    [owner, farmer, otherAccount] = await ethers.getSigners();

    const PayoutVault = await ethers.getContractFactory("PayoutVault");
    payoutVault = await PayoutVault.deploy();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy(await payoutVault.getAddress());

    const TriggerOracle = await ethers.getContractFactory("TriggerOracle");
    triggerOracle = await TriggerOracle.deploy(await policyRegistry.getAddress(), await payoutVault.getAddress());

    // Setup permissions
    await payoutVault.setPolicyRegistry(await policyRegistry.getAddress());
    await payoutVault.setTriggerOracle(await triggerOracle.getAddress());
    await policyRegistry.setTriggerOracle(await triggerOracle.getAddress());
    await triggerOracle.setAuthorizedCaller(owner.address, true);
  });

  describe("End-to-End Flow", function () {
    it("Should register a policy, deposit premium, and execute payout on trigger", async function () {
      const policyId = "INS-123";
      const premiumAmount = ethers.parseEther("0.1");
      const coverageAmount = ethers.parseEther("1.0");

      // Register Policy
      await policyRegistry.connect(farmer).registerPolicy(
        policyId,
        "Nagpur",
        "Kharif",
        ["drought"],
        coverageAmount,
        { value: premiumAmount }
      );

      // Verify Policy exists
      const policy = await policyRegistry.getPolicy(policyId);
      expect(policy.farmerWallet).to.equal(farmer.address);
      expect(policy.status).to.equal("Active");

      // Verify Vault received premium
      const vaultBalance = await payoutVault.getVaultBalance();
      expect(vaultBalance).to.equal(premiumAmount);

      // Fund vault with extra ETH to cover payout
      await owner.sendTransaction({
        to: await payoutVault.getAddress(),
        value: ethers.parseEther("2.0")
      });

      // Execute Trigger
      const initialFarmerBalance = await ethers.provider.getBalance(farmer.address);
      
      const tx = await triggerOracle.manualTrigger(policyId, "drought");
      await tx.wait();

      // Verify Policy Status updated
      const updatedPolicy = await policyRegistry.getPolicy(policyId);
      expect(updatedPolicy.status).to.equal("PaidOut");

      // Verify Payout received by farmer
      const finalFarmerBalance = await ethers.provider.getBalance(farmer.address);
      expect(finalFarmerBalance).to.be.gt(initialFarmerBalance);
    });
  });
});
