// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Integration Test: User Story 3 - Dealer Deposit Protection
 * 
 * Scenario: Customer defaults on monthly payments, dealer claims deposit
 * 
 * Flow:
 * 1. Dealer mints NFT for Tesla Model 3
 * 2. Customer commits to lease
 * 3. Customer reveals and pays deposit
 * 4. Dealer confirms lease
 * 5. Customer makes 2 monthly payments
 * 6. Customer stops paying (default)
 * 7. Dealer waits 45-day grace period
 * 8. Dealer claims deposit as compensation
 * 
 * Validates: FR-024, FR-025, FR-027, FR-030, FR-037, FR-045
 */
describe("User Story 3: Dealer Deposit Protection (Default Flow)", function () {
  async function deploySingleUserScenario() {
    const [dealer, customer] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();
    return { carLease, dealer, customer };
  }

  it("should complete default-to-claim flow", async function () {
    const { carLease, dealer, customer } = await loadFixture(deploySingleUserScenario);

    console.log("\n🚗 User Story 3: Dealer Deposit Protection");
    console.log("==========================================");

    // Step 1: Dealer mints NFT
    console.log("\n1️⃣  Dealer mints lease option for Tesla Model 3");
    await carLease.connect(dealer).mintOption(
      "Tesla Model 3",
      "Midnight Silver",
      2024,
      ethers.parseEther("30"),    // Total: 30 ETH
      ethers.parseEther("0.5"),   // Monthly: 0.5 ETH
      36,                          // 36 months
      50000                        // 50k km/year
    );
    const tokenId = 1;
    console.log(`   ✓ NFT #${tokenId} minted (30 ETH total, 0.5 ETH/month, 36 months)`);

    // Step 2: Customer commits to lease
    console.log("\n2️⃣  Customer commits to lease (commit-reveal pattern)");
    const secret = ethers.id("customer-secret-2024");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, customer.address]
      )
    );
    await carLease.connect(customer).commitToLease(tokenId, commitment);
    console.log(`   ✓ Commitment placed (hash: ${commitment.slice(0, 10)}...)`);

    // Step 3: Customer reveals and pays deposit
    console.log("\n3️⃣  Customer reveals secret and pays 1.5 ETH deposit (3 months)");
    const monthlyPayment = ethers.parseEther("0.5");
    const deposit = monthlyPayment * 3n;
    await carLease.connect(customer).revealAndPay(
      tokenId,
      secret,
      36,
      monthlyPayment,
      { value: deposit }
    );
    console.log(`   ✓ Deposit paid: ${ethers.formatEther(deposit)} ETH`);

    // Step 4: Dealer confirms lease
    console.log("\n4️⃣  Dealer confirms lease (activates contract)");
    await carLease.connect(dealer).confirmLease(tokenId);
    const startTime = (await ethers.provider.getBlock("latest")).timestamp;
    console.log(`   ✓ Lease active (start: ${new Date(startTime * 1000).toISOString()})`);

    // Step 5: Customer makes 2 payments
    console.log("\n5️⃣  Customer makes 2 monthly payments");
    
    // Payment 1 (after 31 days)
    await time.increase(31 * 24 * 60 * 60);
    await carLease.connect(customer).makeMonthlyPayment(tokenId, { value: monthlyPayment });
    let lease = await carLease.getLease(tokenId);
    console.log(`   ✓ Payment 1/36: 0.5 ETH (total paid: ${lease.paymentsMade})`);

    // Payment 2 (after another 31 days)
    await time.increase(31 * 24 * 60 * 60);
    await carLease.connect(customer).makeMonthlyPayment(tokenId, { value: monthlyPayment });
    lease = await carLease.getLease(tokenId);
    console.log(`   ✓ Payment 2/36: 0.5 ETH (total paid: ${lease.paymentsMade})`);

    // Step 6: Customer defaults (stops paying)
    console.log("\n6️⃣  Customer stops paying (default scenario)");
    const lastPaymentTime = lease.lastPaymentTime;
    console.log(`   ⚠️  Last payment: ${new Date(Number(lastPaymentTime) * 1000).toISOString()}`);
    console.log(`   ⚠️  Customer has missed payments (grace period: 45 days)`);

    // Step 7: Wait 46 days (past grace period)
    console.log("\n7️⃣  Dealer waits 45-day grace period before claiming");
    await time.increase(46 * 24 * 60 * 60);
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const daysSinceLastPayment = Math.floor((currentTime - Number(lastPaymentTime)) / (24 * 60 * 60));
    console.log(`   ✓ ${daysSinceLastPayment} days since last payment (grace period expired)`);

    // Step 8: Dealer claims deposit
    console.log("\n8️⃣  Dealer claims deposit as compensation");
    const dealerBalanceBefore = await ethers.provider.getBalance(dealer.address);
    
    const tx = await carLease.connect(dealer).claimDeposit(tokenId);
    const receipt = await tx.wait();
    
    const dealerBalanceAfter = await ethers.provider.getBalance(dealer.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const netGain = dealerBalanceAfter - dealerBalanceBefore + gasUsed;
    
    console.log(`   ✓ Deposit claimed: ${ethers.formatEther(netGain)} ETH`);
    console.log(`   ✓ Lease terminated (dealer protected from default)`);

    // Validate final state
    lease = await carLease.getLease(tokenId);
    expect(lease.active).to.be.false;
    expect(lease.deposit).to.equal(0);
    expect(netGain).to.equal(deposit);

    // Validate event
    await expect(tx)
      .to.emit(carLease, "DepositClaimed")
      .withArgs(tokenId, dealer.address, deposit);

    console.log("\n✅ User Story 3 Complete: Dealer successfully protected from customer default");
    console.log("   - Dealer reclaimed 1.5 ETH deposit");
    console.log("   - Lease terminated after 45-day grace period");
    console.log("   - Customer paid 1 ETH (2 payments) before defaulting");
    console.log("   - System balanced: customer protection (US2) + dealer protection (US3)");
  });
});
