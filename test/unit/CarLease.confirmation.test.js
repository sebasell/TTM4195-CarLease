const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - Confirmation (FR-019, FR-020, FR-022)", function () {
  // Fixture with revealed lease (pending confirmation)
  async function revealedLeaseFixture() {
    const [owner, lessee1] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    // Mint NFT
    await carLease.mintOption(
      "Tesla Model 3",
      "Blue",
      2024,
      ethers.parseEther("30"),
      ethers.parseEther("0.5"),
      36,
      50000
    );

    const tokenId = 1;

    // Commit
    const secret = ethers.id("my-secret-12345");
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
      36,
      monthlyPayment,
      { value: deposit }
    );

    return { carLease, owner, lessee1, tokenId };
  }

  describe("confirmLease", function () {
    it("should confirm lease and activate it (FR-019)", async function () {
      const { carLease, owner, tokenId } = await loadFixture(revealedLeaseFixture);

      const tx = await carLease.connect(owner).confirmLease(tokenId);

      const lease = await carLease.leases(tokenId);
      expect(lease.active).to.be.true;
      expect(lease.startTime).to.be.greaterThan(0);
    });

    it("should emit LeaseConfirmed event (FR-042)", async function () {
      const { carLease, owner, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      const tx = await carLease.connect(owner).confirmLease(tokenId);

      await expect(tx)
        .to.emit(carLease, "LeaseConfirmed");
        // Event emits: tokenId, lessee, startTime
    });

    it("should revert if non-owner tries to confirm (FR-037)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      await expect(
        carLease.connect(lessee1).confirmLease(tokenId)
      ).to.be.revertedWithCustomError(carLease, "OwnableUnauthorizedAccount");
    });

    it("should revert if lease not revealed (FR-020)", async function () {
      const { carLease, owner } = await loadFixture(revealedLeaseFixture);

      // Try to confirm non-existent lease
      const nonExistentTokenId = 999;

      await expect(
        carLease.connect(owner).confirmLease(nonExistentTokenId)
      ).to.be.revertedWith("Lease does not exist");
    });

    it("should revert if already confirmed (FR-022)", async function () {
      const { carLease, owner, tokenId } = await loadFixture(revealedLeaseFixture);

      // First confirmation
      await carLease.connect(owner).confirmLease(tokenId);

      // Try to confirm again
      await expect(
        carLease.connect(owner).confirmLease(tokenId)
      ).to.be.revertedWith("Already confirmed");
    });
  });

  describe("Edge Cases", function () {
    it("should allow dealer to confirm after deadline (Edge Case 8)", async function () {
      const { carLease, owner, tokenId } = await loadFixture(revealedLeaseFixture);

      // Fast forward past 7-day confirmation deadline
      await time.increase(8 * 24 * 60 * 60);

      // Dealer can still confirm (no deadline enforcement for dealer)
      // Customer can also claim refund at this point
      await expect(
        carLease.connect(owner).confirmLease(tokenId)
      ).to.not.be.reverted;

      const lease = await carLease.getLease(tokenId);
      expect(lease.active).to.be.true;
    });
  });
});
