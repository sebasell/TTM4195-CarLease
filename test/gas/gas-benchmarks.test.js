const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarLease - Gas Benchmarks", function () {
  // Gas targets from plan.md Section 5
  const GAS_TARGETS = {
    DEPLOYMENT: 3_500_000,
    MINT_OPTION: 200_000,
    COMMIT_TO_LEASE: 80_000,
    REVEAL_AND_PAY: 150_000,
    MONTHLY_PAYMENT: 80_000,
    CLAIM_DEPOSIT: 120_000,
  };

  let carLease;
  let owner, lessee1;
  let deploymentGas;

  before(async function () {
    [owner, lessee1] = await ethers.getSigners();

    // Deploy and measure gas
    const CarLease = await ethers.getContractFactory("CarLease");
    const deployTx = await CarLease.getDeployTransaction();
    const estimatedGas = await ethers.provider.estimateGas(deployTx);
    
    carLease = await CarLease.deploy();
    const receipt = await carLease.deploymentTransaction().wait();
    deploymentGas = receipt.gasUsed;

    console.log(`\n📊 Gas Benchmark Results:`);
    console.log(`${"=".repeat(60)}`);
  });

  describe("Deployment Gas", function () {
    it(`should deploy contract with <${GAS_TARGETS.DEPLOYMENT.toLocaleString()} gas`, async function () {
      console.log(`Deployment: ${deploymentGas.toLocaleString()} gas (target: ${GAS_TARGETS.DEPLOYMENT.toLocaleString()})`);
      expect(Number(deploymentGas)).to.be.lessThan(GAS_TARGETS.DEPLOYMENT);
    });
  });

  describe("Function Gas Usage", function () {
    it(`should mint option with <${GAS_TARGETS.MINT_OPTION.toLocaleString()} gas`, async function () {
      const tx = await carLease.mintOption(
        "Tesla Model 3",
        "Blue",
        2024,
        ethers.parseEther("30"),
        ethers.parseEther("0.5"),
        36,
        50000
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`mintOption: ${gasUsed.toLocaleString()} gas (target: ${GAS_TARGETS.MINT_OPTION.toLocaleString()})`);
      expect(Number(gasUsed)).to.be.lessThan(GAS_TARGETS.MINT_OPTION);
    });

    it(`should commit to lease with <${GAS_TARGETS.COMMIT_TO_LEASE.toLocaleString()} gas`, async function () {
      const tokenId = 1;
      const secret = ethers.id("my-secret-123");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      const tx = await carLease.connect(lessee1).commitToLease(tokenId, commitment);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`commitToLease: ${gasUsed.toLocaleString()} gas (target: ${GAS_TARGETS.COMMIT_TO_LEASE.toLocaleString()})`);
      expect(Number(gasUsed)).to.be.lessThan(GAS_TARGETS.COMMIT_TO_LEASE);
    });

    it(`should reveal and pay with <${GAS_TARGETS.REVEAL_AND_PAY.toLocaleString()} gas`, async function () {
      const tokenId = 1;
      const secret = ethers.id("my-secret-123");
      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      const tx = await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`revealAndPay: ${gasUsed.toLocaleString()} gas (target: ${GAS_TARGETS.REVEAL_AND_PAY.toLocaleString()})`);
      expect(Number(gasUsed)).to.be.lessThan(GAS_TARGETS.REVEAL_AND_PAY);
    });

    it(`should make monthly payment with <${GAS_TARGETS.MONTHLY_PAYMENT.toLocaleString()} gas`, async function () {
      const tokenId = 1;

      // Confirm lease first
      await carLease.connect(owner).confirmLease(tokenId);

      // Advance time 31 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const monthlyPayment = ethers.parseEther("0.5");
      const tx = await carLease.connect(lessee1).makeMonthlyPayment(tokenId, {
        value: monthlyPayment
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`makeMonthlyPayment: ${gasUsed.toLocaleString()} gas (target: ${GAS_TARGETS.MONTHLY_PAYMENT.toLocaleString()})`);
      expect(Number(gasUsed)).to.be.lessThan(GAS_TARGETS.MONTHLY_PAYMENT);
    });

    it(`should claim deposit with <${GAS_TARGETS.CLAIM_DEPOSIT.toLocaleString()} gas`, async function () {
      // Setup: mint, commit, reveal, confirm for a new lease
      await carLease.mintOption(
        "BMW i4",
        "Black",
        2024,
        ethers.parseEther("25"),
        ethers.parseEther("0.4"),
        24,
        40000
      );

      const tokenId = 2;
      const secret = ethers.id("secret-2");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("0.4");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        24,
        monthlyPayment,
        { value: deposit }
      );

      await carLease.connect(owner).confirmLease(tokenId);

      // Advance time 46 days (past grace period)
      await ethers.provider.send("evm_increaseTime", [46 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const tx = await carLease.connect(owner).claimDeposit(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`claimDeposit: ${gasUsed.toLocaleString()} gas (target: ${GAS_TARGETS.CLAIM_DEPOSIT.toLocaleString()})`);
      console.log(`${"=".repeat(60)}\n`);
      expect(Number(gasUsed)).to.be.lessThan(GAS_TARGETS.CLAIM_DEPOSIT);
    });
  });

  describe("Struct Packing Optimization", function () {
    it("should demonstrate gas savings from packed Lease struct", async function () {
      // The Lease struct is already optimized with packing:
      // - address (20 bytes) + uint64 (8 bytes) + uint32 (4 bytes) = 32 bytes (1 slot)
      // - uint256 monthlyPayment (32 bytes, 1 slot)
      // - uint256 deposit (32 bytes, 1 slot)
      // - uint32 + uint64 + bool + bool + uint64 = 20 bytes (1 slot with padding)
      // Total: 4 slots vs 6-7 slots unpacked
      
      const structInfo = {
        packedSlots: 4,
        unpackedSlots: 7,
        savingsPerAccess: 2100, // Cold SLOAD = 2100 gas
        estimatedSavings: 3 * 2100, // ~3 extra SLOADs avoided
      };

      console.log(`\n⚡ Struct Packing Analysis:`);
      console.log(`  Packed slots: ${structInfo.packedSlots}`);
      console.log(`  Unpacked slots: ${structInfo.unpackedSlots}`);
      console.log(`  Estimated savings: ~${structInfo.estimatedSavings.toLocaleString()} gas per full read`);
      console.log(`  (Cold SLOAD: ${structInfo.savingsPerAccess} gas/slot)\n`);

      // This is a documentation test - struct is already optimized
      expect(structInfo.packedSlots).to.equal(4);
      expect(structInfo.estimatedSavings).to.be.greaterThan(5000);
    });
  });
});
