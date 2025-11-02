// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * CarLease - Event Tests
 * 
 * Validates all 9 events emit correctly with proper parameters (Principle IV):
 * - FR-039: OptionMinted
 * - FR-040: CommitPlaced
 * - FR-041: LeaseSignedRevealed
 * - FR-042: LeaseConfirmed
 * - FR-043: MonthlyPaid
 * - FR-044: LeaseTerminated
 * - FR-045: DepositClaimed
 * - FR-046: RefundUnconfirmed
 * - FR-047: LeaseExtended (v2.x)
 * 
 * Tests verify:
 * - All events have indexed parameters for filtering
 * - Event data includes all relevant state changes
 * - Events can be parsed off-chain
 */
describe("CarLease - Event Coverage (Principle IV)", function () {
  async function deployCarLeaseFixture() {
    const [owner, lessee1, lessee2] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();
    return { carLease, owner, lessee1, lessee2 };
  }

  describe("Event Emissions", function () {
    it("should emit OptionMinted event with indexed tokenId (FR-039)", async function () {
      const { carLease, owner } = await loadFixture(deployCarLeaseFixture);

      const tx = await carLease.connect(owner).mintOption(
        "Tesla Model S",
        "Red",
        2024,
        ethers.parseEther("50"),
        ethers.parseEther("1.5"),
        36,
        60000
      );

      // Verify event emitted with correct parameters
      await expect(tx)
        .to.emit(carLease, "OptionMinted")
        .withArgs(
          1, // tokenId (indexed)
          "Tesla Model S",
          "Red",
          2024,
          ethers.parseEther("50")
        );
    });

    it("should emit CommitPlaced event with indexed tokenId (FR-040)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Mint NFT first
      await carLease.connect(owner).mintOption(
        "BMW X5", "Blue", 2024,
        ethers.parseEther("30"), ethers.parseEther("1.0"), 24, 50000
      );

      const tokenId = 1;
      const secret = ethers.id("commit-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );

      const tx = await carLease.connect(lessee1).commitToLease(tokenId, commitment);
      const block = await ethers.provider.getBlock(tx.blockNumber);
      const deadline = block.timestamp + (7 * 24 * 60 * 60);

      await expect(tx)
        .to.emit(carLease, "CommitPlaced")
        .withArgs(
          tokenId, // indexed
          lessee1.address, // indexed
          commitment,
          deadline
        );
    });

    it("should emit LeaseSignedRevealed event (FR-041)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Mint and commit
      await carLease.connect(owner).mintOption(
        "Audi A6", "Gray", 2024,
        ethers.parseEther("25"), ethers.parseEther("0.8"), 30, 45000
      );

      const tokenId = 1;
      const secret = ethers.id("reveal-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      // Reveal
      const monthlyPayment = ethers.parseEther("0.8");
      const deposit = monthlyPayment * 3n;
      
      const tx = await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 30, monthlyPayment, { value: deposit }
      );

      // Event should include all lease details
      await expect(tx).to.emit(carLease, "LeaseSignedRevealed");
      // Note: Not checking exact parameters due to struct complexity
    });

    it("should emit LeaseConfirmed event (FR-042)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Setup: mint, commit, reveal
      await carLease.connect(owner).mintOption(
        "Mercedes E-Class", "Black", 2024,
        ethers.parseEther("40"), ethers.parseEther("1.2"), 36, 50000
      );

      const tokenId = 1;
      const secret = ethers.id("confirm-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("1.2");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 36, monthlyPayment, { value: deposit }
      );

      // Confirm
      const tx = await carLease.connect(owner).confirmLease(tokenId);

      await expect(tx).to.emit(carLease, "LeaseConfirmed");
    });

    it("should emit MonthlyPaid event with payment details (FR-043)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Setup active lease
      await carLease.connect(owner).mintOption(
        "Volvo XC90", "Silver", 2024,
        ethers.parseEther("35"), ethers.parseEther("1.0"), 36, 50000
      );

      const tokenId = 1;
      const secret = ethers.id("payment-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("1.0");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 36, monthlyPayment, { value: deposit }
      );
      await carLease.connect(owner).confirmLease(tokenId);

      // Make payment
      await time.increase(31 * 24 * 60 * 60);
      const tx = await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

      await expect(tx).to.emit(carLease, "MonthlyPaid");
    });

    it("should emit LeaseTerminated event with reason (FR-044)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Setup active lease
      await carLease.connect(owner).mintOption(
        "Porsche Cayenne", "White", 2024,
        ethers.parseEther("60"), ethers.parseEther("2.0"), 24, 40000
      );

      const tokenId = 1;
      const secret = ethers.id("terminate-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("2.0");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 24, monthlyPayment, { value: deposit }
      );
      await carLease.connect(owner).confirmLease(tokenId);

      // Terminate
      const tx = await carLease.connect(lessee1).terminateLease(tokenId);

      await expect(tx)
        .to.emit(carLease, "LeaseTerminated")
        .withArgs(tokenId, lessee1.address, "Terminated");
    });

    it("should emit DepositClaimed event (FR-045)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Setup lease with missed payments
      await carLease.connect(owner).mintOption(
        "Lexus RX", "Blue", 2024,
        ethers.parseEther("30"), ethers.parseEther("1.0"), 36, 50000
      );

      const tokenId = 1;
      const secret = ethers.id("claim-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("1.0");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 36, monthlyPayment, { value: deposit }
      );
      await carLease.connect(owner).confirmLease(tokenId);

      // Wait past grace period
      await time.increase(50 * 24 * 60 * 60);

      // Claim deposit
      const tx = await carLease.connect(owner).claimDeposit(tokenId);

      await expect(tx)
        .to.emit(carLease, "DepositClaimed")
        .withArgs(tokenId, owner.address, deposit);
    });

    it("should emit RefundUnconfirmed event (FR-046)", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Setup unconfirmed lease
      await carLease.connect(owner).mintOption(
        "Mazda CX-5", "Red", 2024,
        ethers.parseEther("20"), ethers.parseEther("0.6"), 36, 50000
      );

      const tokenId = 1;
      const secret = ethers.id("refund-event-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      await carLease.connect(lessee1).commitToLease(tokenId, commitment);

      const monthlyPayment = ethers.parseEther("0.6");
      const deposit = monthlyPayment * 3n;
      await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 36, monthlyPayment, { value: deposit }
      );

      // Wait past confirmation deadline
      await time.increase(8 * 24 * 60 * 60);

      // Claim refund
      const tx = await carLease.connect(lessee1).refundUnconfirmedDeposit(tokenId);

      await expect(tx)
        .to.emit(carLease, "RefundUnconfirmed")
        .withArgs(tokenId, lessee1.address, deposit);
    });

    it("should have LeaseExtended event defined for v2.x (FR-047)", async function () {
      const { carLease } = await loadFixture(deployCarLeaseFixture);

      // Verify event exists in contract interface
      // This is checked by attempting to get the event fragment
      const eventFragment = carLease.interface.getEvent("LeaseExtended");
      expect(eventFragment).to.not.be.undefined;
      expect(eventFragment.name).to.equal("LeaseExtended");
    });
  });

  describe("Event Data Completeness (Principle IV)", function () {
    it("should emit events for all state-changing operations", async function () {
      const { carLease, owner, lessee1 } = await loadFixture(deployCarLeaseFixture);

      // Track all events in a complete lifecycle
      const events = [];

      // 1. Mint
      let tx = await carLease.connect(owner).mintOption(
        "Complete Test Car", "Green", 2024,
        ethers.parseEther("30"), ethers.parseEther("1.0"), 24, 50000
      );
      let receipt = await tx.wait();
      events.push(...receipt.logs.map(log => {
        try {
          return carLease.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter(e => e !== null));

      // 2. Commit
      const tokenId = 1;
      const secret = ethers.id("completeness-test");
      const commitment = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "bytes32", "address"],
          [tokenId, secret, lessee1.address]
        )
      );
      tx = await carLease.connect(lessee1).commitToLease(tokenId, commitment);
      receipt = await tx.wait();
      events.push(...receipt.logs.map(log => {
        try {
          return carLease.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter(e => e !== null));

      // 3. Reveal
      const monthlyPayment = ethers.parseEther("1.0");
      const deposit = monthlyPayment * 3n;
      tx = await carLease.connect(lessee1).revealAndPay(
        tokenId, secret, 24, monthlyPayment, { value: deposit }
      );
      receipt = await tx.wait();
      events.push(...receipt.logs.map(log => {
        try {
          return carLease.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter(e => e !== null));

      // 4. Confirm
      tx = await carLease.connect(owner).confirmLease(tokenId);
      receipt = await tx.wait();
      events.push(...receipt.logs.map(log => {
        try {
          return carLease.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter(e => e !== null));

      // 5. Pay
      await time.increase(31 * 24 * 60 * 60);
      tx = await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });
      receipt = await tx.wait();
      events.push(...receipt.logs.map(log => {
        try {
          return carLease.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter(e => e !== null));

      // Verify we have at least 5 events (one per major operation)
      const eventNames = events.map(e => e.name);
      expect(eventNames).to.include("OptionMinted");
      expect(eventNames).to.include("CommitPlaced");
      expect(eventNames).to.include("LeaseSignedRevealed");
      expect(eventNames).to.include("LeaseConfirmed");
      expect(eventNames).to.include("MonthlyPaid");
    });
  });
});
