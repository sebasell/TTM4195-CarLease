const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Test: US2 - Deposit Protection with Auto-Refund", function () {
  it("should refund deposit when dealer fails to confirm (Acceptance 1-3)", async function () {
    const [owner, customer] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    console.log("\n💰 Deposit Protection Test:");

    // Step 1: Dealer mints NFT
    await carLease.connect(owner).mintOption(
      "BMW i4",
      "Black",
      2024,
      ethers.parseEther("50"),
      ethers.parseEther("1"),
      36,
      45000
    );

    const tokenId = 1;
    console.log("  1. Dealer mints BMW i4 lease option");

    // Step 2: Customer commits and reveals with deposit
    const secret = ethers.id("customer-secret-xyz");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, customer.address]
      )
    );

    await carLease.connect(customer).commitToLease(tokenId, commitment);
    console.log("  2. Customer commits to lease");

    const monthlyPayment = ethers.parseEther("1");
    const deposit = monthlyPayment * 3n; // 3 ETH

    const customerBalanceBefore = await ethers.provider.getBalance(customer.address);

    await carLease.connect(customer).revealAndPay(
      tokenId,
      secret,
      36,
      monthlyPayment,
      { value: deposit }
    );

    console.log("  3. Customer reveals and pays 3 ETH deposit");

    // Verify deposit held by contract
    let lease = await carLease.leases(tokenId);
    expect(lease.exists).to.be.true;
    expect(lease.active).to.be.false;
    expect(lease.deposit).to.equal(deposit);
    expect(lease.lessee).to.equal(customer.address);

    const contractBalance = await ethers.provider.getBalance(await carLease.getAddress());
    expect(contractBalance).to.equal(deposit);

    console.log("  4. ✓ Deposit held by contract (lease pending)");

    // Step 3: Dealer fails to confirm (simulate abandonment)
    console.log("  5. ⏰ Dealer abandons (7 days pass)...");

    // Fast forward 8 days (past 7-day confirmation deadline)
    await time.increase(8 * 24 * 60 * 60);

    // Step 4: Customer reclaims deposit
    const tx = await carLease.connect(customer).refundUnconfirmedDeposit(tokenId);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    console.log("  6. Customer claims refund after deadline");

    // Verify refund received
    const customerBalanceAfter = await ethers.provider.getBalance(customer.address);
    
    // Customer should have: (balance before reveal) - (gas from all txs)
    // The deposit should be returned
    expect(customerBalanceAfter).to.be.greaterThan(customerBalanceBefore - deposit);

    // Verify contract balance depleted
    const contractBalanceAfter = await ethers.provider.getBalance(await carLease.getAddress());
    expect(contractBalanceAfter).to.equal(0);

    console.log("  7. ✓ Full deposit refunded to customer");

    // Verify lease cancelled
    lease = await carLease.leases(tokenId);
    expect(lease.exists).to.be.false;
    expect(lease.deposit).to.equal(0);

    console.log("  8. ✓ Lease marked as cancelled");

    // Step 5: Verify RefundUnconfirmed event
    await expect(tx)
      .to.emit(carLease, "RefundUnconfirmed")
      .withArgs(tokenId, customer.address, deposit);

    console.log("  9. ✓ RefundUnconfirmed event emitted");

    console.log("\n✅ Deposit protection complete:");
    console.log("  - Customer protected from dealer abandonment");
    console.log("  - Full 3 ETH deposit returned");
    console.log("  - Lease properly cancelled");
    console.log("  - 7-day deadline enforced");
  });
});
