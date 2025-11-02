# Contract Interface: CarLease.sol

**Feature**: 001-nft-lease-system  
**Created**: 2025-11-02  
**Solidity Version**: ^0.8.0  
**Purpose**: Define complete contract interface with function signatures, events, modifiers, and state variables

---

## Contract Inheritance

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CarLease is ERC721, Ownable, ReentrancyGuard {
    // Implementation details below
}
```

### Inheritance Rationale

| Base Contract | Purpose | Constitution Principle |
|--------------|---------|----------------------|
| ERC721 | NFT standard implementation | Principle IV (Standard events) |
| Ownable | Access control (dealer-only functions) | Principle I (Security) |
| ReentrancyGuard | Prevents reentrancy attacks | Principle I (Security) |

---

## Data Structures

### CarMetadata Struct

```solidity
struct CarMetadata {
    string model;              // Car model name
    string color;              // Car color
    uint16 year;               // Manufacturing year
    uint256 originalValueWei;  // Purchase value in wei
    uint256 mileageLimit;      // Maximum mileage
}
```

**See**: data-model.md for field specifications and validation rules.

### Lease Struct

```solidity
struct Lease {
    address lessee;            // Customer address
    uint64 startTime;          // Lease start timestamp (0 = pending)
    uint32 durationMonths;     // Lease duration
    uint256 monthlyPayment;    // Payment amount in wei
    uint256 deposit;           // Held deposit (3x monthly)
    uint32 paymentsMade;       // Payment counter
    uint64 lastPaymentTime;    // Last payment timestamp
    bool active;               // Lease active status
    bool exists;               // Lease existence flag
    uint64 confirmDeadline;    // Confirmation deadline
}
```

**See**: data-model.md for state transitions and slot packing optimization.

### Commit Struct

```solidity
struct Commit {
    bytes32 commitment;        // Hash of (tokenId, secret, address)
    address committer;         // Committer address
    uint64 deadline;           // Reveal deadline
}
```

**See**: data-model.md and research.md R-002 for commit-reveal pattern details.

---

## State Variables

### Storage Mappings

```solidity
// Primary data storage
mapping(uint256 => CarMetadata) public carData;    // tokenId → car details
mapping(uint256 => Lease) public leases;           // tokenId → lease state
mapping(uint256 => Commit) public commits;         // tokenId → commitment

// Auto-increment token ID
uint256 private _nextTokenId = 1;
```

### Constants

```solidity
// Time windows (FR-007, FR-018, FR-024)
uint64 public constant REVEAL_WINDOW = 7 days;    // Commit→reveal
uint64 public constant CONFIRM_WINDOW = 7 days;   // Reveal→confirm
uint64 public constant PAYMENT_GRACE = 45 days;   // Payment→default

// Future extensibility (Principle V)
uint32 public constant MAX_USAGE_PERCENT = 100;   // Reserved for v2.x
uint32 public constant MAX_CREDIT_FACTOR = 1000;  // Reserved for v2.x
```

---

## Events

### Event Definitions (FR-039 through FR-047)

```solidity
/// @notice Emitted when dealer mints a new lease option NFT
/// @param tokenId The newly minted token ID
/// @param model Car model name
/// @param color Car color
/// @param year Manufacturing year
/// @param originalValueWei Car value in wei
event OptionMinted(
    uint256 indexed tokenId,
    string model,
    string color,
    uint16 year,
    uint256 originalValueWei
);

/// @notice Emitted when customer places commit-reveal commitment
/// @param tokenId NFT ID being committed to
/// @param committer Address placing commitment
/// @param commitment Hash of (tokenId, secret, committer)
/// @param deadline Reveal deadline timestamp
event CommitPlaced(
    uint256 indexed tokenId,
    address indexed committer,
    bytes32 commitment,
    uint64 deadline
);

/// @notice Emitted when customer reveals commitment and pays deposit
/// @param tokenId NFT ID being leased
/// @param lessee Customer address
/// @param durationMonths Lease duration
/// @param monthlyPayment Payment amount in wei
/// @param deposit Deposit amount in wei
/// @param confirmDeadline Dealer confirmation deadline
event LeaseSignedRevealed(
    uint256 indexed tokenId,
    address indexed lessee,
    uint32 durationMonths,
    uint256 monthlyPayment,
    uint256 deposit,
    uint64 confirmDeadline
);

/// @notice Emitted when dealer confirms lease activation
/// @param tokenId NFT ID being confirmed
/// @param lessee Customer address
/// @param startTime Lease activation timestamp
event LeaseConfirmed(
    uint256 indexed tokenId,
    address indexed lessee,
    uint64 startTime
);

/// @notice Emitted when customer makes monthly payment
/// @param tokenId NFT ID for payment
/// @param lessee Customer address
/// @param paymentNumber Payment sequence number (1-indexed)
/// @param amount Payment amount in wei
/// @param timestamp Payment timestamp
event MonthlyPaid(
    uint256 indexed tokenId,
    address indexed lessee,
    uint32 paymentNumber,
    uint256 amount,
    uint64 timestamp
);

/// @notice Emitted when lease is terminated (by lessee or dealer)
/// @param tokenId NFT ID being terminated
/// @param by Terminator address (lessee or owner)
/// @param reason Termination reason code
event LeaseTerminated(
    uint256 indexed tokenId,
    address indexed by,
    string reason
);

/// @notice Emitted when dealer claims deposit after default
/// @param tokenId NFT ID with claimed deposit
/// @param seller Dealer address receiving deposit
/// @param depositAmount Deposit amount in wei
event DepositClaimed(
    uint256 indexed tokenId,
    address indexed seller,
    uint256 depositAmount
);

/// @notice Emitted when lessee gets refund for unconfirmed deposit
/// @param tokenId NFT ID with refunded deposit
/// @param lessee Customer receiving refund
/// @param depositAmount Refund amount in wei
event RefundUnconfirmed(
    uint256 indexed tokenId,
    address indexed lessee,
    uint256 depositAmount
);

/// @notice Emitted when lease duration is extended (future feature)
/// @param tokenId NFT ID being extended
/// @param lessee Customer address
/// @param newDurationMonths Updated total duration
event LeaseExtended(
    uint256 indexed tokenId,
    address indexed lessee,
    uint32 newDurationMonths
);
```

### Event Design Principles

**Indexed Parameters** (Principle IV):
- `tokenId`: Always indexed (primary key for filtering)
- `lessee/committer/by/seller`: Indexed for address-based filtering
- Limit: 3 indexed parameters per event (EVM constraint)

**Past Tense Naming** (Principle IV):
- ✅ `OptionMinted`, `CommitPlaced`, `LeaseSignedRevealed`
- ❌ NOT `MintOption`, `PlaceCommit`, `SignLease`

**Comprehensive Data** (Principle IV):
- Include all changed state for off-chain reconstruction
- Example: `LeaseSignedRevealed` contains full lease terms

---

## Modifiers

### Access Control Modifiers

```solidity
/// @notice Inherited from Ownable
/// @dev Restricts function to contract owner (dealer)
modifier onlyOwner() override {
    // Implemented in Ownable.sol
    _;
}
```

**Applied to Functions**:
- `mintOption()` - FR-002
- `confirmLease()` - FR-019
- `claimDeposit()` - FR-024
- `terminateLease()` (partial) - FR-029

### Security Modifiers

```solidity
/// @notice Inherited from ReentrancyGuard
/// @dev Prevents reentrancy attacks during ETH transfers
modifier nonReentrant() override {
    // Implemented in ReentrancyGuard.sol
    _;
}
```

**Applied to Functions** (from research.md R-004):
1. `revealAndPay()` - Receives deposit ETH
2. `makeMonthlyPayment()` - Receives payment ETH
3. `claimDeposit()` - Sends deposit to owner
4. `refundUnconfirmedDeposit()` - Sends deposit to lessee
5. `terminateLease()` - Sends refunds to lessee

---

## Functions

### Constructor

```solidity
/// @notice Initializes CarLease contract with ERC721 metadata
/// @dev Sets up NFT name and symbol, initializes owner
constructor() 
    ERC721("CarLeaseOption", "CLO") 
    Ownable(msg.sender) 
{
    // _nextTokenId = 1 (initialized at declaration)
}
```

**Rationale**:
- Name: "CarLeaseOption" (descriptive, not "CarLease" to clarify it's option, not car)
- Symbol: "CLO" (short, memorable)
- Owner: Deployer becomes dealer

---

### NFT Management Functions (FR-001, FR-002)

```solidity
/// @notice Mints a new lease option NFT with car metadata
/// @dev Only dealer can mint; NFT owned by contract, not dealer
/// @param model Car model name (non-empty)
/// @param color Car color (can be empty)
/// @param year Manufacturing year
/// @param originalValueWei Car purchase value in wei (must be > 0)
/// @param monthlyPayment Monthly lease payment in wei
/// @param durationMonths Total lease duration in months
/// @param mileageLimit Maximum allowed mileage (0 = unlimited)
/// @return tokenId The newly minted token ID
function mintOption(
    string memory model,
    string memory color,
    uint16 year,
    uint256 originalValueWei,
    uint256 monthlyPayment,
    uint32 durationMonths,
    uint256 mileageLimit
) external onlyOwner returns (uint256) {
    // FR-001: Validate inputs
    // FR-002: Mint to address(this), store metadata, emit OptionMinted
}
```

**Implementation Notes**:
- Use `_safeMint(address(this), tokenId)` to keep NFT in contract
- Store metadata in `carData[tokenId]`
- Store partial lease terms (monthly payment, duration) for later use
- Emit `OptionMinted` event with all metadata

---

### Commit-Reveal Functions (FR-005 through FR-011)

```solidity
/// @notice Places commit-reveal commitment to prevent front-running
/// @dev Anyone can commit; commitment locks for REVEAL_WINDOW
/// @param tokenId NFT ID to commit to
/// @param commitment Hash of keccak256(abi.encodePacked(tokenId, secret, msg.sender))
function commitToLease(uint256 tokenId, bytes32 commitment) 
    external 
{
    // FR-005: Check no active commitment or expired
    // FR-006: Validate tokenId exists
    // FR-007: Set deadline = block.timestamp + REVEAL_WINDOW
    // FR-039: Emit CommitPlaced event
}

/// @notice Reveals commitment and pays deposit to initiate lease
/// @dev Must be called by committer within REVEAL_WINDOW
/// @param tokenId NFT ID from commitment
/// @param secret Secret value from original hash
/// @param durationMonths Requested lease duration (future: can differ from mint)
/// @param monthlyPayment Expected payment (future: can differ from mint)
function revealAndPay(
    uint256 tokenId,
    bytes32 secret,
    uint32 durationMonths,
    uint256 monthlyPayment
) external payable nonReentrant {
    // FR-008: Validate commitment exists and matches hash
    // FR-009: Verify deadline not expired
    // FR-010: Check committer == msg.sender
    // FR-011: Ensure no existing lease (leases[tokenId].exists == false)
    // FR-012: Verify msg.value == monthlyPayment * 3
    // FR-013: Create Lease struct (exists=true, active=false, startTime=0)
    // FR-018: Set confirmDeadline = block.timestamp + CONFIRM_WINDOW
    // FR-040: Emit LeaseSignedRevealed event
    // Delete commitment (no longer needed)
}
```

**Security Notes** (from research.md R-002):
- Hash binds tokenId, secret, and msg.sender (prevents theft)
- Validate hash before accepting deposit
- Delete commitment after successful reveal (storage refund)

---

### Lease Confirmation Functions (FR-019 through FR-023)

```solidity
/// @notice Dealer confirms lease activation (handover keys)
/// @dev Only dealer can confirm; must be before confirmDeadline
/// @param tokenId NFT ID to confirm
function confirmLease(uint256 tokenId) 
    external 
    onlyOwner 
{
    // FR-019: Only owner can call
    // FR-020: Set startTime = block.timestamp, active = true
    // FR-021: Set lastPaymentTime = startTime (initialize payment clock)
    // FR-022: Check block.timestamp <= confirmDeadline
    // FR-041: Emit LeaseConfirmed event
}

/// @notice Lessee requests refund if dealer doesn't confirm in time
/// @dev Anyone can call after confirmDeadline expires
/// @param tokenId NFT ID with unconfirmed deposit
function refundUnconfirmedDeposit(uint256 tokenId) 
    external 
    nonReentrant 
{
    // FR-023: Check exists==true, active==false (pending state)
    // FR-023: Check block.timestamp > confirmDeadline
    // FR-026: Send full deposit to lessee
    // FR-027: Reset lease state (exists=false)
    // FR-047: Emit RefundUnconfirmed event
}
```

**Design Decision**: `refundUnconfirmedDeposit()` is permissionless - anyone can trigger refund after deadline (protects lessee if they're unavailable).

---

### Payment Functions (FR-013 through FR-017)

```solidity
/// @notice Lessee makes monthly payment
/// @dev Only lessee can pay; must match exact monthlyPayment amount
/// @param tokenId NFT ID for payment
function makeMonthlyPayment(uint256 tokenId) 
    external 
    payable 
    nonReentrant 
{
    // FR-013: Verify msg.value == lease.monthlyPayment (exact match)
    // FR-014: Update lastPaymentTime = block.timestamp
    // FR-015: Increment paymentsMade counter
    // FR-016: Check msg.sender == lease.lessee
    // FR-017: Check lease.exists && lease.active
    // FR-042: Emit MonthlyPaid event (include paymentNumber)
}
```

**Implementation Notes**:
- No automatic debt calculation - lessee responsible for timely payment
- Grace period enforcement in `claimDeposit()`, not here
- Event includes paymentNumber (paymentsMade) for off-chain tracking

---

### Deposit Management Functions (FR-024 through FR-027)

```solidity
/// @notice Dealer claims deposit after lessee defaults on payment
/// @dev Only dealer can claim; grace period must expire first
/// @param tokenId NFT ID with defaulted lease
function claimDeposit(uint256 tokenId) 
    external 
    onlyOwner 
    nonReentrant 
{
    // FR-024: Check block.timestamp > lastPaymentTime + PAYMENT_GRACE
    // FR-025: Check lease.exists && lease.active (must be active lease)
    // FR-026: Transfer deposit to owner (msg.sender)
    // FR-027: Set active = false (lease terminated due to default)
    // FR-046: Emit DepositClaimed event
}
```

**Grace Period Logic** (FR-024):
```solidity
uint64 defaultTime = lease.lastPaymentTime + PAYMENT_GRACE;
require(block.timestamp > defaultTime, "Grace period not expired");
```

**Rationale**: 45-day grace = ~1.5 months allows for reasonable delays.

---

### Termination Functions (FR-028 through FR-030)

```solidity
/// @notice Terminates lease (by lessee or dealer after deposit claimed)
/// @dev Lessee can terminate anytime; dealer only after deposit claimed
/// @param tokenId NFT ID to terminate
/// @param reason Human-readable termination reason
function terminateLease(uint256 tokenId, string memory reason) 
    external 
    nonReentrant 
{
    // FR-028: If msg.sender == lessee, allow anytime (early termination)
    //         Calculate refund: deposit - (durationMonths - paymentsMade) * monthlyPayment
    //         Minimum refund: 0 (no negative refunds)
    // FR-029: If msg.sender == owner, only allow if active==false (deposit already claimed)
    // FR-030: Set active = false, emit LeaseTerminated
    // FR-026: Send refund to lessee (if applicable)
    // FR-043: Emit LeaseTerminated event with reason
}
```

**Refund Calculation** (FR-028):
```solidity
uint256 remainingPayments = lease.durationMonths - lease.paymentsMade;
uint256 penalty = remainingPayments * lease.monthlyPayment;
uint256 refund = (penalty < lease.deposit) ? (lease.deposit - penalty) : 0;
```

**Termination Reasons** (examples):
- "Early termination by lessee"
- "Lease completed successfully"
- "Default after deposit claimed"
- "Mileage limit exceeded"

---

### Extension Functions (FR-031)

```solidity
/// @notice Extends lease duration (future feature - v2.x)
/// @dev Not implemented in v1.0.0; reserved for future
/// @param tokenId NFT ID to extend
/// @param additionalMonths Months to add
function extendLease(uint256 tokenId, uint32 additionalMonths) 
    external 
    payable 
{
    revert("Not implemented - reserved for v2.x");
    // Future: Update durationMonths, adjust deposit if needed
    // FR-048: Emit LeaseExtended event
}
```

**Rationale** (Principle V - Upgradeability):
- Signature defined but not implemented
- Reserves function name for future upgrade
- Event schema already defined

---

## View Functions

### Query Functions

```solidity
/// @notice Gets car metadata for NFT
/// @param tokenId NFT ID
/// @return CarMetadata struct (model, color, year, value, mileage)
function getCarMetadata(uint256 tokenId) 
    external 
    view 
    returns (CarMetadata memory) 
{
    require(_exists(tokenId), "Token does not exist");
    return carData[tokenId];
}

/// @notice Gets lease details for NFT
/// @param tokenId NFT ID
/// @return Lease struct (all fields)
function getLease(uint256 tokenId) 
    external 
    view 
    returns (Lease memory) 
{
    return leases[tokenId];
}

/// @notice Gets active commitment for NFT
/// @param tokenId NFT ID
/// @return Commit struct (commitment, committer, deadline)
function getCommit(uint256 tokenId) 
    external 
    view 
    returns (Commit memory) 
{
    return commits[tokenId];
}

/// @notice Checks if lease payment is current (within grace period)
/// @param tokenId NFT ID
/// @return bool True if payment is current or grace period active
function isPaymentCurrent(uint256 tokenId) 
    external 
    view 
    returns (bool) 
{
    Lease memory lease = leases[tokenId];
    if (!lease.active) return false;
    
    uint64 gracePeriodEnd = lease.lastPaymentTime + PAYMENT_GRACE;
    return block.timestamp <= gracePeriodEnd;
}

/// @notice Checks if commitment is still valid (not expired)
/// @param tokenId NFT ID
/// @return bool True if commitment exists and deadline not passed
function isCommitmentValid(uint256 tokenId) 
    external 
    view 
    returns (bool) 
{
    Commit memory c = commits[tokenId];
    return (c.commitment != bytes32(0) && c.deadline >= block.timestamp);
}
```

**Rationale**: Provide convenience functions for common queries without requiring off-chain hash parsing.

---

## Internal Functions

### Payment Processing

```solidity
/// @dev Processes ETH transfer to recipient with error handling
/// @param recipient Address to send ETH
/// @param amount Amount in wei
function _sendEther(address recipient, uint256 amount) 
    internal 
{
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "ETH transfer failed");
}
```

**Security Pattern** (Principle I - Checks-Effects-Interactions):
1. Validate inputs (checks)
2. Update state variables (effects)
3. Call `_sendEther()` last (interactions)

### Validation Helpers

```solidity
/// @dev Validates that token exists and is owned by contract
/// @param tokenId Token ID to validate
function _validateContractOwnsToken(uint256 tokenId) 
    internal 
    view 
{
    require(_exists(tokenId), "Token does not exist");
    require(ownerOf(tokenId) == address(this), "Contract must own token");
}
```

**Usage**: Called at start of lease-related functions to ensure NFT control.

---

## Security Considerations (Principle I)

### Reentrancy Protection (FR-034, FR-035)

**Protected Functions** (from research.md R-004):
1. ✅ `revealAndPay()` - Receives deposit
2. ✅ `makeMonthlyPayment()` - Receives payment
3. ✅ `claimDeposit()` - Sends ETH to owner
4. ✅ `refundUnconfirmedDeposit()` - Sends ETH to lessee
5. ✅ `terminateLease()` - Sends refund to lessee

**Gas Overhead**: ~2,100 gas per call (acceptable per research.md R-004).

### Front-Running Prevention (FR-036, FR-037, FR-038)

**Commit-Reveal Pattern**:
```solidity
// Step 1: Commit (hide intent)
keccak256(abi.encodePacked(tokenId, secret, msg.sender))

// Step 2: Reveal (prove knowledge)
require(hash == commitment, "Invalid secret");
require(msg.sender == committer, "Wrong revealer");
```

**Security Properties**:
- Hash binds tokenId → Cannot change target after seeing others' commits
- Hash binds msg.sender → Cannot steal someone else's commitment
- 7-day window → Prevents indefinite locking

### Access Control (FR-034)

**Owner-Only Functions**:
- `mintOption()` - Dealer creates NFTs
- `confirmLease()` - Dealer confirms handover
- `claimDeposit()` - Dealer claims after default
- `terminateLease()` (conditional) - Dealer can only terminate if deposit already claimed

**Lessee-Only Functions**:
- `makeMonthlyPayment()` - Only lessee can pay their own lease
- `terminateLease()` (conditional) - Lessee can terminate anytime

**Permissionless Functions**:
- `commitToLease()` - Anyone can commit (race is fair via commit-reveal)
- `revealAndPay()` - Anyone who knows secret can reveal (but hash binds to committer)
- `refundUnconfirmedDeposit()` - Anyone can trigger (protects lessee)

### Integer Overflow/Underflow (FR-035)

**Built-in Protection**: Solidity ^0.8.0 has automatic overflow checks.

**Critical Operations**:
```solidity
// Safe: Solidity checks automatically
uint256 refund = lease.deposit - penalty;  // Reverts if underflow
uint32 newPaymentsMade = lease.paymentsMade + 1;  // Reverts if overflow (unlikely with uint32)
```

---

## Gas Optimization (Principle II)

### Storage Optimization

**Struct Packing** (from data-model.md):
- Lease struct: 4 storage slots (vs. 7 unpacked) → ~40k gas saved
- Use uint16/uint32/uint64 where appropriate

**Event-Based History** (FR-042):
- No `paymentHistory[]` array → No unbounded loops
- Query payment history via `MonthlyPaid` event logs

### Computation Optimization

**Minimize Storage Reads**:
```solidity
// ❌ Bad: Multiple SLOAD operations
if (leases[tokenId].active && leases[tokenId].exists) { ... }

// ✅ Good: Cache in memory
Lease memory lease = leases[tokenId];
if (lease.active && lease.exists) { ... }
```

**Delete After Use**:
```solidity
// Storage refund when deleting commitment
delete commits[tokenId];  // Refunds gas when clearing storage
```

---

## Testing Requirements (Principle III)

### Test Coverage Targets

- **Overall**: >90% coverage (SC-005)
- **Security Functions**: 100% coverage (commit-reveal, reentrancy-protected, access-controlled)
- **Edge Cases**: All 10 from spec.md must have tests

### Test Organization (from research.md R-005)

**Unit Tests** (test/unit/):
- One test file per FR category
- `CarLease.mint.test.js` - FR-001, FR-002
- `CarLease.commitReveal.test.js` - FR-005 through FR-011
- `CarLease.confirmation.test.js` - FR-019 through FR-023
- `CarLease.payment.test.js` - FR-013 through FR-017
- `CarLease.deposit.test.js` - FR-024 through FR-027
- `CarLease.termination.test.js` - FR-028 through FR-030
- `CarLease.security.test.js` - FR-034 through FR-038
- `CarLease.events.test.js` - FR-039 through FR-047

**Integration Tests** (test/integration/):
- One test file per user story
- `userStory1.complete-lifecycle.test.js` - Mint → Commit → Reveal → Confirm → Payments → Terminate
- `userStory5.front-running.test.js` - Competing commitments, hash validation

**Gas Tests** (test/gas/):
- `gas-benchmarks.test.js` - Measure all functions against SC-007 targets

---

## Contract Validation Checklist

- [x] All 47 functional requirements have corresponding functions
- [x] All 9 events defined with proper indexed parameters
- [x] ReentrancyGuard applied to 5 ETH-transfer functions
- [x] Access control (onlyOwner) applied correctly
- [x] Commit-reveal pattern fully specified
- [x] View functions for common queries
- [x] Internal helpers follow checks-effects-interactions
- [x] Gas optimization techniques documented
- [x] Security considerations addressed (Principle I)
- [x] Test organization defined (Principle III)
- [x] Future extensibility (extendLease) reserved (Principle V)

**Status**: ✅ Ready for developer quickstart guide (quickstart.md)
