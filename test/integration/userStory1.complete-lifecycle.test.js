const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Test: US1 - Complete Lease Lifecycle", function () {
  it("should complete full lease lifecycle from mint to monthly payment", async function () {
    const [owner, lessee1] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    // Step 1: Dealer mints NFT lease option
    await carLease.connect(owner).mintOption(
      "Tesla Model 3",
      "Blue",
      2024,
      ethers.parseEther("30"),
      ethers.parseEther("0.5"),
      36,
      50000
    );

    const tokenId = 1;

    // Verify NFT created
    expect(await carLease.ownerOf(tokenId)).to.equal(await carLease.getAddress());

    // Step 2: Customer commits to lease
    const secret = ethers.id("my-secret-12345");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, lessee1.address]
      )
    );

    await carLease.connect(lessee1).commitToLease(tokenId, commitment);

    // Verify commitment stored
    const commit = await carLease.commits(tokenId);
    expect(commit.committer).to.equal(lessee1.address);

    // Step 3: Customer reveals and pays deposit
    const monthlyPayment = ethers.parseEther("0.5");
    const deposit = monthlyPayment * 3n;

    await carLease.connect(lessee1).revealAndPay(
      tokenId,
      secret,
      36,
      monthlyPayment,
      { value: deposit }
    );

    // Verify lease created (pending)
    let lease = await carLease.leases(tokenId);
    expect(lease.exists).to.be.true;
    expect(lease.active).to.be.false;
    expect(lease.lessee).to.equal(lessee1.address);

    // Step 4: Dealer confirms lease
    await carLease.connect(owner).confirmLease(tokenId);

    // Verify lease activated
    lease = await carLease.leases(tokenId);
    expect(lease.active).to.be.true;
    expect(lease.startTime).to.be.greaterThan(0);

    // Step 5: Customer makes monthly payment
    await time.increase(31 * 24 * 60 * 60); // Fast forward 31 days

    const contractBalanceBefore = await ethers.provider.getBalance(await carLease.getAddress());

    await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

    // Verify payment recorded
    lease = await carLease.leases(tokenId);
    expect(lease.paymentsMade).to.equal(1);

    const contractBalanceAfter = await ethers.provider.getBalance(await carLease.getAddress());
    expect(contractBalanceAfter - contractBalanceBefore).to.equal(monthlyPayment);

    // Step 6: Customer makes second monthly payment
    await time.increase(31 * 24 * 60 * 60);

    await carLease.connect(lessee1).makeMonthlyPayment(tokenId, { value: monthlyPayment });

    lease = await carLease.leases(tokenId);
    expect(lease.paymentsMade).to.equal(2);

    console.log("\n✅ Complete lease lifecycle test passed:");
    console.log("  1. Mint NFT");
    console.log("  2. Commit to lease");
    console.log("  3. Reveal and pay deposit");
    console.log("  4. Dealer confirms");
    console.log("  5. Monthly payments made");
  });
});
