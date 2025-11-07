/**
 * Sepolia testnet interaction script for deployed CarLease contract
 * Demonstrates a complete lease lifecycle on Sepolia testnet
 * 
 * Prerequisites:
 * 1. Deploy contract: npx hardhat run scripts/deploy.js --network sepolia
 * 2. Get Sepolia ETH from faucet
 * 3. Run this script: npx hardhat run scripts/interact-sepolia.js --network sepolia
 * 
 * Note: Uses same wallet for both dealer and customer (testnet limitation)
 */

const { ethers } = require("hardhat");

async function main() {
  // Your deployed Sepolia contract address
  const contractAddress = "0xe9A516f0e2210A00584b9c20E26A79109200C5A8";
  
  console.log("\n🚗 CarLease Contract - Sepolia Testnet Interaction");
  console.log("============================================================\n");

  // Get signer - on testnet there's only one account from private key
  const [signer] = await ethers.getSigners();
  const dealer = signer;
  const customer = signer; // Same wallet acts as both
  
  console.log("🌐 Network: Sepolia Testnet");
  console.log("👥 Actors:");
  console.log(`   Dealer:   ${dealer.address}`);
  console.log(`   Customer: ${customer.address} (same wallet)\n`);

  // Connect to deployed contract
  const CarLease = await ethers.getContractFactory("CarLease");
  const contract = CarLease.attach(contractAddress);

  console.log("📍 Connected to CarLease at:", contractAddress);
  console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("============================================================\n");

  try {
    // Step 1: Dealer mints lease option
    console.log("1️⃣  Dealer mints lease option NFT...");
    const model = "Tesla Model 3";
    const color = "Blue";
    const year = 2024;
    const carValue = ethers.parseEther("50"); // 50 ETH car value
    const monthlyPayment = ethers.parseEther("0.01"); // 0.01 ETH per month (smaller for testnet)
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
    console.log(`   ⏳ Waiting for transaction: ${mintTx.hash}`);
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
    console.log(`   ⏳ Waiting for transaction: ${commitTx.hash}`);
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
    console.log(`   ⏳ Waiting for transaction: ${revealTx.hash}`);
    await revealTx.wait();
    console.log("   ✅ Reveal successful");
    console.log(`   💰 Deposit paid: ${ethers.formatEther(requiredDeposit)} ETH (3x monthly)\n`);

    // Step 4: Dealer confirms lease
    console.log("4️⃣  Dealer confirms lease activation...");
    const confirmTx = await contract.connect(dealer).confirmLease(tokenId);
    console.log(`   ⏳ Waiting for transaction: ${confirmTx.hash}`);
    await confirmTx.wait();
    console.log("   ✅ Lease activated!\n");

    // Note: Cannot time travel on testnet, so we skip the monthly payment
    console.log("ℹ️  Note: Monthly payment requires waiting 30 days on testnet.");
    console.log("   You can make the first payment after 30 days using Etherscan.\n");

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
    console.log("✨ Demo complete! Lease is active on Sepolia testnet.");
    console.log(`🔗 View contract: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("============================================================\n");

  } catch (error) {
    console.error("\n❌ Error during interaction:");
    console.error(error.message);
    if (error.transaction) {
      console.error(`Transaction hash: ${error.transaction.hash}`);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
