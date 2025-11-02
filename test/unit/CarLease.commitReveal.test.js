const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - Commit-Reveal (FR-005 to FR-012)", function () {
  // Fixture with minted NFT
  async function mintedNFTFixture() {
    const [owner, lessee1, lessee2] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

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
    return { carLease, owner, lessee1, lessee2, tokenId };
  }

  describe("commitToLease", function () {
    it("should commit to lease with valid hash (FR-005, FR-006)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(mintedNFTFixture);

      const secret = ethers.id("my-secret-12345");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      const tx = await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      // Verify commitment stored
      const commit = await carLease.commits(tokenId);
      expect(commit.commitment).to.equal(commitment);
      expect(commit.committer).to.equal(lessee1.address);
    });

    it("should store commitment with 7-day deadline (FR-007)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(mintedNFTFixture);

      const secret = ethers.id("my-secret-12345");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      const commitTime = await time.latest();
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const commit = await carLease.commits(tokenId);
      const expectedDeadline = commitTime + 7 * 24 * 60 * 60 + 1; // 7 days + 1 for block time
      expect(commit.deadline).to.be.closeTo(expectedDeadline, 2);
    });

    it("should emit CommitPlaced event (FR-040)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(mintedNFTFixture);

      const secret = ethers.id("my-secret-12345");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      const tx = await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      await expect(tx)
        .to.emit(carLease, "CommitPlaced")
        .withArgs(tokenId, lessee1.address, commitment, await time.latest() + 7 * 24 * 60 * 60);
    });
  });

  describe("revealAndPay", function () {
    async function committedLeaseFixture() {
      const { carLease, owner, lessee1, lessee2, tokenId } = await mintedNFTFixture();

      const secret = ethers.id("my-secret-12345");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      return { carLease, owner, lessee1, lessee2, tokenId, secret, commitment };
    }

    it("should reveal with correct secret and deposit (FR-008, FR-012)", async function () {
      const { carLease, lessee1, tokenId, secret } = await loadFixture(committedLeaseFixture);

      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n; // 3x monthly

      const tx = await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );

      // Verify lease created
      const lease = await carLease.leases(tokenId);
      expect(lease.lessee).to.equal(lessee1.address);
      expect(lease.exists).to.be.true;
      expect(lease.active).to.be.false; // Pending confirmation
      expect(lease.deposit).to.equal(deposit);
      expect(lease.monthlyPayment).to.equal(monthlyPayment);
      expect(lease.durationMonths).to.equal(36);
    });

    it("should validate hash matches commitment (FR-009)", async function () {
      const { carLease, lessee1, tokenId } = await loadFixture(committedLeaseFixture);

      const wrongSecret = ethers.id("wrong-secret");
      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      await expect(
        carLease.connect(lessee1).revealAndPay(
          tokenId,
          wrongSecret,
          36,
          monthlyPayment,
          { value: deposit }
        )
      ).to.be.revertedWith("Invalid secret");
    });

    it("should revert on expired commitment (FR-010)", async function () {
      const { carLease, lessee1, tokenId, secret } = await loadFixture(committedLeaseFixture);

      // Fast forward 8 days (past 7-day deadline)
      await time.increase(8 * 24 * 60 * 60);

      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      await expect(
        carLease.connect(lessee1).revealAndPay(
          tokenId,
          secret,
          36,
          monthlyPayment,
          { value: deposit }
        )
      ).to.be.revertedWith("Commitment expired");
    });

    it("should revert on already leased NFT (FR-011)", async function () {
      const { carLease, lessee1, lessee2, tokenId, secret } = await loadFixture(committedLeaseFixture);

      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      // First lessee reveals successfully
      await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );

      // Second lessee tries to commit to same NFT (should fail because lease exists)
      const secret2 = ethers.id("another-secret");
      const commitment2 = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret2, lessee2.address]
        )
      );

      await expect(
        carLease.connect(lessee2).commitToLease(tokenId, commitment2)
      ).to.be.revertedWith("Already leased");
    });

    it("should revert on incorrect deposit amount (FR-012, FR-013)", async function () {
      const { carLease, lessee1, tokenId, secret } = await loadFixture(committedLeaseFixture);

      const monthlyPayment = ethers.parseEther("0.5");
      const wrongDeposit = ethers.parseEther("1.0"); // Should be 1.5 ETH (3x 0.5)

      await expect(
        carLease.connect(lessee1).revealAndPay(
          tokenId,
          secret,
          36,
          monthlyPayment,
          { value: wrongDeposit }
        )
      ).to.be.revertedWith("Incorrect deposit");
    });

    it("should emit LeaseSignedRevealed event (FR-041)", async function () {
      const { carLease, lessee1, tokenId, secret } = await loadFixture(committedLeaseFixture);

      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      const tx = await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );

      await expect(tx)
        .to.emit(carLease, "LeaseSignedRevealed");
    });

    it("should set lease to pending status after reveal", async function () {
      const { carLease, lessee1, tokenId, secret } = await loadFixture(committedLeaseFixture);

      const monthlyPayment = ethers.parseEther("0.5");
      const deposit = monthlyPayment * 3n;

      await carLease.connect(lessee1).revealAndPay(
        tokenId,
        secret,
        36,
        monthlyPayment,
        { value: deposit }
      );

      const lease = await carLease.leases(tokenId);
      expect(lease.exists).to.be.true;
      expect(lease.active).to.be.false;
      expect(lease.startTime).to.equal(0); // Not started yet
    });
  });
});
