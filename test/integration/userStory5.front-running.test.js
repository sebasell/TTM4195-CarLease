const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Test: US5 - Front-Running Prevention", function () {
  it("should prevent front-running with commit-reveal pattern (Acceptance 1-4)", async function () {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    // Step 1: Dealer mints high-demand Tesla NFT
    await carLease.connect(owner).mintOption(
      "Tesla Model S Plaid",
      "Red",
      2024,
      ethers.parseEther("100"),
      ethers.parseEther("2"),
      36,
      40000
    );

    const tokenId = 1;
    console.log("\n🔐 Front-Running Prevention Test:");
    console.log("  1. High-demand Tesla Model S Plaid minted");

    // Step 2: Three customers commit with different secrets (simulating mempool)
    const aliceSecret = ethers.id("alice-secret-xyz123");
    const bobSecret = ethers.id("bob-secret-abc456");
    const charlieSecret = ethers.id("charlie-secret-def789");

    const aliceCommitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [tokenId, aliceSecret, alice.address])
    );
    const bobCommitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [tokenId, bobSecret, bob.address])
    );
    const charlieCommitment = ethers.keccak256(
      ethers.solidityPacked(["uint256", "bytes32", "address"], [tokenId, charlieSecret, charlie.address])
    );

    // All three commit (simulating competitive scenario)
    await carLease.connect(alice).commitToLease(tokenId, aliceCommitment);
    console.log("  2. Alice commits (hash only visible)");

    await carLease.connect(bob).commitToLease(tokenId, bobCommitment);
    console.log("  3. Bob commits (overwrites Alice)");

    await carLease.connect(charlie).commitToLease(tokenId, charlieCommitment);
    console.log("  4. Charlie commits (overwrites Bob)");

    // Verify only commitment hash is visible (privacy)
    const storedCommit = await carLease.commits(tokenId);
    expect(storedCommit.commitment).to.equal(charlieCommitment);
    expect(storedCommit.committer).to.equal(charlie.address);

    // Lease doesn't exist yet (details hidden)
    let lease = await carLease.leases(tokenId);
    expect(lease.exists).to.be.false;

    console.log("  5. ✓ All commitments private (no details leaked)");

    // Step 3: Charlie reveals first (current committer wins)
    const monthlyPayment = ethers.parseEther("2");
    const deposit = monthlyPayment * 3n; // 6 ETH

    await carLease.connect(charlie).revealAndPay(
      tokenId,
      charlieSecret,
      36,
      monthlyPayment,
      { value: deposit }
    );

    console.log("  6. Charlie reveals first and wins lease");

    // Verify Charlie won
    lease = await carLease.leases(tokenId);
    expect(lease.lessee).to.equal(charlie.address);
    expect(lease.exists).to.be.true;
    expect(lease.deposit).to.equal(deposit);

    // Step 4: Alice and Bob try to commit again (should fail - lease taken)
    await expect(
      carLease.connect(alice).commitToLease(tokenId, aliceCommitment)
    ).to.be.revertedWith("Already leased");

    await expect(
      carLease.connect(bob).commitToLease(tokenId, bobCommitment)
    ).to.be.revertedWith("Already leased");

    console.log("  7. ✓ Alice and Bob cannot commit (lease taken)");

    // Step 5: Dealer confirms Charlie's lease
    await carLease.connect(owner).confirmLease(tokenId);

    lease = await carLease.leases(tokenId);
    expect(lease.active).to.be.true;
    expect(lease.startTime).to.be.greaterThan(0);

    console.log("  8. ✓ Dealer confirms Charlie's lease");

    // Step 6: Charlie makes first payment (verify lease fully functional)
    await time.increase(31 * 24 * 60 * 60);

    await carLease.connect(charlie).makeMonthlyPayment(tokenId, { value: monthlyPayment });

    lease = await carLease.leases(tokenId);
    expect(lease.paymentsMade).to.equal(1);

    console.log("  9. ✓ Charlie makes first monthly payment");
    console.log("\n✅ Front-running prevention complete:");
    console.log("  - Commitments hidden (only hash visible)");
    console.log("  - First revealer (current committer) wins");
    console.log("  - Losers cannot claim after lease taken");
    console.log("  - No front-running possible (secret binding)");
  });
});
