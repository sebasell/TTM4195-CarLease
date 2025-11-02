const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - View Functions", function () {
  // Fixture with active lease
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

  describe("getCarMetadata", function () {
    it("should return complete car metadata", async function () {
      const { carLease, tokenId } = await loadFixture(activeLeaseFixture);

      const metadata = await carLease.getCarMetadata(tokenId);

      expect(metadata.model).to.equal("Tesla Model 3");
      expect(metadata.color).to.equal("Blue");
      expect(metadata.year).to.equal(2024);
      expect(metadata.originalValueWei).to.equal(ethers.parseEther("30"));
      expect(metadata.mileageLimit).to.equal(50000);
    });

    it("should revert for non-existent token", async function () {
      const { carLease } = await loadFixture(activeLeaseFixture);

      await expect(
        carLease.getCarMetadata(999)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("getLease", function () {
    it("should return complete lease data", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      const lease = await carLease.getLease(tokenId);

      expect(lease.exists).to.be.true;
      expect(lease.active).to.be.true;
      expect(lease.lessee).to.equal(lessee1.address);
      expect(lease.monthlyPayment).to.equal(monthlyPayment);
      expect(lease.deposit).to.equal(monthlyPayment * 3n);
      expect(lease.durationMonths).to.equal(36);
      expect(lease.paymentsMade).to.equal(0);
      // startTime is set when confirmed (>0)
      expect(Number(lease.startTime)).to.be.greaterThan(0);
      // lastPaymentTime is only set after first payment (0 until then)
      expect(Number(lease.lastPaymentTime)).to.equal(0);
    });

    it("should return empty data for non-existent lease", async function () {
      const { carLease } = await loadFixture(activeLeaseFixture);

      const lease = await carLease.getLease(999);

      expect(lease.exists).to.be.false;
      expect(lease.active).to.be.false;
      expect(lease.lessee).to.equal(ethers.ZeroAddress);
    });
  });

  describe("getCommit", function () {
    it("should return commitment data before reveal", async function () {
      const [owner, lessee1] = await ethers.getSigners();
      const CarLease = await ethers.getContractFactory("CarLease");
      const carLease = await CarLease.deploy();

      // Mint
      await carLease.mintOption(
        "Test Car", "Red", 2024,
        ethers.parseEther("20"), ethers.parseEther("0.5"), 24, 40000
      );

      // Commit only (don't reveal)
      const tokenId = 1;
      const secret = ethers.id("commit-view-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const commit = await carLease.getCommit(tokenId);

      // Commit struct: commitment, committer, deadline
      expect(commit.commitment).to.equal(commitment);
      expect(commit.committer).to.equal(lessee1.address);
      expect(Number(commit.deadline)).to.be.greaterThan(0);
    });

    it("should return empty data for non-existent commitment", async function () {
      const { carLease } = await loadFixture(activeLeaseFixture);

      const commit = await carLease.getCommit(999);

      expect(commit.commitment).to.equal(ethers.ZeroHash);
      expect(commit.committer).to.equal(ethers.ZeroAddress);
      expect(Number(commit.deadline)).to.equal(0);
    });
  });

  describe("isPaymentCurrent", function () {
    it("should return true when payments are current", async function () {
      const { carLease, tokenId } = await loadFixture(activeLeaseFixture);

      // Just started, no payments due yet
      const isCurrent = await carLease.isPaymentCurrent(tokenId);
      expect(isCurrent).to.be.true;
    });

    it("should return false when payment is overdue", async function () {
      const { carLease, tokenId } = await loadFixture(activeLeaseFixture);

      // Fast forward past payment due date and grace period
      await time.increase(50 * 24 * 60 * 60); // 50 days

      const isCurrent = await carLease.isPaymentCurrent(tokenId);
      expect(isCurrent).to.be.false;
    });

    it("should return true after making due payment", async function () {
      const { carLease, lessee1, tokenId, monthlyPayment } = await loadFixture(activeLeaseFixture);

      // Fast forward and make payment
      await time.increase(31 * 24 * 60 * 60);
      await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

      const isCurrent = await carLease.isPaymentCurrent(tokenId);
      expect(isCurrent).to.be.true;
    });
  });

  describe("isCommitmentValid", function () {
    it("should return true for valid commitment", async function () {
      const [owner, lessee1] = await ethers.getSigners();
      const CarLease = await ethers.getContractFactory("CarLease");
      const carLease = await CarLease.deploy();

      // Mint and commit
      await carLease.mintOption(
        "Valid Test Car", "Blue", 2024,
        ethers.parseEther("25"), ethers.parseEther("0.7"), 30, 45000
      );

      const tokenId = 1;
      const secret = ethers.id("valid-commit-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const isValid = await carLease.isCommitmentValid(tokenId);
      expect(isValid).to.be.true;
    });

    it("should return false for expired commitment", async function () {
      const [owner, lessee1] = await ethers.getSigners();
      const CarLease = await ethers.getContractFactory("CarLease");
      const carLease = await CarLease.deploy();

      // Mint and commit
      await carLease.mintOption(
        "Expired Test Car", "Green", 2024,
        ethers.parseEther("22"), ethers.parseEther("0.6"), 28, 42000
      );

      const tokenId = 1;
      const secret = ethers.id("expired-commit-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      // Wait for expiration (>7 days)
      await time.increase(8 * 24 * 60 * 60);

      const isValid = await carLease.isCommitmentValid(tokenId);
      expect(isValid).to.be.false;
    });

    it("should return false for non-existent commitment", async function () {
      const { carLease } = await loadFixture(activeLeaseFixture);

      const isValid = await carLease.isCommitmentValid(999);
      expect(isValid).to.be.false;
    });
  });
});
