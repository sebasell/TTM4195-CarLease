# CarLease - NFT-Based Car Leasing Smart Contract

Production-ready smart contract for NFT-based car leasing with bilateral deposit protection and commit-reveal scheme for front-running prevention.

## 📋 Overview

This contract enables:
- **NFT-based lease options** - Each car lease is represented as an ERC-721 token
- **Commit-reveal scheme** - Prevents front-running during lease commitment
- **Bilateral deposits** - Both dealer and customer protection through deposit mechanisms
- **Monthly payments** - Automated monthly payment tracking over lease duration
- **Lease termination** - Support for voluntary and early termination

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY

# Deployment wallet (for testnet/mainnet)
PRIVATE_KEY=your_private_key_here

# Etherscan API keys (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### Local Testing

1. **Start local blockchain:**
```bash
npx hardhat node
```

2. **Deploy contract (in new terminal):**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. **Run interaction demo:**
```bash
npx hardhat run scripts/interact.js --network localhost
```

### Testnet Deployment

**Deploy to Sepolia:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Verify on Etherscan:**
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 📝 Contract Interface

### Key Functions

#### For Dealers (Owner)
- `mintOption()` - Mint new lease option NFT with car details
- `confirmLease()` - Confirm customer's lease after reveal
- `terminateLease()` - Terminate active lease
- `claimDeposit()` - Claim customer's deposit after default

#### For Customers
- `commitToLease()` - Commit to lease (commit-reveal step 1)
- `revealAndPay()` - Reveal identity and pay deposit (step 2)
- `makeMonthlyPayment()` - Make monthly lease payment
- `refundUnconfirmedDeposit()` - Get refund if dealer doesn't confirm
- `terminateLease()` - Voluntarily terminate lease

### View Functions
- `leases()` - Get lease details by token ID
- `carData()` - Get car metadata by token ID
- `commits()` - Get commitment details by token ID

## 🏗️ Project Structure

```
CarLease/
├── contracts/
│   └── CarLease.sol          # Main smart contract
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── interact.js           # Demo interaction script
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔒 Security Features

- ✅ **ReentrancyGuard** - Protection against reentrancy attacks
- ✅ **Ownable** - Dealer-only functions protected
- ✅ **Commit-Reveal** - Front-running prevention for lease commitments
- ✅ **Time locks** - Deposit refunds after dealer confirmation deadline
- ✅ **Payment validation** - Exact payment amounts required

## 📊 Contract Details

- **Solidity Version**: ^0.8.20
- **License**: MIT
- **OpenZeppelin**: v5.2.2
- **ERC-721**: NFT standard implementation
- **Deposit Requirement**: 3x monthly payment
- **Commit Window**: 1 hour to reveal after commit
- **Confirm Window**: 24 hours for dealer to confirm

## 🧪 Features

### 1. Lease Option Minting
Dealers mint NFTs representing car lease options with:
- Car metadata (model, color, year, value, mileage limit)
- Payment terms (monthly amount, duration)

### 2. Commit-Reveal Scheme
Prevents front-running:
1. Customer commits with hash(tokenId + secret + address)
2. Customer reveals within 1 hour and pays 3x monthly deposit
3. Dealer confirms within 24 hours to activate lease

### 3. Monthly Payments
- Payments due every 30 days from lease start
- Exact payment amount required
- Payment tracking for lease completion

### 4. Termination & Deposits
- **Customer terminates**: Loses deposit (goes to dealer)
- **Dealer terminates**: Deposit returned to customer
- **Lease completes**: Deposit returned to customer
- **Default**: Dealer can claim deposit if customer misses payments

## 📄 License

MIT License - see contract file for details

## 🔗 Links

- **GitHub**: [sebasell/TTM4195-CarLease](https://github.com/sebasell/TTM4195-CarLease)
- **Full Documentation**: Available in `001-nft-lease-system` branch
- **Tests**: Available in `001-nft-lease-system` branch (108 tests, 97.5% coverage)

## ⚙️ Development

Built with:
- Hardhat v2.26.5
- Ethers.js v6.x
- OpenZeppelin Contracts v5.2.2

For full development documentation, test suite, and detailed specifications, see the `001-nft-lease-system` branch.

## 🎯 Production Ready

This branch contains only the essential files needed to:
- ✅ Deploy the contract
- ✅ Interact with deployed contracts
- ✅ Run local demos
- ✅ Verify on block explorers

For development, testing, and detailed documentation, use the `001-nft-lease-system` branch.
