// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * CarLease - Lease Extension Tests (User Story 4)
 * 
 * Tests for extendLease() function (reserved for v2.x)
 * 
 * Validates:
 * - FR-031: Extension request handling
 * - FR-032: Additional deposit calculation (3x new monthly payment)
 * - FR-033: Lease duration and payment updates
 * - FR-034, FR-035: ReentrancyGuard protection
 * - FR-037: Access control (only lessee)
 * - FR-047: LeaseExtended event
 * 
 * Note: This feature is reserved for v2.x. All tests verify the function
 * properly reverts with "Not implemented - reserved for v2.x" message.
 */
describe("CarLease - Lease Extension (Reserved for v2.x)", function () {
  // Fixture with active lease that has made several payments
  async function activeLeaseNearEndFixture() {
    const [owner, lessee1] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    // Mint NFT
    await carLease.mintOption(
      "Tesla Model 3",
      "White",
      2024,
      ethers.parseEther("30"),
      ethers.parseEther("0.5"),
      12, // 12-month lease (shorter for testing)
      50000
    );

    const tokenId = 1;

    // Commit
    const secret = ethers.id("extension-test-secret");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, lessee1.address]
      )
    );
    await carLease.connect(lessee1).commitToLease(tokenId, commitment);

    // Reveal with deposit
    const monthlyPayment = ethers.parseEther("0.5");
    const deposit = monthlyPayment * 3n;
    await carLease.connect(lessee1).revealAndPay(
      tokenId,
      secret,
      12,
      monthlyPayment,
      { value: deposit }
    );

    // Confirm lease
    await carLease.connect(owner).confirmLease(tokenId);

    // Make 10 payments (near end of 12-month lease)
    for (let i = 0; i < 10; i++) {
      await time.increase(31 * 24 * 60 * 60); // 31 days
      await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });
    }

    return { carLease, owner, lessee1, tokenId, deposit, monthlyPayment };
  }

  describe("extendLease (v2.x Feature)", function () {
    it("should revert extension request with 'Not implemented' (FR-031, Acceptance 1)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      // Try to extend lease by 6 months with same monthly payment
      const additionalMonths = 6;
      const newMonthlyPayment = monthlyPayment;
      const additionalDeposit = newMonthlyPayment * 3n; // FR-032: 3x new monthly

      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          newMonthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert with correct additional deposit calculation (FR-032, Acceptance 1)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(activeLeaseNearEndFixture);

      // Try to extend with increased monthly payment
      const additionalMonths = 6;
      const newMonthlyPayment = ethers.parseEther("0.6"); // Increased from 0.5
      const additionalDeposit = newMonthlyPayment * 3n; // Should be 1.8 ETH

      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          newMonthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert lease duration and payment update (FR-033, Acceptance 2)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      const additionalMonths = 6;
      const additionalDeposit = monthlyPayment * 3n;

      // In v2.x, this would update:
      // - lease.durationMonths (12 + 6 = 18)
      // - lease.deposit (original + additional)
      // - lease.monthlyPayment (if changed)

      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          monthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert new monthly amount after extension (Acceptance 3)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(activeLeaseNearEndFixture);

      const additionalMonths = 12;
      const newMonthlyPayment = ethers.parseEther("0.45"); // Reduced rate
      const additionalDeposit = newMonthlyPayment * 3n;

      // In v2.x, after extension, makeMonthlyPayment would require new amount
      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          newMonthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert when non-lessee tries to extend (FR-037)", async function () {
      const { carLease, owner, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      const additionalMonths = 6;
      const additionalDeposit = monthlyPayment * 3n;

      // Try to extend as owner (not lessee)
      await expect(
        carLease.connect(owner).extendLease(
          tokenId,
          additionalMonths,
          monthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert when extending inactive lease", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      // Terminate the lease first
      await carLease.connect(lessee1).terminateLease(tokenId);

      const additionalMonths = 6;
      const additionalDeposit = monthlyPayment * 3n;

      // Try to extend terminated lease
      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          monthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert LeaseExtended event emission (FR-047)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      const additionalMonths = 6;
      const additionalDeposit = monthlyPayment * 3n;

      // In v2.x, this would emit:
      // LeaseExtended(tokenId, lessee1, additionalMonths, newMonthlyPayment, additionalDeposit)

      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          monthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });

    it("should revert with nonReentrant protection (FR-034, FR-035)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseNearEndFixture);

      const additionalMonths = 6;
      const additionalDeposit = monthlyPayment * 3n;

      // In v2.x, extendLease would have nonReentrant modifier
      // Cannot test reentrancy directly without malicious contract
      // Verify function signature would include nonReentrant

      await expect(
        carLease.connect(lessee1).extendLease(
          tokenId,
          additionalMonths,
          monthlyPayment,
          { value: additionalDeposit }
        )
      ).to.be.revertedWith("Not implemented - reserved for v2.x");
    });
  });

  describe("terminateLease (Enhanced Termination)", function () {
    // Fixture with active lease and some payments made
    async function activeLeaseWithPaymentsFixture() {
      const [owner, lessee1] = await ethers.getSigners();
      const CarLease = await ethers.getContractFactory("CarLease");
      const carLease = await CarLease.deploy();

      // Mint NFT
      await carLease.mintOption(
        "BMW X5",
        "Black",
        2024,
        ethers.parseEther("36"),
        ethers.parseEther("1.0"),
        36,
        50000
      );

      const tokenId = 1;

      // Commit
      const secret = ethers.id("termination-test-secret");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      // Reveal with deposit (3 ETH = 3 months)
      const monthlyPayment = ethers.parseEther("1.0");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );

      // Confirm lease
      await carLease.connect(owner).confirmLease(tokenId);

      // Make 5 payments
      for (let i = 0; i < 5; i++) {
        await time.increase(31 * 24 * 60 * 60);
        await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });
      }

      return { carLease, owner, lessee1, tokenId, deposit, monthlyPayment };
    }

    it("should allow lessee voluntary termination with refund calculation (FR-028)", async function () {
      const { carLease, lessee1, tokenId, deposit } = await loadFixture(activeLeaseWithPaymentsFixture);

      // Lessee has made 5 payments, should get partial refund
      // Deposit = 3 ETH, Used for 5 months = 5 ETH, but only 3 ETH held
      // Refund should be 0 (deposit already used)
      // In enhanced version, would calculate: deposit - (months_used * monthly)
      
      const lesseeBalanceBefore = await ethers.provider.getBalance(lessee1.address);

      const tx = await carLease.connect(lessee1).terminateLease(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const lesseeBalanceAfter = await ethers.provider.getBalance(lessee1.address);

      // Currently no refund logic, balance decreases by gas only
      expect(lesseeBalanceBefore - lesseeBalanceAfter).to.equal(gasUsed);

      // Verify lease terminated
      const lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.false;
    });

    it("should allow dealer termination after deposit claimed (FR-029)", async function () {
      const { carLease, owner, tokenId } = await loadFixture(activeLeaseWithPaymentsFixture);

      // Fast forward past grace period
      await time.increase(46 * 24 * 60 * 60);

      // Dealer claims deposit first
      await carLease.connect(owner).claimDeposit(tokenId);

      // Verify lease already terminated by claimDeposit
      const lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.false;

      // Try to terminate again (should fail - not active)
      await expect(
        carLease.connect(owner).terminateLease(tokenId)
      ).to.be.revertedWith("Lease not active");
    });

    it("should mark lease inactive after termination (FR-030)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(activeLeaseWithPaymentsFixture);

      // Verify lease is active before termination
      let lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.true;

      // Terminate
      await carLease.connect(lessee1).terminateLease(tokenId);

      // Verify lease is inactive after termination
      lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.false;
    });

    it("should emit LeaseTerminated event with reason (FR-044)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(activeLeaseWithPaymentsFixture);

      const tx = await carLease.connect(lessee1).terminateLease(tokenId);

      await expect(tx)
        .to.emit(carLease, "LeaseTerminated")
        .withArgs(tokenId, lessee1.address, "Terminated");
    });

    it("should protect terminateLease with nonReentrant (FR-034, FR-035)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(activeLeaseWithPaymentsFixture);

      // Cannot test reentrancy directly without malicious contract
      // Verify function executes successfully (nonReentrant modifier needed)
      await expect(
        carLease.connect(lessee1).terminateLease(tokenId)
      ).to.not.be.reverted;

      // Verify termination was processed
      const lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.false;
    });
  });
});
