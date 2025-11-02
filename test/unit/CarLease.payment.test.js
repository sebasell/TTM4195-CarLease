const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - Monthly Payment (FR-013 to FR-017)", function () {
  // Fixture with active lease (confirmed)
  async function activeLeaseFixture() {
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

    // Confirm lease
    await carLease.connect(owner).confirmLease(tokenId);

    return { carLease, owner, lessee1, tokenId, monthlyPayment };
  }

  describe("makeMonthlyPayment", function () {
    it("should accept monthly payment with correct amount (FR-013, FR-014)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Fast forward 31 days (past first month)
      await time.increase(31 * 24 * 60 * 60);

      const balanceBefore = await ethers.provider.getBalance(await carLease.getAddress());

      await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

      const balanceAfter = await ethers.provider.getBalance(await carLease.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(monthlyPayment);

      const lease = await carLease.leases(tokenId);
      expect(lease.paymentsMade).to.equal(1);
    });

    it("should emit MonthlyPaid event (FR-043)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      await time.increase(31 * 24 * 60 * 60);

      const tx = await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

      await expect(tx)
        .to.emit(carLease, "MonthlyPaid");
        // Event emits: tokenId, lessee, paymentNumber, amount, timestamp
    });

    it("should revert on incorrect payment amount (FR-014)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      await time.increase(31 * 24 * 60 * 60);

      const wrongAmount = monthlyPayment / 2n;

      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: wrongAmount })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("should revert if payment not due (FR-015)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Try to pay immediately without waiting a month
      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment })
      ).to.be.revertedWith("Payment not due");
    });

    it("should allow payment within 45-day grace period (FR-016)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Fast forward 60 days (past due but within grace)
      await time.increase(60 * 24 * 60 * 60);

      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment })
      ).to.not.be.reverted;
    });

    it("should terminate lease after grace period (FR-017)", async function () {
      const { carLease, owner, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Fast forward 80 days (past 45-day grace period)
      await time.increase(80 * 24 * 60 * 60);

      // Contract owner can terminate for non-payment
      await expect(
        carLease.connect(owner).terminateLease(tokenId)
      ).to.not.be.reverted;

      const lease = await carLease.leases(tokenId);
      expect(lease.active).to.be.false;
    });

    it("should increment monthsPaid counter (FR-014)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Make 3 monthly payments
      for (let i = 1; i <= 3; i++) {
        await time.increase(31 * 24 * 60 * 60);
        await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

        const lease = await carLease.leases(tokenId);
        expect(lease.paymentsMade).to.equal(i);
      }
    });
  });

  describe("Edge Cases", function () {
    it("should allow payment after lease term if payment is due (Edge Case 3)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Make first payment
      await time.increase(31 * 24 * 60 * 60);
      await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

      // Fast forward beyond lease term (36 months)
      // After 36 months from start, expectedPayments would be 36
      // With only 1 payment made, more payments are still "due" even though lease term expired
      await time.increase(36 * 31 * 24 * 60 * 60);

      // Payment should be accepted (catch-up payment)
      // The contract doesn't enforce "end date", only tracks expected vs actual payments
      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment })
      ).to.not.be.reverted;

      const lease = await carLease.leases(tokenId);
      expect(lease.paymentsMade).to.equal(2);
    });

    it("should allow payment exactly at grace period deadline (Edge Case 4)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Fast forward exactly 45 days (grace period deadline)
      await time.increase(45 * 24 * 60 * 60);

      // Payment should still be accepted (within grace period)
      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment })
      ).to.not.be.reverted;

      const lease = await carLease.leases(tokenId);
      expect(lease.paymentsMade).to.equal(1);
    });

    it("should revert payment with wrong amount (Edge Case 10)", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      await time.increase(31 * 24 * 60 * 60);

      // Try to pay wrong amount (too much)
      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment + 1n })
      ).to.be.revertedWith("Incorrect payment amount");

      // Try to pay wrong amount (too little)
      await expect(
        carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment - 1n })
      ).to.be.revertedWith("Incorrect payment amount");
    });
  });
});
