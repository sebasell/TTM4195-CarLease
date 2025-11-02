# Developer Quickstart Guide: CarLease NFT System

**Feature**: 001-nft-lease-system  
**Created**: 2025-11-02  
**Estimated Setup Time**: 15 minutes  
**Prerequisites**: Node.js 16+, npm/yarn, Git

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Project Initialization](#project-initialization)
3. [Development Workflow (TDD)](#development-workflow-tdd)
4. [Testing](#testing)
5. [Local Deployment](#local-deployment)
6. [Testnet Deployment](#testnet-deployment)
7. [Contract Verification](#contract-verification)
8. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### 1. Install Node.js and npm

**macOS** (using Homebrew):
```bash
brew install node
node --version  # Should be v16+ or v18+
npm --version
```

**Verify Installation**:
```bash
node --version  # v18.17.0 or higher recommended
npm --version   # 9.0.0 or higher
```

### 2. Install Development Tools

```bash
# Install Hardhat globally (optional, can use npx)
npm install -g hardhat

# Verify installation
npx hardhat --version  # Should show Hardhat version
```

---

## Project Initialization

### 1. Clone/Navigate to Repository

```bash
cd /Users/navn/Documents/Code/TTM4195-CarLease
git checkout 001-nft-lease-system  # Use feature branch
```

### 2. Initialize Hardhat Project

```bash
# Initialize npm project (if not exists)
npm init -y

# Install Hardhat and plugins
npm install --save-dev hardhat \
    @nomicfoundation/hardhat-toolbox \
    @nomicfoundation/hardhat-chai-matchers \
    @nomicfoundation/hardhat-network-helpers \
    hardhat-gas-reporter \
    solidity-coverage \
    @typechain/hardhat \
    @typechain/ethers-v6

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts

# Install testing dependencies
npm install --save-dev chai \
    @nomicfoundation/hardhat-ethers \
    ethers
```

**Expected `package.json` Dependencies**:
```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
    "@nomicfoundation/hardhat-network-helpers": "^1.0.0",
    "hardhat": "^2.19.0",
    "hardhat-gas-reporter": "^1.0.9",
    "solidity-coverage": "^0.8.5",
    "chai": "^4.3.10",
    "ethers": "^6.9.0"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.0"
  }
}
```

### 3. Create Hardhat Configuration

**File**: `hardhat.config.js`

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",  // Use latest 0.8.x
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Balance deployment cost vs. execution cost
      }
    }
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      // Uncomment for mainnet fork testing
      // forking: {
      //   url: process.env.MAINNET_RPC_URL || "",
      // }
    },
    
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    outputFile: "gas-report.txt",
    noColors: true
  },
  
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || ""
    }
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### 4. Create Environment File

**File**: `.env` (add to `.gitignore`!)

```bash
# RPC URLs (get from Alchemy, Infura, or QuickNode)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY

# Deployment wallet (NEVER commit this!)
PRIVATE_KEY=your_private_key_here

# Block explorers (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Gas reporting
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

**Load .env in Hardhat**:
```bash
npm install --save-dev dotenv
```

Update `hardhat.config.js` top:
```javascript
require("dotenv").config();
```

### 5. Create Project Structure

```bash
# Create directories
mkdir -p contracts test/unit test/integration test/gas scripts

# Create placeholder files
touch contracts/CarLease.sol
touch test/unit/.gitkeep
touch test/integration/.gitkeep
touch test/gas/.gitkeep
touch scripts/deploy.js
```

**Final Structure**:
```
TTM4195-CarLease/
├── contracts/
│   └── CarLease.sol
├── test/
│   ├── unit/
│   ├── integration/
│   └── gas/
├── scripts/
│   └── deploy.js
├── hardhat.config.js
├── package.json
├── .env (not committed)
└── specs/001-nft-lease-system/  (already exists)
```

---

## Development Workflow (TDD)

### Test-First Development (Principle III)

**Golden Rule**: Write tests BEFORE implementation.

### TDD Cycle

```
1. RED: Write failing test
   ↓
2. GREEN: Implement minimal code to pass
   ↓
3. REFACTOR: Optimize while keeping tests green
   ↓
Repeat
```

### Example: Implementing `mintOption()`

#### Step 1: Write Test (RED)

**File**: `test/unit/CarLease.mint.test.js`

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarLease - Minting (FR-001, FR-002)", function () {
  let carLease;
  let owner;
  let addr1;

  beforeEach(async function () {
    // Get signers
    [owner, addr1] = await ethers.getSigners();

    // Deploy contract
    const CarLease = await ethers.getContractFactory("CarLease");
    carLease = await CarLease.deploy();
  });

  describe("mintOption", function () {
    it("should mint NFT with valid metadata (FR-001, FR-002)", async function () {
      const tx = await carLease.mintOption(
        "Tesla Model 3",      // model
        "Blue",               // color
        2024,                 // year
        ethers.parseEther("30"),  // originalValueWei
        ethers.parseEther("0.5"), // monthlyPayment
        36,                   // durationMonths
        50000                 // mileageLimit
      );

      // Check OptionMinted event
      await expect(tx)
        .to.emit(carLease, "OptionMinted")
        .withArgs(
          1,  // tokenId
          "Tesla Model 3",
          "Blue",
          2024,
          ethers.parseEther("30")
        );

      // Verify NFT owned by contract (FR-003)
      expect(await carLease.ownerOf(1)).to.equal(await carLease.getAddress());

      // Verify metadata stored
      const metadata = await carLease.getCarMetadata(1);
      expect(metadata.model).to.equal("Tesla Model 3");
      expect(metadata.originalValueWei).to.equal(ethers.parseEther("30"));
    });

    it("should revert if model is empty (FR-001)", async function () {
      await expect(
        carLease.mintOption(
          "",  // Empty model
          "Blue",
          2024,
          ethers.parseEther("30"),
          ethers.parseEther("0.5"),
          36,
          50000
        )
      ).to.be.revertedWith("Model required");
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        carLease.connect(addr1).mintOption(
          "Tesla Model 3",
          "Blue",
          2024,
          ethers.parseEther("30"),
          ethers.parseEther("0.5"),
          36,
          50000
        )
      ).to.be.revertedWithCustomError(carLease, "OwnableUnauthorizedAccount");
    });
  });
});
```

#### Step 2: Implement Function (GREEN)

**File**: `contracts/CarLease.sol`

```solidity
function mintOption(
    string memory model,
    string memory color,
    uint16 year,
    uint256 originalValueWei,
    uint256 monthlyPayment,
    uint32 durationMonths,
    uint256 mileageLimit
) external onlyOwner returns (uint256) {
    require(bytes(model).length > 0, "Model required");
    require(originalValueWei > 0, "Value must be > 0");

    uint256 tokenId = _nextTokenId++;
    
    _safeMint(address(this), tokenId);
    
    carData[tokenId] = CarMetadata({
        model: model,
        color: color,
        year: year,
        originalValueWei: originalValueWei,
        mileageLimit: mileageLimit
    });
    
    emit OptionMinted(tokenId, model, color, year, originalValueWei);
    
    return tokenId;
}
```

#### Step 3: Run Tests

```bash
npx hardhat test test/unit/CarLease.mint.test.js
```

**Expected Output**:
```
  CarLease - Minting (FR-001, FR-002)
    mintOption
      ✔ should mint NFT with valid metadata (FR-001, FR-002)
      ✔ should revert if model is empty (FR-001)
      ✔ should revert if called by non-owner

  3 passing (2s)
```

#### Step 4: Refactor (if needed)

Optimize gas, improve readability, add comments.

---

## Testing

### Running Tests

**All Tests**:
```bash
npx hardhat test
```

**Specific Test File**:
```bash
npx hardhat test test/unit/CarLease.mint.test.js
```

**With Gas Reporting**:
```bash
REPORT_GAS=true npx hardhat test
```

**With Coverage**:
```bash
npx hardhat coverage
```

**Target**: >90% coverage (SC-005), 100% for security functions.

### Test Utilities

**Time Manipulation** (from research.md R-005):
```javascript
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Fast-forward 7 days
await time.increase(7 * 24 * 60 * 60);

// Set to specific timestamp
await time.increaseTo(lease.confirmDeadline + 1);
```

**Balance Checks**:
```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// Check balance changes
await expect(tx).to.changeEtherBalance(addr1, ethers.parseEther("1.5"));
```

**Event Assertions**:
```javascript
await expect(tx)
  .to.emit(carLease, "LeaseSignedRevealed")
  .withArgs(tokenId, lessee.address, 36, monthlyPayment, deposit, confirmDeadline);
```

### Test Fixtures (Reusable Setup)

**File**: `test/fixtures/carLeaseFixture.js`

```javascript
const { ethers } = require("hardhat");

async function deployCarLeaseFixture() {
  const [owner, lessee1, lessee2] = await ethers.getSigners();
  
  const CarLease = await ethers.getContractFactory("CarLease");
  const carLease = await CarLease.deploy();
  
  return { carLease, owner, lessee1, lessee2 };
}

async function mintedNFTFixture() {
  const { carLease, owner, lessee1, lessee2 } = await deployCarLeaseFixture();
  
  const tx = await carLease.mintOption(
    "Tesla Model 3",
    "Blue",
    2024,
    ethers.parseEther("30"),
    ethers.parseEther("0.5"),
    36,
    50000
  );
  
  const receipt = await tx.wait();
  const tokenId = 1;  // First minted NFT
  
  return { carLease, owner, lessee1, lessee2, tokenId };
}

module.exports = { deployCarLeaseFixture, mintedNFTFixture };
```

**Usage in Tests**:
```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { mintedNFTFixture } = require("../fixtures/carLeaseFixture");

it("should place commitment", async function () {
  const { carLease, lessee1, tokenId } = await loadFixture(mintedNFTFixture);
  
  const secret = ethers.id("my-secret");
  const commitment = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "bytes32", "address"],
      [tokenId, secret, lessee1.address]
    )
  );
  
  await carLease.connect(lessee1).commitToLease(tokenId, commitment);
  // ... assertions
});
```

---

## Local Deployment

### 1. Start Local Hardhat Network

**Terminal 1** (keep running):
```bash
npx hardhat node
```

**Output**:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...
```

### 2. Deploy Contract

**Terminal 2**:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**File**: `scripts/deploy.js`

```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CarLease contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const CarLease = await ethers.getContractFactory("CarLease");
  const carLease = await CarLease.deploy();
  await carLease.waitForDeployment();

  const address = await carLease.getAddress();
  console.log("CarLease deployed to:", address);
  
  // Mint sample NFT
  console.log("\nMinting sample NFT...");
  const tx = await carLease.mintOption(
    "Tesla Model 3",
    "Blue",
    2024,
    ethers.parseEther("30"),
    ethers.parseEther("0.5"),
    36,
    50000
  );
  await tx.wait();
  console.log("Sample NFT minted (tokenId: 1)");
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. Interact via Console

```bash
npx hardhat console --network localhost
```

**Example Interactions**:
```javascript
// Get contract instance
const CarLease = await ethers.getContractFactory("CarLease");
const carLease = CarLease.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");  // Use deployed address

// Check metadata
const metadata = await carLease.getCarMetadata(1);
console.log("Model:", metadata.model);

// Place commitment
const [owner, lessee] = await ethers.getSigners();
const secret = ethers.id("test-secret");
const commitment = ethers.keccak256(
  ethers.solidityPacked(["uint256", "bytes32", "address"], [1, secret, lessee.address])
);
await carLease.connect(lessee).commitToLease(1, commitment);

// Reveal and pay deposit
const deposit = ethers.parseEther("1.5");  // 3x 0.5 ETH
await carLease.connect(lessee).revealAndPay(1, secret, 36, ethers.parseEther("0.5"), { value: deposit });
```

---

## Testnet Deployment

### 1. Get Testnet ETH

**Sepolia Faucets**:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

**Mumbai Faucets**:
- https://faucet.polygon.technology/

### 2. Configure RPC URLs

Update `.env` with your RPC provider (Alchemy/Infura):
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key  # From MetaMask or similar
```

### 3. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output**:
```
Deploying CarLease contract...
Deploying with account: 0xYourAddress
Account balance: 0.5
CarLease deployed to: 0xContractAddress
Sample NFT minted (tokenId: 1)
```

**Save Contract Address**: You'll need it for verification and interaction.

---

## Contract Verification

### 1. Verify on Etherscan

```bash
npx hardhat verify --network sepolia 0xYourContractAddress
```

**Expected Output**:
```
Successfully verified contract CarLease on Etherscan.
https://sepolia.etherscan.io/address/0xYourContractAddress#code
```

### 2. Verify with Constructor Arguments (if any)

If you add constructor parameters later:
```bash
npx hardhat verify --network sepolia 0xYourContractAddress "arg1" "arg2"
```

### 3. View Verified Contract

Visit Etherscan link to:
- View source code
- Interact via "Write Contract" tab
- Read contract state via "Read Contract" tab
- See transaction history

---

## Troubleshooting

### Issue 1: "Module not found" Errors

**Symptom**:
```
Error: Cannot find module '@openzeppelin/contracts/token/ERC721/ERC721.sol'
```

**Solution**:
```bash
npm install @openzeppelin/contracts
npx hardhat clean
npx hardhat compile
```

### Issue 2: "Insufficient Funds" During Deployment

**Symptom**:
```
Error: insufficient funds for intrinsic transaction cost
```

**Solution**:
- Get more testnet ETH from faucet
- Check balance: `npx hardhat console --network sepolia` → `ethers.formatEther(await ethers.provider.getBalance("0xYourAddress"))`

### Issue 3: Tests Failing with "Reverted" Errors

**Symptom**:
```
Error: Transaction reverted without a reason string
```

**Debug Steps**:
1. Add `console.log()` in Solidity:
   ```solidity
   import "hardhat/console.sol";
   
   function myFunction() external {
       console.log("Debug: value =", someValue);
   }
   ```

2. Run test with stack traces:
   ```bash
   npx hardhat test --stack-traces
   ```

3. Check gas limits (might be running out of gas)

### Issue 4: Coverage Report Incomplete

**Symptom**: Some files not appearing in coverage.

**Solution**:
```bash
# Clean artifacts
npx hardhat clean

# Re-run coverage
npx hardhat coverage
```

### Issue 5: RPC Rate Limiting

**Symptom**:
```
Error: Too many requests (429)
```

**Solution**:
- Upgrade to paid Alchemy/Infura plan
- Add delay between transactions in scripts:
  ```javascript
  await tx.wait();
  await new Promise(resolve => setTimeout(resolve, 2000));  // 2 sec delay
  ```

---

## Next Steps

1. ✅ **Environment Setup Complete** → Proceed to implementation
2. 📝 **Generate Task List**: Run `/speckit.tasks` command
3. 🔨 **Implement Features**: Follow TDD workflow (RED → GREEN → REFACTOR)
4. ✅ **Run Tests After Each FR**: Maintain >90% coverage
5. 📊 **Gas Benchmarking**: Run `REPORT_GAS=true npx hardhat test` periodically
6. 🚀 **Testnet Deployment**: Deploy to Sepolia after all tests pass
7. 🔍 **Security Audit**: Consider external audit before mainnet

---

## Useful Commands Cheatsheet

```bash
# Compilation
npx hardhat compile

# Testing
npx hardhat test                              # All tests
npx hardhat test test/unit/*.test.js          # Unit tests only
REPORT_GAS=true npx hardhat test              # With gas reporting
npx hardhat coverage                          # Coverage report

# Local Network
npx hardhat node                              # Start local node
npx hardhat run scripts/deploy.js --network localhost
npx hardhat console --network localhost       # Interactive console

# Testnet Deployment
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat verify --network sepolia 0xAddress

# Utilities
npx hardhat clean                             # Clean artifacts
npx hardhat accounts                          # List test accounts
npx hardhat help                              # Show all commands
```

---

## Developer Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **Chai Matchers**: https://hardhat.org/hardhat-chai-matchers/docs/overview
- **Solidity Docs**: https://docs.soliditylang.org/

**Project Docs**:
- Feature Specification: `specs/001-nft-lease-system/spec.md`
- Data Model: `specs/001-nft-lease-system/data-model.md`
- Contract Interface: `specs/001-nft-lease-system/contracts/CarLease.sol.md`
- Constitution: `.specify/memory/constitution.md`

---

**Status**: ✅ Quickstart guide complete - ready for task generation via `/speckit.tasks`
