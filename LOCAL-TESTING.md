# Local Testing Guide

This guide shows you how to test the CarLease smart contract locally using Hardhat's built-in network.

## Prerequisites

- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Quick Start

### 1. Start Local Blockchain

Open a terminal and start the Hardhat node:

```bash
npx hardhat node
```

This starts a local blockchain at `http://127.0.0.1:8545` with 20 pre-funded test accounts (10,000 ETH each).

**Keep this terminal running!**

### 2. Deploy the Contract

In a **new terminal**, deploy the CarLease contract to the local network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

You'll see output like:

```
✅ CarLease deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 3. Run the Interactive Demo

Execute the complete lease lifecycle demo:

```bash
npx hardhat run scripts/interact.js --network localhost
```

This demonstrates:
- 🏪 Dealer minting a lease option NFT
- 💳 Customer committing to lease (commit-reveal)
- 🔓 Customer revealing identity and paying deposit
- ✅ Dealer confirming the lease
- 💰 Customer making first monthly payment

## What You'll See

The demo script shows a complete lease lifecycle:

```
🚗 CarLease Contract Local Interaction Demo
============================================================

1️⃣  Dealer mints lease option NFT...
   ✅ NFT minted: Token ID 3
   🚗 Car: Tesla Model 3 Blue (2024)
   💰 Car value: 50.0 ETH
   💵 Monthly payment: 1.0 ETH
   📅 Duration: 12 months

2️⃣  Customer commits to lease...
   ✅ Commitment registered
   🔐 Commit hash: 0xda29a51d...

3️⃣  Customer reveals identity and pays deposit...
   ✅ Reveal successful
   💰 Deposit paid: 3.0 ETH (3x monthly)

4️⃣  Dealer confirms lease activation...
   ✅ Lease activated!

5️⃣  Customer makes first monthly payment...
   ⏰ Advancing time by 30 days...
   ✅ Payment #1 made
   💵 Amount: 1.0 ETH

📊 Final Lease Status:
   Dealer:          0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Customer:        0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Monthly payment: 1.0 ETH
   Payments made:   1/12
   Active:          true
   Deposit held:    3.0 ETH
```

## Test Accounts

The local network provides test accounts with private keys:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Dealer)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Customer)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

⚠️ **WARNING**: These are publicly known test accounts. Never use them on mainnet!

## Running Tests

To run the full test suite (108 tests):

```bash
npx hardhat test
```

Expected output:

```
  108 passing (5s)
```

## Interacting Manually

You can also interact with the deployed contract using Hardhat console:

```bash
npx hardhat console --network localhost
```

Then in the console:

```javascript
const CarLease = await ethers.getContractFactory("CarLease");
const contract = CarLease.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Check next token ID
const nextId = await contract.nextTokenId();
console.log("Next Token ID:", nextId.toString());

// Get lease details
const lease = await contract.leases(1);
console.log("Lease:", lease);
```

## Stopping the Local Network

To stop the local Hardhat node, press `Ctrl+C` in the terminal where it's running.

## What's Happening?

1. **Local Blockchain**: Hardhat node creates an in-memory Ethereum blockchain
2. **Instant Mining**: Transactions are mined instantly (no waiting)
3. **Time Travel**: Scripts can advance time using `evm_increaseTime`
4. **State Reset**: Restart the node to reset all state
5. **Gas Reporting**: All gas costs are tracked and visible

## Key Features Demonstrated

- ✅ NFT minting with car metadata
- ✅ Commit-reveal scheme (front-running protection)
- ✅ Bilateral deposit protection
- ✅ Monthly payment tracking
- ✅ Time-based payment requirements
- ✅ Lease lifecycle management

## Troubleshooting

### "Cannot connect to network"
- Make sure the Hardhat node is running (`npx hardhat node`)
- Check that it's listening on port 8545

### "Nonce too high"
- Restart the Hardhat node to reset state
- Or use `--reset` flag: `npx hardhat node --reset`

### Contract address changed
- Update the contract address in `scripts/interact.js` with the new deployment address
- This happens every time you restart the node

## Next Steps

- ✅ Local testing complete
- 🚀 Ready for testnet deployment (Sepolia/Mumbai)
- 📝 See `specs/001-nft-lease-system/deployment.md` for testnet instructions

## Learn More

- [Hardhat Network Documentation](https://hardhat.org/hardhat-network/)
- [Project README](./README.md)
- [Deployment Guide](./specs/001-nft-lease-system/deployment.md)
