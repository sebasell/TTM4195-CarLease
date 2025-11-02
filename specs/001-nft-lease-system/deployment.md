# Deployment Guide

**Feature**: 001-nft-lease-system  
**Date**: 2025-11-02  
**Status**: Ready for testnet deployment

## Prerequisites

### 1. Environment Setup

Ensure your `.env` file contains:

```bash
# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY

# Deployer Private Key (DO NOT COMMIT!)
PRIVATE_KEY=0x1234567890abcdef...

# Block Explorer API Keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY

# Optional: For gas reporting
COINMARKETCAP_API_KEY=YOUR_CMC_API_KEY

# Optional: Mint sample NFT on deployment
MINT_SAMPLE_NFT=true
```

### 2. Get Testnet ETH

**Sepolia Faucets**:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

**Mumbai Faucets**:
- https://faucet.polygon.technology/
- https://mumbaifaucet.com/

**Minimum Required**: 0.1 ETH (deployment ~0.003 ETH + buffer for testing)

---

## Deployment Process

### Step 1: Verify Pre-Deployment

Run all tests to ensure contract is production-ready:

```bash
# Run full test suite
npx hardhat test

# Run coverage analysis
npx hardhat coverage

# Run gas benchmarks
npx hardhat test test/gas/gas-benchmarks.test.js
```

**Expected Results**:
- ✅ 108 tests passing
- ✅ 97.5% statement coverage
- ✅ 100% function coverage
- ✅ All gas targets met

---

### Step 2: Deploy to Sepolia Testnet

```bash
# Deploy contract only
npx hardhat run scripts/deploy.js --network sepolia

# Deploy and mint sample NFT
MINT_SAMPLE_NFT=true npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output**:
```
🚀 Starting CarLease Contract Deployment...
============================================================
📍 Deploying from address: 0xYourAddress
💰 Deployer balance: 0.5 ETH

📦 Deploying CarLease contract...
✅ CarLease deployed to: 0xContractAddress

============================================================
📋 Deployment Summary
============================================================
Network: sepolia (Chain ID: 11155111)
Contract: 0xContractAddress
Deployer: 0xYourAddress
Block: 12345678
============================================================
```

**Save Contract Address**:
```bash
# Add to .env
echo "CARLEASE_ADDRESS=0xContractAddress" >> .env

# Or update deployment-addresses.json
```

---

### Step 3: Verify Contract on Etherscan

```bash
npx hardhat verify --network sepolia 0xContractAddress
```

**Expected Output**:
```
Successfully submitted source code for contract
contracts/CarLease.sol:CarLease at 0xContractAddress
for verification on the block explorer. Waiting for verification result...

Successfully verified contract CarLease on Etherscan.
https://sepolia.etherscan.io/address/0xContractAddress#code
```

**If Verification Fails**:

1. **Check constructor arguments**: CarLease has no constructor args
2. **Wait 30 seconds**: Block explorer needs time to index
3. **Manual verification**: Use Etherscan GUI with:
   - Compiler: 0.8.20
   - Optimization: Enabled (200 runs)
   - License: MIT

---

### Step 4: Test on Etherscan

Visit: `https://sepolia.etherscan.io/address/0xContractAddress#writeContract`

#### Test 1: Mint NFT Option

**Function**: `mintOption`

**Parameters**:
- `_model`: "Tesla Model 3"
- `_color`: "Blue"
- `_year`: 2024
- `_originalValueWei`: 30000000000000000000 (30 ETH)
- `_monthlyPayment`: 500000000000000000 (0.5 ETH)
- `_durationMonths`: 36
- `_mileageLimit`: 50000

**Expected**:
- ✅ Transaction succeeds
- ✅ OptionMinted event emitted
- ✅ Token ID: 1

#### Test 2: Commit to Lease

**Function**: `commitToLease`

**Parameters**:
- `tokenId`: 1
- `commitment`: 0x... (keccak256 hash - generate off-chain)

**Generate Commitment** (using ethers.js):
```javascript
const secret = ethers.id("my-secret-phrase");
const commitment = ethers.keccak256(
  ethers.solidityPacked(
    ["uint256", "bytes32", "address"],
    [1, secret, "0xYourAddress"]
  )
);
console.log(commitment);
```

**Expected**:
- ✅ Transaction succeeds
- ✅ CommitPlaced event emitted
- ✅ 7-day deadline set

#### Test 3: View Functions

**Read Contract Tab**: Test view functions

- `getCarMetadata(1)` - Returns car details
- `getLease(1)` - Returns lease state
- `getCommit(1)` - Returns commitment data
- `isPaymentCurrent(1)` - Returns false (not active yet)
- `isCommitmentValid(1)` - Returns true (within 7 days)

---

## Deployment Checklist

### Pre-Deployment ✅

- [x] All 108 tests passing
- [x] Coverage >90% (97.5% statements)
- [x] Gas benchmarks met (all functions under target)
- [x] Security audit complete (Constitution compliant)
- [x] Environment variables configured
- [x] Testnet ETH acquired (>0.1 ETH)

### Deployment ✅

- [ ] Deploy to Sepolia testnet
- [ ] Save contract address to deployment-addresses.json
- [ ] Verify contract on Etherscan
- [ ] Test mintOption() on Etherscan
- [ ] Test commitToLease() on Etherscan
- [ ] Test view functions on Etherscan

### Post-Deployment ✅

- [ ] Document deployed address in README.md
- [ ] Create Etherscan link in documentation
- [ ] Test full lease lifecycle on testnet
- [ ] Monitor contract for 24 hours
- [ ] Prepare mainnet deployment plan (if applicable)

---

## Network Information

### Sepolia Testnet

| Property | Value |
|----------|-------|
| **Chain ID** | 11155111 |
| **RPC URL** | https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY |
| **Explorer** | https://sepolia.etherscan.io/ |
| **Currency** | SepoliaETH (testnet) |
| **Faucet** | https://sepoliafaucet.com/ |

### Mumbai Testnet (Polygon)

| Property | Value |
|----------|-------|
| **Chain ID** | 80001 |
| **RPC URL** | https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY |
| **Explorer** | https://mumbai.polygonscan.com/ |
| **Currency** | MATIC (testnet) |
| **Faucet** | https://faucet.polygon.technology/ |

---

## Contract Interaction Examples

### Using Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
// Get contract instance
const CarLease = await ethers.getContractFactory("CarLease");
const carLease = CarLease.attach("0xContractAddress");

// Mint NFT
const tx = await carLease.mintOption(
  "BMW i4",
  "Black",
  2024,
  ethers.parseEther("25"),
  ethers.parseEther("0.4"),
  24,
  40000
);
await tx.wait();
console.log("NFT minted!");

// Get car data
const car = await carLease.getCarMetadata(1);
console.log("Model:", car.model);
console.log("Color:", car.color);
console.log("Year:", car.year.toString());
```

### Using Ethers.js Script

```javascript
const { ethers } = require("ethers");

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract ABI and address
const abi = [...]; // From artifacts/contracts/CarLease.sol/CarLease.json
const contractAddress = "0xContractAddress";

// Create contract instance
const carLease = new ethers.Contract(contractAddress, abi, wallet);

// Interact with contract
const tx = await carLease.mintOption(
  "Porsche Taycan",
  "White",
  2024,
  ethers.parseEther("40"),
  ethers.parseEther("0.8"),
  48,
  60000
);

const receipt = await tx.wait();
console.log("Transaction:", receipt.hash);
```

---

## Troubleshooting

### Deployment Issues

**Error: Insufficient funds**
- Solution: Get more testnet ETH from faucet
- Required: ~0.003 ETH for deployment + buffer

**Error: Replacement transaction underpriced**
- Solution: Increase gas price or wait for previous tx to confirm
- Clear pending transactions in MetaMask

**Error: Network not configured**
- Solution: Check hardhat.config.js has correct RPC URL
- Verify .env file has SEPOLIA_RPC_URL

### Verification Issues

**Error: Contract source code already verified**
- Solution: Already done! Check Etherscan
- Visit contract page to confirm

**Error: Compilation failed**
- Solution: Ensure compiler version matches (0.8.20)
- Check optimization settings (enabled, 200 runs)

**Error: Invalid constructor arguments**
- Solution: CarLease has no constructor args
- Leave constructor arguments empty

---

## Gas Costs (Sepolia Testnet)

| Operation | Gas Used | Cost @ 2 Gwei | Cost @ 5 Gwei |
|-----------|----------|---------------|---------------|
| **Deployment** | ~3,130,000 | ~0.006 ETH | ~0.016 ETH |
| **Mint NFT** | ~194,000 | ~0.0004 ETH | ~0.001 ETH |
| **Commit** | ~73,500 | ~0.00015 ETH | ~0.00037 ETH |
| **Reveal** | ~123,000 | ~0.00025 ETH | ~0.00062 ETH |
| **Confirm** | ~50,000 | ~0.0001 ETH | ~0.00025 ETH |
| **Payment** | ~37,000 | ~0.000074 ETH | ~0.00019 ETH |

**Total for Full Lifecycle**: ~0.007 ETH @ 2 Gwei (deployment + 1 lease)

---

## Production Deployment (Mainnet)

### ⚠️ BEFORE MAINNET DEPLOYMENT

1. **Security Audit**: Complete professional audit
2. **Bug Bounty**: Run 30-day bug bounty program
3. **Insurance**: Consider smart contract insurance
4. **Multisig**: Deploy from multisig wallet (Gnosis Safe)
5. **Testnet Testing**: Run on Sepolia for 2+ weeks
6. **Monitoring**: Set up contract monitoring (OpenZeppelin Defender)

### Mainnet Deployment Steps

**NOT RECOMMENDED YET** - Complete testnet validation first

```bash
# Deploy to mainnet (ONLY after thorough testing)
npx hardhat run scripts/deploy.js --network mainnet

# Verify on mainnet
npx hardhat verify --network mainnet 0xContractAddress
```

**Mainnet Gas Costs** (estimate @ 30 Gwei):
- Deployment: ~0.09 ETH
- Mint NFT: ~0.006 ETH
- Full lease cycle: ~0.015 ETH

---

## Monitoring & Maintenance

### Event Monitoring

Use Etherscan or The Graph to monitor events:
- OptionMinted
- CommitPlaced
- LeaseSignedRevealed
- LeaseConfirmed
- MonthlyPaid
- LeaseTerminated
- DepositClaimed
- RefundUnconfirmed

### Health Checks

Daily monitoring:
1. Check active leases count
2. Monitor deposit holdings
3. Track payment success rate
4. Watch for unusual patterns

### Emergency Procedures

If critical bug found:
1. Pause new mints (owner control)
2. Alert all active lessees
3. Coordinate with active leases for migration
4. Deploy patched version
5. Assist users in transitioning

---

## Support & Resources

**Documentation**:
- Technical Spec: `specs/001-nft-lease-system/plan.md`
- Test Coverage: `specs/001-nft-lease-system/test-coverage.md`
- Gas Analysis: `specs/001-nft-lease-system/gas-analysis.md`

**Deployed Contracts**:
- Sepolia: Check `deployment-addresses.json`
- Mumbai: Check `deployment-addresses.json`

**Tools**:
- Hardhat Console: `npx hardhat console --network sepolia`
- Etherscan: https://sepolia.etherscan.io/
- OpenZeppelin Defender: https://defender.openzeppelin.com/

---

**Deployment Status**: Ready for testnet deployment ✅  
**Last Updated**: 2025-11-02  
**Next Steps**: Deploy to Sepolia and verify
