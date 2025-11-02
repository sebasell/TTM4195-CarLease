# Research Document: NFT-Based Car Leasing Smart Contract

**Feature**: 001-nft-lease-system  
**Created**: 2025-11-02  
**Purpose**: Resolve technical unknowns and establish technology choices for implementation

---

## R-001: Testing Framework Selection

### Decision

**Selected**: **Hardhat**

### Rationale

After evaluating Hardhat and Foundry for this project's needs, Hardhat is selected for the following reasons:

1. **TypeScript/JavaScript Test Syntax**: Better alignment with web development ecosystem and more readable tests for acceptance scenarios
2. **Mature Ecosystem**: Extensive plugin ecosystem (hardhat-gas-reporter, hardhat-deploy, hardhat-etherscan)
3. **OpenZeppelin Integration**: Seamless compatibility with OpenZeppelin test helpers and utilities
4. **Console.log Support**: Native console.log in Solidity for debugging (helpful during TDD)
5. **Documentation Quality**: Comprehensive documentation for test-first development workflows
6. **Community Adoption**: Larger community for troubleshooting and examples

### Alternatives Considered

**Foundry**:
- **Pros**: Faster test execution (written in Rust), Solidity-based tests, better gas optimization tooling
- **Cons**: Steeper learning curve, less mature plugin ecosystem, fewer examples for commit-reveal patterns
- **Rejected Because**: TDD workflow benefits more from readable TypeScript tests, and the project doesn't have performance constraints requiring Foundry's speed advantage

### Implementation Impact

**Development Dependencies**:
```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^3.0.0",
    "@nomicfoundation/hardhat-network-helpers": "^1.0.0",
    "@nomiclabs/hardhat-etherscan": "^3.1.0",
    "hardhat": "^2.19.0",
    "hardhat-gas-reporter": "^1.0.9",
    "@openzeppelin/hardhat-upgrades": "^2.0.0"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.0"
  }
}
```

**Test Structure**: JavaScript/TypeScript test files in `test/` directory
**Gas Reporting**: hardhat-gas-reporter plugin for SC-007 validation
**Deployment**: hardhat-deploy plugin for repeatable deployments
**Verification**: hardhat-etherscan plugin for contract verification

---

## R-002: Commit-Reveal Pattern Best Practices

### Research Summary

The commit-reveal pattern is critical for preventing front-running attacks (FR-038, User Story 5). Research into Ethereum smart contract patterns reveals:

### Key Implementation Details

**Commitment Hash Structure**:
```solidity
bytes32 commitment = keccak256(abi.encodePacked(tokenId, secret, msg.sender));
```

**Why This Structure**:
- `tokenId`: Binds commitment to specific NFT
- `secret`: Ensures uniqueness and prevents brute-force attacks (should be 32 bytes minimum)
- `msg.sender`: Binds commitment to committer's address, prevents commitment stealing

**Timing Windows**:
- **Commit Window**: Open-ended (users can commit anytime)
- **Reveal Window**: 7 days from commit (REVEAL_WINDOW constant)
- **Confirmation Window**: 7 days from reveal (CONFIRM_WINDOW constant)

**Security Considerations**:
1. **Salt Requirements**: Secret must be sufficiently random (32 bytes recommended)
2. **Replay Protection**: Include msg.sender in hash prevents address-switching attacks
3. **Expired Commitment Handling**: Expired commitments can be overwritten (storage optimization)
4. **Race Condition Prevention**: First successful reveal locks the NFT (subsequent reveals fail)

### Best Practices Applied

- ✅ Use `abi.encodePacked` for efficient hashing
- ✅ Include sender address in hash for binding
- ✅ Set reasonable deadline (7 days prevents indefinite lock)
- ✅ Allow commitment overwriting after expiration (gas-efficient)
- ✅ Emit events for commit and reveal for off-chain monitoring

### References

- OpenZeppelin: "Commit-Reveal Pattern for Ethereum" (community forum discussions)
- Consensys Best Practices: "Smart Contract Security Best Practices - Front-Running"
- EIP-721: Non-Fungible Token Standard (for NFT integration)

---

## R-003: Gas Optimization Techniques for ERC721

### Research Summary

Gas optimization is Constitution Principle II. Research into ERC721 implementations and Solidity patterns reveals optimization opportunities:

### Struct Packing Strategy

**Optimal CarMetadata Packing**:
```solidity
struct CarMetadata {
    string model;           // Dynamic (32-byte pointer + length + data)
    string color;           // Dynamic (32-byte pointer + length + data)
    uint16 year;            // 2 bytes (range: 0-65535, sufficient for years)
    uint256 originalValueWei; // 32 bytes (ETH amounts need full precision)
    uint256 mileageLimit;   // 32 bytes (large numbers possible)
}
```

**Optimal Lease Packing** (saves ~2 storage slots):
```solidity
struct Lease {
    address lessee;         // 20 bytes
    uint64 startTime;       // 8 bytes | Slot 1: 20+8+4 = 32 bytes ✅
    uint32 durationMonths;  // 4 bytes /
    
    uint256 monthlyPayment; // 32 bytes - Slot 2 ✅
    uint256 deposit;        // 32 bytes - Slot 3 ✅
    
    uint32 paymentsMade;    // 4 bytes
    uint64 lastPaymentTime; // 8 bytes
    bool active;            // 1 byte  | Slot 4: 4+8+1+1+8 = 22 bytes (padded to 32)
    bool exists;            // 1 byte  |
    uint64 confirmDeadline; // 8 bytes /
}
```

**Gas Savings**: ~2 storage slots × 20,000 gas per SSTORE = ~40,000 gas saved per lease creation

### Additional Optimizations

**1. Event Indexing Strategy** (SC-010):
- Index parameters used for filtering (tokenId, address)
- Limit to 3 indexed params per event (EVM limit)
- Non-indexed params for display-only data

**2. Storage Access Patterns**:
- Cache storage variables in memory when accessed multiple times in same function
- Use memory for temporary structs during validation
- Read from storage once, operate in memory, write back once

**3. Avoiding Unbounded Arrays**:
- ❌ Don't store payment history array (grows unbounded)
- ✅ Use payment counter + lastPaymentTime + events for history
- ✅ Off-chain systems reconstruct history from events

**4. String Optimization**:
- Consider IPFS hash (32 bytes) for long model names in v2.0
- For v1.0: Store strings directly (acceptable for MVP gas costs)
- Most lease options will have short model names ("Model 3", "Model Y")

### Performance Targets (from SC-007)

| Operation | Target Gas | Optimization Applied |
|-----------|-----------|---------------------|
| Deployment | <3,500,000 | Efficient struct packing, minimal contract size |
| mintOption() | <200,000 | Packed CarMetadata, event-only metadata storage |
| commitToLease() | <80,000 | Simple hash storage, minimal state changes |
| revealAndPay() | <150,000 | Deposit handling with ReentrancyGuard overhead |
| makeMonthlyPayment() | <80,000 | Simple counter increment + timestamp update |
| claimDeposit() | <120,000 | Transfer with ReentrancyGuard overhead |

### Tools for Validation

- **hardhat-gas-reporter**: Automatic gas reporting in test output
- **Gas Snapshots**: Track gas changes across commits
- **Profiling**: Identify high-cost operations during development

---

## R-004: ReentrancyGuard Implementation

### Research Summary

ReentrancyGuard is required by FR-034 for all ETH transfer functions. OpenZeppelin provides battle-tested implementation:

### How ReentrancyGuard Works

**Mechanism**: Simple mutex lock using storage variable
```solidity
contract ReentrancyGuard {
    uint256 private _status;
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}
```

**Gas Cost**: ~2,100 gas per protected function call (SLOAD + SSTORE)

### Functions Requiring Protection

Per FR-034, apply `nonReentrant` modifier to:
1. `revealAndPay()` - Customer pays deposit (ETH in)
2. `makeMonthlyPayment()` - Customer pays monthly (ETH in)
3. `claimDeposit()` - Dealer claims deposit (ETH out)
4. `refundUnconfirmedDeposit()` - Customer gets refund (ETH out)
5. `extendLease()` - Customer pays additional deposit (ETH in)

### Checks-Effects-Interactions Pattern

FR-035 requires this pattern alongside ReentrancyGuard:

```solidity
function claimDeposit(uint256 tokenId) external onlyOwner nonReentrant {
    // CHECKS: Validate conditions
    Lease storage lease = leases[tokenId];
    require(lease.exists, "Lease does not exist");
    require(lease.active, "Lease not active");
    require(block.timestamp > lease.lastPaymentTime + PAYMENT_GRACE, "Grace period not expired");
    
    // EFFECTS: Update state
    uint256 depositAmount = lease.deposit;
    lease.active = false;
    lease.deposit = 0;
    
    // INTERACTIONS: External calls
    emit DepositClaimed(tokenId, msg.sender, depositAmount);
    (bool success, ) = msg.sender.call{value: depositAmount}("");
    require(success, "ETH transfer failed");
}
```

**Pattern Benefits**:
- State updated before external call (prevents reentrancy exploitation)
- ReentrancyGuard provides defense-in-depth (belt and suspenders)
- Clear code structure improves auditability

---

## R-005: Testing Strategy for Smart Contracts

### Research Summary

TDD is Constitution Principle III (NON-NEGOTIABLE). Research into smart contract testing best practices:

### Test Organization Structure

**Three-Layer Testing** (aligned with spec):

1. **Unit Tests** (test/ unit/):
   - Test individual functions in isolation
   - Mock dependencies when needed
   - Focus on FR-001 through FR-047 validation
   - Target: >90% coverage (SC-009)

2. **Integration Tests** (test/integration/):
   - Test complete user workflows end-to-end
   - No mocking - use real contract interactions
   - Validate User Stories 1-5
   - Test multi-transaction sequences

3. **Gas Tests** (test/gas/):
   - Measure gas consumption for critical operations
   - Validate SC-007 performance targets
   - Track gas changes across commits
   - Identify optimization opportunities

### Hardhat Test Utilities

**Essential Libraries**:
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
```

**Key Utilities**:
- `time.increase(seconds)`: Fast-forward blockchain time (for deadline testing)
- `time.latest()`: Get current block timestamp
- `ethers.provider.getBalance(address)`: Check ETH balances
- `expect(tx).to.emit(contract, "EventName")`: Validate event emission
- `expect(tx).to.be.revertedWith("Error message")`: Test error conditions

### Test Fixtures Pattern

**Why**: Reusable deployment + setup state across tests
```javascript
async function deployCarLeaseFixture() {
    const [owner, customer1, customer2] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const contract = await CarLease.deploy();
    await contract.deployed();
    return { contract, owner, customer1, customer2 };
}

it("should test something", async function() {
    const { contract, owner, customer1 } = await loadFixture(deployCarLeaseFixture);
    // Test logic here
});
```

**Benefits**: Fast test execution (snapshot + restore), consistent starting state

### TDD Workflow

**Red-Green-Refactor**:
1. **RED**: Write test for acceptance scenario → Test fails (function doesn't exist yet)
2. **GREEN**: Implement minimal code to make test pass
3. **REFACTOR**: Optimize code while keeping tests green

**Example for FR-001**:
```javascript
// RED: Write test first
describe("mintOption", function() {
    it("should mint NFT with correct metadata", async function() {
        const { contract, owner } = await loadFixture(deployCarLeaseFixture);
        
        const tx = await contract.mintOption(
            "Tesla Model 3",
            "Blue",
            2024,
            ethers.utils.parseEther("30"),
            100000
        );
        
        expect(tx).to.emit(contract, "OptionMinted");
        const carData = await contract.carData(1);
        expect(carData.model).to.equal("Tesla Model 3");
        expect(carData.year).to.equal(2024);
    });
});

// Test fails → Implement mintOption() → Test passes → Refactor if needed
```

### Coverage Requirements (SC-009)

**Hardhat Coverage Plugin**:
```bash
npm install --save-dev solidity-coverage
npx hardhat coverage
```

**Targets**:
- Overall: >90% coverage
- Security-critical functions: 100% coverage (commit/reveal, payments, deposits)
- All 47 functional requirements: At least one test each
- All 10 edge cases: Explicit test coverage

---

## R-006: Deployment Strategy

### Research Summary

Deployment must follow testnet-first approach before mainnet (A-001, A-002):

### Deployment Sequence

**Phase 1: Local Development**
- Hardhat Network (built-in local blockchain)
- Instant mining, unlimited ETH
- Perfect for TDD iteration

**Phase 2: Public Testnet**
- Sepolia (Ethereum testnet) or Mumbai (Polygon testnet)
- Free test ETH from faucets
- Test with realistic gas costs and block times
- Validate contract on Etherscan/Polygonscan

**Phase 3: Mainnet** (only after audit)
- Ethereum Mainnet, Polygon, or Arbitrum
- Real ETH required for deployment
- Irreversible once deployed (immutable)

### Deployment Script Structure

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    console.log("Deploying CarLease contract...");
    
    const CarLease = await hre.ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();
    await carLease.deployed();
    
    console.log(`CarLease deployed to: ${carLease.address}`);
    console.log(`Deployer address: ${deployer.address}`);
    console.log(`Transaction hash: ${carLease.deployTransaction.hash}`);
    
    // Wait for block confirmations before verification
    console.log("Waiting for block confirmations...");
    await carLease.deployTransaction.wait(6);
    
    // Verify on Etherscan
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
        address: carLease.address,
        constructorArguments: [],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

### Network Configuration

**hardhat.config.js**:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200, // Balance deployment cost vs execution cost
            },
        },
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 11155111,
        },
        polygon: {
            url: process.env.POLYGON_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 137,
        },
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY,
            polygon: process.env.POLYGONSCAN_API_KEY,
        },
    },
};
```

### Environment Variables (.env)

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

**Security**: Add `.env` to `.gitignore` - never commit private keys

---

## Research Summary

All NEEDS CLARIFICATION items resolved:

- ✅ **Testing Framework**: Hardhat selected for TDD workflow and TypeScript tests
- ✅ **Commit-Reveal Best Practices**: Implementation pattern documented with security considerations
- ✅ **Gas Optimization**: Struct packing strategy defined with ~40,000 gas savings per lease
- ✅ **ReentrancyGuard**: OpenZeppelin implementation understood, functions identified
- ✅ **Testing Strategy**: Three-layer approach (unit/integration/gas) with Hardhat utilities
- ✅ **Deployment Strategy**: Testnet-first approach with verification process

**Ready for Phase 1**: Design artifacts (data-model.md, contracts/, quickstart.md) can now be generated with full technical context.

**Next Command**: Continue with Phase 1 design document generation.
