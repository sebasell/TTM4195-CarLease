const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 Starting CarLease Contract Deployment...\n");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying from address: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.error("❌ ERROR: Deployer account has no ETH!");
    console.error("   Get testnet ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }

  // Deploy CarLease contract
  console.log("📦 Deploying CarLease contract...");
  const CarLease = await ethers.getContractFactory("CarLease");
  
  const carLease = await CarLease.deploy();
  await carLease.waitForDeployment();
  
  const contractAddress = await carLease.getAddress();
  console.log(`✅ CarLease deployed to: ${contractAddress}\n`);

  // Display deployment info
  const network = await ethers.provider.getNetwork();
  console.log("=".repeat(60));
  console.log("📋 Deployment Summary");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Block: ${await ethers.provider.getBlockNumber()}`);
  console.log("=".repeat(60));

  // Mint sample NFT for testing (optional)
  if (process.env.MINT_SAMPLE_NFT === "true") {
    console.log("\n🎨 Minting sample NFT for testing...");
    
    const tx = await carLease.mintOption(
      "Tesla Model 3",
      "Midnight Silver Metallic",
      2024,
      ethers.parseEther("30"),      // originalValueWei: 30 ETH total value
      ethers.parseEther("0.5"),     // monthlyPayment: 0.5 ETH/month
      36,                            // durationMonths: 36 months
      50000                          // mileageLimit: 50,000 km
    );
    
    const receipt = await tx.wait();
    console.log(`✅ Sample NFT minted! Token ID: 1`);
    console.log(`   Transaction: ${receipt.hash}`);
    
    // Get the minted car data
    const carData = await carLease.getCarMetadata(1);
    console.log("\n📄 Sample Car Details:");
    console.log(`   Model: ${carData.model}`);
    console.log(`   Color: ${carData.color}`);
    console.log(`   Year: ${carData.year}`);
    console.log(`   Total Value: ${ethers.formatEther(carData.originalValueWei)} ETH`);
    console.log(`   Mileage Limit: ${carData.mileageLimit} km`);
  }

  // Save deployment address
  console.log("\n💾 Save this information:");
  console.log("=".repeat(60));
  console.log(`CARLEASE_ADDRESS=${contractAddress}`);
  console.log("=".repeat(60));

  // Verification instructions
  console.log("\n🔍 To verify on Etherscan:");
  console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);

  // Next steps
  console.log("\n📝 Next Steps:");
  console.log("1. Save contract address to .env or deployment-addresses.json");
  console.log("2. Verify contract on Etherscan (see command above)");
  console.log("3. Test contract via Etherscan 'Write Contract' interface");
  console.log("4. Interact with contract using frontend or scripts");

  console.log("\n✨ Deployment complete!\n");

  return contractAddress;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
