/**
 * Localhost interaction script for testing deployed CarLease contract
 * Demonstrates a complete lease lifecycle on local Hardhat network
 * 
 * Prerequisites:
 * 1. Start local node: npx hardhat node
 * 2. Deploy contract: npx hardhat run scripts/deploy.js --network localhost
 * 3. Run this script: npx hardhat run scripts/interact-localhost.js --network localhost
 */

const { ethers } = require("hardhat");

async function main() {
  // Hardhat node default first deployment address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("\n🚗 CarLease Contract - Localhost Interaction Demo");
  console.log("============================================================\n");

  // Get signers - localhost has multiple test accounts
  const [dealer, customer] = await ethers.getSigners();
  
  console.log("🌐 Network: localhost (Hardhat Network)");
  console.log("👥 Actors:");
  console.log(`   Dealer:   ${dealer.address}`);
  console.log(`   Customer: ${customer.address}\n`);

  // Connect to deployed contract
  const CarLease = await ethers.getContractFactory("CarLease");
  const contract = CarLease.attach(contractAddress);

  console.log("📍 Connected to CarLease at:", contractAddress);
  console.log("============================================================\n");

  try {
    // Step 1: Dealer mints lease option
    console.log("1️⃣  Dealer mints lease option NFT...");
    const model = "Tesla Model 3";
    const color = "Blue";
    const year = 2024;
    const carValue = ethers.parseEther("50"); // 50 ETH car value
    const monthlyPayment = ethers.parseEther("1.0"); // 1 ETH per month
    const numMonths = 12;
    const mileageLimit = 15000;
    
    const mintTx = await contract.connect(dealer).mintOption(
      model,
      color,
      year,
      carValue,
      monthlyPayment,
      numMonths,
      mileageLimit
    );
    const mintReceipt = await mintTx.wait();
    
    // Extract tokenId from OptionMinted event
    const event = mintReceipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === "OptionMinted";
      } catch {
        return false;
      }
    });
    
    const tokenId = event ? contract.interface.parseLog(event).args.tokenId : 1n;
    
    console.log(`   ✅ NFT minted: Token ID ${tokenId}`);
    console.log(`   🚗 Car: ${model} ${color} (${year})`);
    console.log(`   💰 Car value: ${ethers.formatEther(carValue)} ETH`);
    console.log(`   💵 Monthly payment: ${ethers.formatEther(monthlyPayment)} ETH`);
    console.log(`   📅 Duration: ${numMonths} months`);
    console.log(`   📏 Mileage limit: ${mileageLimit} miles\n`);

    // Step 2: Customer commits to lease
    console.log("2️⃣  Customer commits to lease...");
    const salt = ethers.randomBytes(32);
    const commitHash = ethers.solidityPackedKeccak256(
      ["uint256", "bytes32", "address"],
      [tokenId, salt, customer.address]
    );
    
    const commitTx = await contract.connect(customer).commitToLease(tokenId, commitHash);
    await commitTx.wait();
    console.log("   ✅ Commitment registered");
    console.log(`   🔐 Commit hash: ${commitHash.slice(0, 10)}...\n`);

    // Step 3: Customer reveals and pays deposit (3x monthly payment)
    console.log("3️⃣  Customer reveals identity and pays deposit...");
    const requiredDeposit = monthlyPayment * 3n; // 3x monthly payment
    
    const revealTx = await contract.connect(customer).revealAndPay(
      tokenId,
      salt,
      numMonths,
      monthlyPayment,
      { value: requiredDeposit }
    );
    await revealTx.wait();
    console.log("   ✅ Reveal successful");
    console.log(`   💰 Deposit paid: ${ethers.formatEther(requiredDeposit)} ETH (3x monthly)\n`);

    // Step 4: Dealer confirms lease
    console.log("4️⃣  Dealer confirms lease activation...");
    const confirmTx = await contract.connect(dealer).confirmLease(tokenId);
    await confirmTx.wait();
    console.log("   ✅ Lease activated!\n");

    // Step 5: Customer makes monthly payment
    console.log("5️⃣  Customer makes first monthly payment...");
    console.log("   ⏰ Advancing time by 30 days...");
    
    // Advance time by 30 days to make payment due (only works on local network)
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    
    const paymentTx = await contract.connect(customer).makeMonthlyPayment(tokenId, {
      value: monthlyPayment
    });
    await paymentTx.wait();
    console.log("   ✅ Payment #1 made");
    console.log(`   💵 Amount: ${ethers.formatEther(monthlyPayment)} ETH\n`);

    // Check lease status
    console.log("📊 Final Lease Status:");
    const lease = await contract.leases(tokenId);
    console.log(`   Dealer:          ${dealer.address}`);
    console.log(`   Customer:        ${lease.lessee}`);
    console.log(`   Monthly payment: ${ethers.formatEther(lease.monthlyPayment)} ETH`);
    console.log(`   Payments made:   ${lease.paymentsMade}/${lease.durationMonths}`);
    console.log(`   Active:          ${lease.active}`);
    console.log(`   Deposit held:    ${ethers.formatEther(lease.deposit)} ETH`);

    console.log("\n============================================================");
    console.log("✨ Demo complete! Lease is active and running.");
    console.log("============================================================\n");

  } catch (error) {
    console.error("\n❌ Error during interaction:");
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
