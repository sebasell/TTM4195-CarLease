// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Integration Test: User Story 4 - Lease Extension
 * 
 * Scenario: Customer wants to extend lease for additional months (v2.x feature)
 * 
 * Flow (Reserved for v2.x):
 * 1. Dealer mints NFT for Tesla Model 3 (12-month lease)
 * 2. Customer commits to lease
 * 3. Customer reveals and pays deposit
 * 4. Dealer confirms lease
 * 5. Customer makes 10 of 12 payments (nearing end)
 * 6. Customer requests extension (6 more months)
 * 7. Customer pays additional deposit (3x new monthly)
 * 8. System updates lease duration and payment terms
 * 
 * Validates: FR-031, FR-032, FR-033, FR-047
 * 
 * Note: This feature is reserved for v2.x. Test verifies proper "Not implemented" revert.
 */
describe("User Story 4: Lease Extension (Reserved for v2.x)", function () {
  async function deployExtensionScenario() {
    const [dealer, customer] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();
    return { carLease, dealer, customer };
  }

  it("should revert extension flow with 'Not implemented'", async function () {
    const { carLease, dealer, customer } = await loadFixture(deployExtensionScenario);

    console.log("\n🔄 User Story 4: Lease Extension (v2.x Feature)");
    console.log("=================================================");

    // Step 1: Dealer mints 12-month lease NFT
    console.log("\n1️⃣  Dealer mints lease option for Tesla Model 3 (12 months)");
    await carLease.connect(dealer).mintOption(
      "Tesla Model 3",
      "Pearl White",
      2024,
      ethers.parseEther("15"),    // Total: 15 ETH (shorter lease)
      ethers.parseEther("0.5"),   // Monthly: 0.5 ETH
      12,                          // 12 months
      50000                        // 50k km/year
    );
    const tokenId = 1;
    console.log(`   ✓ NFT #${tokenId} minted (15 ETH total, 0.5 ETH/month, 12 months)`);

    // Step 2: Customer commits
    console.log("\n2️⃣  Customer commits to lease");
    const secret = ethers.id("extension-customer-secret");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, customer.address]
      )
    );
    await carLease.connect(customer).commitToLease(tokenId, commitment);
    console.log(`   ✓ Commitment placed`);

    // Step 3: Customer reveals and pays deposit
    console.log("\n3️⃣  Customer reveals and pays 1.5 ETH deposit");
    const monthlyPayment = ethers.parseEther("0.5");
    const deposit = monthlyPayment * 3n;
    await carLease.connect(customer).revealAndPay(
      tokenId,
      secret,
      12,
      monthlyPayment,
      { value: deposit }
    );
    console.log(`   ✓ Deposit paid: ${ethers.formatEther(deposit)} ETH`);

    // Step 4: Dealer confirms
    console.log("\n4️⃣  Dealer confirms lease");
    await carLease.connect(dealer).confirmLease(tokenId);
    console.log(`   ✓ Lease active (12-month term)`);

    // Step 5: Customer makes 10 payments (nearing end)
    console.log("\n5️⃣  Customer makes 10 of 12 monthly payments");
    for (let i = 1; i <= 10; i++) {
      await time.increase(31 * 24 * 60 * 60);
      await carLease.connect(customer).makeMonthlyPayment(tokenId, { value: monthlyPayment });
      if (i === 1 || i === 10) {
        console.log(`   ✓ Payment ${i}/12: 0.5 ETH`);
      } else if (i === 2) {
        console.log(`   ... (payments 2-9)`);
      }
    }

    let lease = await carLease.getLease(tokenId);
    console.log(`   ✓ 10 payments completed (${lease.paymentsMade}/12 months paid)`);

    // Step 6-8: Try to extend lease (should revert - v2.x feature)
    console.log("\n6️⃣  Customer attempts to extend lease by 6 months");
    const additionalMonths = 6;
    const additionalDeposit = monthlyPayment * 3n;
    
    console.log(`   ⚠️  Requesting extension: +${additionalMonths} months`);
    console.log(`   ⚠️  Additional deposit: ${ethers.formatEther(additionalDeposit)} ETH`);
    console.log(`   ⚠️  This would extend lease from 12 to 18 months`);

    // Attempt extension (should fail - not implemented)
    await expect(
      carLease.connect(customer).extendLease(
        tokenId,
        additionalMonths,
        monthlyPayment,
        { value: additionalDeposit }
      )
    ).to.be.revertedWith("Not implemented - reserved for v2.x");

    console.log("\n❌ Extension Rejected: Feature reserved for v2.x");
    console.log("   - extendLease() function exists but not implemented");
    console.log("   - Feature planned for future release (v2.x roadmap)");
    console.log("   - Current workaround: Create new lease after current one ends");
    
    console.log("\n📋 v2.x Extension Feature Specification:");
    console.log("   - Allow lessee to extend active lease");
    console.log("   - Pay additional deposit (3x new monthly payment)");
    console.log("   - Update lease duration and payment amount");
    console.log("   - Emit LeaseExtended event");
    console.log("   - Require lease to be active and near end");
    console.log("   - Protected with nonReentrant modifier");

    // Verify lease unchanged
    lease = await carLease.getLease(tokenId);
    expect(lease.active).to.be.true;
    expect(lease.durationMonths).to.equal(12); // Not extended
    expect(lease.paymentsMade).to.equal(10);
  });
});
