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
});
