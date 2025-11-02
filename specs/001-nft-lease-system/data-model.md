# Data Model: NFT-Based Car Leasing Smart Contract

**Feature**: 001-nft-lease-system  
**Created**: 2025-11-02  
**Purpose**: Define data structures, relationships, and state transitions for CarLease contract

---

## Entity Overview

The CarLease contract manages four primary data entities:

1. **CarMetadata**: Immutable car information for each NFT
2. **Lease**: Mutable lease agreement state
3. **Commit**: Temporary commitment during commit-reveal
4. **NFT Token**: ERC721 token representing lease option

---

## Entity 1: CarMetadata

### Purpose
Stores immutable information about the physical vehicle associated with each NFT lease option.

### Structure

```solidity
struct CarMetadata {
    string model;              // Car model name (e.g., "Tesla Model 3")
    string color;              // Car color (e.g., "Blue", "Red")
    uint16 year;               // Manufacturing year (e.g., 2024)
    uint256 originalValueWei;  // Car's purchase value in wei
    uint256 mileageLimit;      // Maximum allowed mileage for lease
}
```

### Field Specifications

| Field | Type | Range/Constraints | Validation Rules (FR) |
|-------|------|------------------|----------------------|
| model | string | Non-empty, max ~64 chars practical | FR-001: MUST not be empty |
| color | string | Any string, can be empty | - |
| year | uint16 | 0-65535 (covers all years) | - |
| originalValueWei | uint256 | > 0 | FR-001: MUST be > 0 |
| mileageLimit | uint256 | >= 0 (0 = unlimited) | - |

### Storage Pattern

**Mapping**: `mapping(uint256 => CarMetadata) public carData;`
- Key: Token ID (NFT identifier)
- Value: CarMetadata struct
- Access: Public getter automatically generated

### Immutability

Once minted (FR-001), CarMetadata is **immutable** - no functions modify it after creation.

**Rationale**: Car specifications don't change; lease terms are separate (in Lease struct).

---

## Entity 2: Lease

### Purpose
Tracks mutable state of active or completed lease agreements.

### Structure

```solidity
struct Lease {
    address lessee;            // Customer holding the lease
    uint64 startTime;          // Lease activation timestamp (0 if not confirmed)
    uint32 durationMonths;     // Total lease duration in months
    uint256 monthlyPayment;    // Monthly payment amount in wei
    uint256 deposit;           // Deposit held (3x monthly payment)
    uint32 paymentsMade;       // Counter of payments received
    uint64 lastPaymentTime;    // Timestamp of most recent payment
    bool active;               // True if lease is active
    bool exists;               // True if lease has been initiated
    uint64 confirmDeadline;    // Dealer must confirm before this time
}
```

### Field Specifications

| Field | Type | Range/Constraints | Validation Rules (FR) |
|-------|------|------------------|----------------------|
| lessee | address | Valid Ethereum address | FR-016: Only lessee can pay |
| startTime | uint64 | Unix timestamp (0 = pending) | FR-020: Set on confirmation |
| durationMonths | uint32 | > 0, typically 12-60 | - |
| monthlyPayment | uint256 | > 0 | FR-013: Exact amount required |
| deposit | uint256 | = monthlyPayment * 3 | FR-012: Must be 3x monthly |
| paymentsMade | uint32 | 0 to durationMonths | FR-015: Incremented per payment |
| lastPaymentTime | uint64 | Unix timestamp | FR-014: Updated on payment |
| active | bool | true/false | FR-030: Set false on termination |
| exists | bool | true/false | Used to distinguish empty vs. uninitialized |
| confirmDeadline | uint64 | Unix timestamp | FR-018: 7 days from reveal |

### Storage Pattern

**Mapping**: `mapping(uint256 => Lease) public leases;`
- Key: Token ID (links to NFT and CarMetadata)
- Value: Lease struct
- Access: Public getter automatically generated

### Storage Optimization (Principle II)

**Slot Packing** (from research.md):
- Slot 1: address (20) + uint64 (8) + uint32 (4) = 32 bytes ✅
- Slot 2: uint256 monthlyPayment = 32 bytes ✅
- Slot 3: uint256 deposit = 32 bytes ✅
- Slot 4: uint32 (4) + uint64 (8) + bool (1) + bool (1) + uint64 (8) = 22 bytes (padded) ✅

**Gas Savings**: ~40,000 gas per lease vs. unpacked structs

### State Transitions

```
┌──────────┐
│ EMPTY    │ (exists=false, active=false)
└────┬─────┘
     │ revealAndPay() → FR-008
     ▼
┌──────────┐
│ PENDING  │ (exists=true, active=false, startTime=0)
└────┬─────┘
     │ confirmLease() → FR-020
     │ OR refundUnconfirmedDeposit() after deadline → FR-021
     ▼
┌──────────┐
│ ACTIVE   │ (exists=true, active=true, startTime>0)
└────┬─────┘
     │ makeMonthlyPayment() repeatedly → FR-015
     │ OR claimDeposit() after default → FR-024
     │ OR terminateLease() → FR-028/FR-029
     ▼
┌──────────┐
│ INACTIVE │ (exists=true, active=false, reason recorded)
└──────────┘
```

### State Validation Rules

**EMPTY → PENDING** (revealAndPay):
- exists must be false (FR-011)
- Commitment must be valid and not expired (FR-009, FR-010)
- Deposit amount must equal monthlyPayment * 3 (FR-012)

**PENDING → ACTIVE** (confirmLease):
- exists must be true, active must be false (pending state)
- Current time must be before confirmDeadline (FR-022)
- Only owner can confirm (FR-019)

**PENDING → EMPTY** (refundUnconfirmedDeposit):
- exists must be true, active must be false
- Current time must be after confirmDeadline (FR-021)
- Full deposit refunded to lessee (FR-026)

**ACTIVE → INACTIVE** (multiple paths):
- Path 1: claimDeposit() → Grace period expired after missed payment (FR-024)
- Path 2: terminateLease() by lessee → Early termination (FR-028)
- Path 3: terminateLease() by owner → After deposit claimed (FR-029)

---

## Entity 3: Commit

### Purpose
Temporary storage for commit-reveal pattern to prevent front-running.

### Structure

```solidity
struct Commit {
    bytes32 commitment;        // Hash of (tokenId, secret, committerAddress)
    address committer;         // Address that placed commitment
    uint64 deadline;           // Reveal must occur before this time
}
```

### Field Specifications

| Field | Type | Constraints | Validation Rules (FR) |
|-------|------|------------|----------------------|
| commitment | bytes32 | keccak256(abi.encodePacked(tokenId, secret, msg.sender)) | FR-006: Specific hash structure |
| committer | address | msg.sender from commitToLease() | Used to verify reveal caller |
| deadline | uint64 | block.timestamp + REVEAL_WINDOW (7 days) | FR-007: 7-day reveal window |

### Storage Pattern

**Mapping**: `mapping(uint256 => Commit) public commits;`
- Key: Token ID (which lease being committed to)
- Value: Commit struct
- Access: Public getter (hash visible, but contents hidden)

### Lifecycle

```
commitToLease(tokenId, hash)
  ↓
Commit stored with 7-day deadline
  ↓
Within 7 days: revealAndPay(tokenId, secret)
  → Validates: keccak256(tokenId, secret, msg.sender) == commitment
  → Deletes commit (no longer needed)
  ↓
After 7 days: Commitment expired
  → Can be overwritten by same or different user
  → Storage optimization: reuse slot
```

### Security Properties (FR-038, User Story 5)

1. **Binding**: Hash includes msg.sender → Cannot be stolen by another address
2. **Hiding**: Only hash is visible → Cannot determine which NFT until reveal
3. **Expiration**: 7-day deadline prevents indefinite locking → Storage efficiency
4. **Race Condition Safe**: First reveal to pay deposit locks the NFT

---

## Entity 4: NFT Token (ERC721)

### Purpose
Represents ownership of the lease option (not the car itself).

### Inheritance

```solidity
contract CarLease is ERC721, Ownable, ReentrancyGuard {
    // ERC721 provides: tokenId, ownerOf, transferFrom, etc.
}
```

### Token Ownership Pattern

**Critical Design Decision** (FR-003):

```
┌─────────────┐
│  Contract   │ ← NFT owner during lease
│  (address)  │
└─────────────┘
       ↕ (controlled transfer only)
┌─────────────┐
│   Dealer    │ ← Can mint, confirm, claim
│  (owner)    │
└─────────────┘
```

**Why Contract Owns NFT**:
- Prevents lessee from selling NFT mid-lease
- Ensures contract retains control over lease asset
- NFT stays with contract during active lease
- After lease completion, NFT can be burned or returned

**Minting Pattern** (FR-002):
```solidity
_safeMint(address(this), tokenId); // NOT _safeMint(msg.sender, tokenId)
```

### Token ID Strategy

**Auto-Increment** (FR-002):
```solidity
uint256 private _nextTokenId = 1; // Start at 1 (0 is invalid/uninitialized)

function mintOption(...) external onlyOwner returns (uint256) {
    uint256 tokenId = _nextTokenId++;
    _safeMint(address(this), tokenId);
    return tokenId;
}
```

---

## Relationships

### Primary Relationships

```
       tokenId (key)
            │
     ┌──────┼──────┐
     │      │      │
     ▼      ▼      ▼
CarMetadata Lease Commit
(immutable) (mutable) (temporary)
```

### Relationship Cardinality

| Relationship | Cardinality | Description |
|-------------|-------------|-------------|
| NFT → CarMetadata | 1:1 | Each NFT has exactly one CarMetadata |
| NFT → Lease | 1:0..1 | NFT can have 0 or 1 active/pending lease |
| NFT → Commit | 1:0..1 | NFT can have 0 or 1 active commitment |
| Lessee → Lease | 1:N | One lessee can have multiple leases (different NFTs) |
| Dealer → NFT | 1:N | Dealer owns contract, mints all NFTs |

### Data Access Patterns

**Query: Get lease details for specific NFT**
```solidity
Lease memory lease = leases[tokenId];
CarMetadata memory car = carData[tokenId];
```

**Query: Check if NFT has pending commitment**
```solidity
Commit memory commit = commits[tokenId];
bool hasPendingCommit = commit.commitment != bytes32(0) && commit.deadline > block.timestamp;
```

**Query: Verify payment is current**
```solidity
Lease storage lease = leases[tokenId];
bool paymentCurrent = lease.lastPaymentTime + 30 days + PAYMENT_GRACE > block.timestamp;
```

---

## Constants

### Time-Based Constants

```solidity
uint64 public constant REVEAL_WINDOW = 7 days;    // FR-007: Commit→reveal deadline
uint64 public constant CONFIRM_WINDOW = 7 days;   // FR-018: Reveal→confirm deadline
uint64 public constant PAYMENT_GRACE = 45 days;   // FR-024: Payment→default grace period
```

**Rationale**:
- 7 days: Reasonable time for user action without indefinite locking
- 45 days: ~1.5 months grace allows for reasonable delays before deposit claim

### Configuration Constants

```solidity
uint32 public constant MAX_USAGE_PERCENT = 100;   // Future: usage-based adjustments
uint32 public constant MAX_CREDIT_FACTOR = 1000;  // Future: credit scoring
```

**Note**: Not used in v1.0.0 but reserved for future enhancements (Principle V).

---

## Validation Rules Summary

### Mint Validation (FR-001)
```solidity
require(bytes(model).length > 0, "Model required");
require(originalValueWei > 0, "Value must be > 0");
```

### Commit Validation (FR-005)
```solidity
require(commits[tokenId].commitment == bytes32(0) || 
        commits[tokenId].deadline < block.timestamp, 
        "Active commitment exists");
```

### Reveal Validation (FR-008, FR-009, FR-010, FR-011)
```solidity
Commit storage c = commits[tokenId];
require(c.commitment != bytes32(0), "No commitment");
require(c.deadline >= block.timestamp, "Commitment expired");
require(keccak256(abi.encodePacked(tokenId, secret, msg.sender)) == c.commitment, 
        "Invalid secret");
require(!leases[tokenId].exists, "Already leased");
require(msg.value == monthlyPayment * 3, "Incorrect deposit");
```

### Payment Validation (FR-013, FR-016, FR-017)
```solidity
Lease storage lease = leases[tokenId];
require(lease.exists, "Lease does not exist");
require(lease.active, "Lease not active");
require(msg.sender == lease.lessee, "Not lessee");
require(msg.value == lease.monthlyPayment, "Incorrect amount");
```

### Deposit Claim Validation (FR-024, FR-025)
```solidity
require(lease.exists && lease.active, "Lease not active");
require(block.timestamp > lease.lastPaymentTime + PAYMENT_GRACE, 
        "Grace period not expired");
```

---

## Event Emission (Principle IV)

Every state change MUST emit an event (FR-039 through FR-047). See contracts/CarLease.sol.md for full event schema.

### Event-to-State-Change Mapping

| State Change | Event Emitted | Indexed Parameters |
|-------------|---------------|-------------------|
| NFT minted | OptionMinted | tokenId |
| Commitment placed | CommitPlaced | tokenId, committer |
| Reveal + deposit | LeaseSignedRevealed | tokenId, lessee |
| Lease confirmed | LeaseConfirmed | tokenId, lessee |
| Payment made | MonthlyPaid | tokenId, lessee |
| Lease terminated | LeaseTerminated | tokenId, by |
| Deposit claimed | DepositClaimed | tokenId, seller |
| Deposit refunded | RefundUnconfirmed | tokenId, lessee |
| Lease extended | LeaseExtended | tokenId, lessee |

---

## Gas Optimization Summary (Principle II)

**Optimizations Applied**:
- ✅ Struct packing: ~40,000 gas saved per lease
- ✅ uint16/uint32/uint64 for appropriate ranges
- ✅ Event-based payment history (no unbounded arrays)
- ✅ Commitment overwriting (reuse storage slots)
- ✅ Memory caching where multiple reads occur

**Performance Targets** (from SC-007): All operations stay within gas budgets with these optimizations.

---

## Data Model Validation Checklist

- [x] All entities from spec.md defined (CarMetadata, Lease, Commit, NFT)
- [x] Field types optimized for gas (uint16, uint32, uint64)
- [x] Validation rules from FR-001 through FR-047 documented
- [x] State transitions for Lease entity defined
- [x] Relationships and cardinalities specified
- [x] Storage patterns documented (mappings)
- [x] Constants defined with rationale
- [x] Event emission mapping complete
- [x] Gas optimization strategy applied

**Status**: ✅ Ready for contract interface definition (contracts/CarLease.sol.md)
