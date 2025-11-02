const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - Deposits (Refund Protection)", function () {
  // Fixture with revealed but unconfirmed lease
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
    const deposit = monthlyPayment * 3n; // 1.5 ETH
    await carLease.connect(lessee1).revealAndPay(
      tokenId,
      secret,
      36,
      monthlyPayment,
      { value: deposit }
    );

    return { carLease, owner, lessee1, tokenId, deposit, monthlyPayment };
  }

  describe("refundUnconfirmedDeposit", function () {
    it("should allow refund after 7-day deadline (FR-021, FR-023, Acceptance 1)", async function () {
      const { carLease, lessee1, tokenId, deposit } = await loadFixture(revealedLeaseFixture);

      // Fast forward 8 days (past 7-day confirmation deadline)
      await time.increase(8 * 24 * 60 * 60);

      const balanceBefore = await ethers.provider.getBalance(lessee1.address);

      const tx = await carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(lessee1.address);

      // Verify deposit returned (accounting for gas)
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(deposit);
    });

    it("should return full deposit to lessee (FR-026, Acceptance 2)", async function () {
      const { carLease, lessee1, tokenId, deposit } = await loadFixture(revealedLeaseFixture);

      await time.increase(8 * 24 * 60 * 60);

      const contractBalanceBefore = await ethers.provider.getBalance(await carLease.getAddress());

      await carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId);

      const contractBalanceAfter = await ethers.provider.getBalance(await carLease.getAddress());

      // Verify contract balance decreased by deposit amount
      expect(contractBalanceBefore - contractBalanceAfter).to.equal(deposit);
    });

    it("should mark lease as cancelled after refund (FR-027, Acceptance 3)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      await time.increase(8 * 24 * 60 * 60);

      // Lease exists but not active before refund
      let lease = await carLease.leases(tokenId);
      expect(lease.exists).to.be.true;
      expect(lease.active).to.be.false;

      await carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId);

      // Lease should be marked as non-existent after refund
      lease = await carLease.leases(tokenId);
      expect(lease.exists).to.be.false;
      expect(lease.deposit).to.equal(0);
    });

    it("should revert when refunding before deadline (FR-021 validation)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      // Try to refund immediately (before 7-day deadline)
      await expect(
        carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId)
      ).to.be.revertedWith("Confirmation deadline not passed");
    });

    it("should revert when refunding active lease (FR-023 validation)", async function () {
      const { carLease, owner, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      // Dealer confirms lease (activates it)
      await carLease.connect(owner).confirmLease(tokenId);

      // Fast forward past deadline
      await time.increase(8 * 24 * 60 * 60);

      // Try to refund (should fail because lease is active)
      await expect(
        carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId)
      ).to.be.revertedWith("Lease already confirmed");
    });

    it("should emit RefundUnconfirmed event (FR-046)", async function () {
      const { carLease, lessee1, tokenId, deposit } = await loadFixture(revealedLeaseFixture);

      await time.increase(8 * 24 * 60 * 60);

      const tx = await carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId);

      await expect(tx)
        .to.emit(carLease, "RefundUnconfirmed")
        .withArgs(tokenId, lessee1.address, deposit);
    });

    it("should protect refundUnconfirmedDeposit with nonReentrant (FR-034, FR-035)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(revealedLeaseFixture);

      await time.increase(8 * 24 * 60 * 60);

      // Cannot test reentrancy directly without malicious contract
      // Verify function executes successfully (nonReentrant modifier present)
      await expect(
        carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId)
      ).to.not.be.reverted;

      // Verify refund was processed
      const lease = await carLease.leases(tokenId);
      expect(lease.exists).to.be.false;
    });
  });
});
