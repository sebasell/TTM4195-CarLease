# Feature Specification: NFT-Based Car Leasing Smart Contract

**Feature Branch**: `001-nft-lease-system`  
**Created**: 2025-11-02  
**Status**: Draft  
**Input**: User description: "NFT-Based Smart Contract for Car Leasing - Complete implementation with security, testing, and constitution compliance"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Lease Lifecycle (Priority: P1)

A customer browses available electric vehicle lease options, selects one that fits their budget and needs, commits to the lease using a secure mechanism, pays a deposit, receives confirmation from the dealer, makes monthly payments on time, and successfully completes the lease term.

**Why this priority**: This is the core happy-path that delivers the primary value proposition - enabling trustless car leasing via blockchain. Without this working end-to-end, the system has no viable functionality.

**Independent Test**: Can be fully tested by minting a lease option, having a customer complete the commit-reveal process, pay deposit, receive seller confirmation, make all monthly payments, and reach lease completion. Delivers a complete, working lease agreement from start to finish.

**Acceptance Scenarios**:

1. **Given** a dealer has minted an NFT for a Tesla Model 3 lease (36 months, 0.1 ETH/month), **When** a customer commits to this lease with a valid hash, **Then** the commitment is recorded with a 7-day reveal deadline
2. **Given** a customer has committed to a lease, **When** they reveal their commitment within 7 days and pay the correct deposit (0.3 ETH), **Then** the lease enters pending status awaiting dealer confirmation
3. **Given** a customer has paid deposit for a lease, **When** the dealer confirms within 7 days, **Then** the lease becomes active with the start timestamp recorded
4. **Given** an active lease with monthly payment of 0.1 ETH, **When** the customer pays exactly 0.1 ETH each month for 36 months, **Then** all payments are recorded and the lease remains active
5. **Given** a lease where all payments have been made, **When** the lease duration expires, **Then** the system marks the lease as completed successfully

---

### User Story 2 - Deposit Protection with Auto-Refund (Priority: P2)

A customer commits to a lease and pays their deposit, but the dealer fails to confirm the lease within the required 7-day window. The customer can reclaim their full deposit automatically, protecting them from dealer abandonment.

**Why this priority**: Critical trust mechanism - prevents dealers from holding customer deposits without fulfilling the lease. This protection is essential for customer confidence in the system.

**Independent Test**: Can be fully tested by having a customer commit and pay deposit, waiting beyond the 7-day confirmation deadline, and verifying the customer can successfully reclaim their full deposit. Delivers customer protection without needing the full lease to execute.

**Acceptance Scenarios**:

1. **Given** a customer has paid a 0.3 ETH deposit for a lease, **When** the dealer does not confirm within 7 days, **Then** the customer can call refund function successfully
2. **Given** the confirmation deadline has passed, **When** the customer requests a refund, **Then** they receive the full 0.3 ETH deposit back to their address
3. **Given** a customer has been refunded, **When** checking the lease status, **Then** the lease is marked as cancelled/inactive

---

### User Story 3 - Dealer Protection via Deposit Claim (Priority: P2)

A customer starts a lease but stops making monthly payments. After the grace period expires (45 days from last payment), the dealer can claim the customer's deposit as compensation for the broken lease agreement.

**Why this priority**: Essential for dealer protection - ensures dealers have recourse when customers default. Balances the system by protecting both parties.

**Independent Test**: Can be fully tested by establishing an active lease, having customer make initial payments then stop, waiting beyond the grace period, and verifying dealer can successfully claim the deposit. Delivers dealer protection mechanism independently.

**Acceptance Scenarios**:

1. **Given** an active lease where the customer made 3 monthly payments, **When** the customer misses the 4th payment for 45 days, **Then** the dealer can call the claim deposit function
2. **Given** the grace period has expired, **When** the dealer claims the deposit, **Then** the 0.3 ETH deposit is transferred to the dealer's address
3. **Given** the dealer has claimed the deposit, **When** checking the lease status, **Then** the lease is marked as terminated due to non-payment

---

### User Story 4 - Lease Extension (Priority: P3)

A customer nearing the end of their lease term wants to continue leasing the same vehicle. They can extend the lease for additional months, potentially with adjusted monthly payments, by paying an additional deposit.

**Why this priority**: Enhances user experience by providing flexibility, but not critical for MVP functionality. The core lease system works without extensions.

**Independent Test**: Can be fully tested by completing most of a lease term, then requesting an extension with new terms, paying the additional deposit, and verifying the lease duration and payment amounts are updated correctly. Delivers extension feature independently.

**Acceptance Scenarios**:

1. **Given** an active lease with 2 months remaining (34 of 36 payments made), **When** the customer requests a 6-month extension with 0.11 ETH/month, **Then** the system calculates the new deposit requirement
2. **Given** an extension request, **When** the customer pays the additional deposit (0.33 ETH for new terms), **Then** the lease duration is extended by 6 months and monthly payment updated to 0.11 ETH
3. **Given** a lease has been extended, **When** the customer makes payments, **Then** the new monthly amount (0.11 ETH) is required for subsequent payments

---

### User Story 5 - Front-Running Prevention (Priority: P1)

Multiple customers are interested in the same high-demand vehicle lease. The commit-reveal mechanism ensures that customers can fairly compete for leases without malicious actors seeing and front-running their transactions.

**Why this priority**: Critical security feature that prevents exploitation. Without this, the system would be vulnerable to front-running attacks that create unfair advantages and erode trust.

**Independent Test**: Can be fully tested by having multiple users commit to the same lease with different secrets, verifying that commitments are binding, and ensuring only the first successful reveal can claim the lease. Delivers fair competition mechanism independently.

**Acceptance Scenarios**:

1. **Given** an available Tesla Model 3 lease NFT, **When** Customer A submits a commitment hash, **Then** the commitment is recorded without revealing which lease they want
2. **Given** Customer A has committed, **When** Customer B tries to see which lease Customer A committed to, **Then** only the hash is visible (no lease details revealed)
3. **Given** both Customer A and B have committed to the same lease, **When** Customer A reveals first with correct secret and deposit, **Then** Customer A's lease is accepted
4. **Given** Customer A has successfully revealed and paid, **When** Customer B tries to reveal for the same lease, **Then** the transaction reverts because the lease is no longer available

---

### Edge Cases

- **What happens when a customer commits but never reveals?** The commitment expires after 7 days and can be overwritten by the same customer or others can still commit to that lease.
- **What happens when the contract receives ETH accidentally (not through lease functions)?** A withdrawal function allows the owner to recover accidentally sent ETH.
- **What happens when a customer tries to make payments after the lease has expired?** The payment reverts because the lease is no longer active.
- **What happens when a customer pays exactly at the grace period deadline?** The payment is accepted successfully - the deadline is inclusive.
- **What happens when a customer tries to extend a lease that doesn't exist or isn't theirs?** The transaction reverts with an authorization error.
- **What happens when someone tries to mint a lease option with zero value or empty model name?** The transaction reverts with a validation error.
- **What happens when multiple people commit to the same lease?** All commitments are recorded separately, but only the first person to successfully reveal and pay gets the lease.
- **What happens when a dealer tries to confirm a lease after the confirmation deadline?** The transaction reverts and the customer can claim their refund.
- **What happens when trying to claim a deposit before the grace period expires?** The transaction reverts - deposit can only be claimed after grace period.
- **What happens when a customer makes a payment with slightly more or less ETH than required?** The transaction reverts - exact payment amount required to prevent errors.

## Requirements *(mandatory)*

### Functional Requirements

#### NFT & Lease Management

- **FR-001**: System MUST allow dealer (contract owner) to mint NFT lease options with metadata including car model, color, year, original value in wei, and mileage limit
- **FR-002**: System MUST ensure each NFT lease option has a unique token ID that auto-increments
- **FR-003**: System MUST store NFT ownership with the contract (not dealer) to prevent unauthorized transfers during active leases
- **FR-004**: System MUST associate each NFT with a lease data structure tracking lessee, start time, duration, monthly payment, deposit, payment count, last payment time, and status flags

#### Commit-Reveal Mechanism

- **FR-005**: System MUST allow any user to commit to a lease by submitting a hash commitment
- **FR-006**: System MUST calculate commitment hash as keccak256(tokenId, secret, committerAddress) to bind commitment to specific user
- **FR-007**: System MUST store commitments with a reveal deadline of 7 days from commit time
- **FR-008**: System MUST allow committer to reveal within deadline by providing the secret and exact deposit amount
- **FR-009**: System MUST validate revealed secret matches original commitment hash before accepting
- **FR-010**: System MUST reject reveals after the 7-day deadline has passed
- **FR-011**: System MUST reject reveals for NFTs that are already leased or pending

#### Payment Processing

- **FR-012**: System MUST require deposit payment equal to 3 times the monthly lease payment
- **FR-013**: System MUST require exact payment amounts - no overpayment or underpayment allowed
- **FR-014**: System MUST record the time of each monthly payment
- **FR-015**: System MUST increment the payment counter each time a valid monthly payment is made
- **FR-016**: System MUST allow only the active lessee to make monthly payments
- **FR-017**: System MUST reject payment attempts on inactive or non-existent leases

#### Lease Confirmation & Activation

- **FR-018**: System MUST give dealer 7 days from reveal to confirm the lease agreement
- **FR-019**: System MUST allow only the contract owner (dealer) to confirm leases
- **FR-020**: System MUST activate the lease upon dealer confirmation, recording the start timestamp
- **FR-021**: System MUST allow customer to reclaim full deposit if dealer doesn't confirm within 7 days
- **FR-022**: System MUST prevent dealer from confirming after the confirmation deadline has passed

#### Deposit Management

- **FR-023**: System MUST hold customer deposits in the contract during active leases
- **FR-024**: System MUST allow dealer to claim deposit after payment grace period (45 days) expires following a missed payment
- **FR-025**: System MUST prevent deposit claims when customer payments are current
- **FR-026**: System MUST transfer full deposit to customer when requesting refund after dealer non-confirmation
- **FR-027**: System MUST transfer deposit to dealer when claiming after customer default

#### Lease Termination & Extension

- **FR-028**: System MUST allow lessee to voluntarily terminate lease early (deposit at risk)
- **FR-029**: System MUST allow dealer to terminate lease after customer default and deposit claim
- **FR-030**: System MUST mark leases as inactive upon termination
- **FR-031**: System MUST allow active lessee to extend lease by specifying additional months and new monthly payment
- **FR-032**: System MUST require additional deposit (3x new monthly payment) for lease extensions
- **FR-033**: System MUST update lease duration and monthly payment amount after successful extension

#### Security Requirements

- **FR-034**: System MUST use ReentrancyGuard on all functions that transfer ETH (reveal, payment, claim, refund, extend)
- **FR-035**: System MUST follow checks-effects-interactions pattern: validate inputs, update state, then execute transfers
- **FR-036**: System MUST use Solidity ^0.8.0 for automatic integer overflow/underflow protection
- **FR-037**: System MUST enforce access controls: only owner can mint and confirm, only lessee can pay and extend
- **FR-038**: System MUST prevent front-running through commit-reveal pattern for lease selection

#### Event Emission

- **FR-039**: System MUST emit OptionMinted event when new lease option is created
- **FR-040**: System MUST emit CommitPlaced event when customer commits to lease
- **FR-041**: System MUST emit LeaseSignedRevealed event when customer reveals and pays deposit
- **FR-042**: System MUST emit LeaseConfirmed event when dealer confirms lease
- **FR-043**: System MUST emit MonthlyPaid event for each monthly payment received
- **FR-044**: System MUST emit LeaseTerminated event when lease ends (any reason)
- **FR-045**: System MUST emit DepositClaimed event when dealer claims deposit after default
- **FR-046**: System MUST emit RefundUnconfirmed event when customer reclaims deposit after dealer non-confirmation
- **FR-047**: System MUST emit LeaseExtended event when lease is extended with new terms

### Key Entities

- **NFT (CarLease Token)**: ERC721 token representing a specific car lease option; attributes include tokenId, car metadata (model, color, year, value, mileage limit), and ownership (held by contract during lease)

- **CarMetadata**: Data structure containing car-specific information: model (string), color (string), year (uint16), originalValueWei (uint256), mileageLimit (uint256)

- **Lease**: Core lease agreement data structure containing: lessee address, startTime (uint64 timestamp), durationMonths (uint32), monthlyPayment (uint256 wei), deposit (uint256 wei), paymentsMade (uint32 counter), lastPaymentTime (uint64 timestamp), active (bool flag), exists (bool flag), confirmDeadline (uint64 timestamp)

- **Commit**: Temporary data structure for commit-reveal: commitment hash (bytes32), committer address, reveal deadline (uint64 timestamp)

- **Dealer (Owner)**: Contract owner who mints lease options, confirms pending leases, and can claim deposits after customer defaults

- **Customer (Lessee)**: User who commits to leases, pays deposits and monthly payments, and holds the lease rights during active lease period

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can complete the full lease commitment process (commit, reveal, pay deposit) in under 5 minutes with clear transaction confirmations at each step

- **SC-002**: System prevents front-running attacks - customers attempting to front-run commitments fail 100% of the time due to commit-reveal mechanism

- **SC-003**: Deposit refunds process successfully within 1 transaction when dealer fails to confirm - customers receive 100% of deposit back (minus gas fees)

- **SC-004**: Dealer can claim deposits successfully within 1 transaction after grace period expires - deposit transfer completes in under 2 minutes

- **SC-005**: Monthly payments are recorded accurately with 100% correctness - payment counter, timestamp, and event logs match actual transactions

- **SC-006**: System handles at least 100 concurrent lease commitments without transaction failures or gas limit issues

- **SC-007**: Contract deployment costs remain under 3,500,000 gas, and per-operation costs stay within estimates: mint <200k, commit <80k, reveal <150k, payment <80k gas

- **SC-008**: Smart contract passes security audit with zero critical or high-severity vulnerabilities related to reentrancy, access control, or payment handling

- **SC-009**: Test coverage exceeds 90% for all contract functions, with 100% coverage for payment and security-critical functions

- **SC-010**: Event emission accuracy is 100% - every state change emits corresponding event with correct indexed parameters

- **SC-011**: Lease extensions complete successfully in 1 transaction with accurate updates to duration and payment amounts - 100% success rate when requirements met

- **SC-012**: System rejects invalid transactions appropriately - unauthorized access attempts, incorrect payment amounts, and expired deadlines all fail with clear error messages

## Assumptions *(optional)*

- **A-001**: Deployment will be on EVM-compatible networks (Ethereum, Polygon, Arbitrum, etc.)
- **A-002**: Gas prices are within reasonable ranges for user adoption (testnet first, then mainnet)
- **A-003**: Off-chain systems (frontend, event indexing) will be built separately to interact with the contract
- **A-004**: Car model names and metadata will be stored on-chain (acceptable gas cost for MVP)
- **A-005**: One month = 30 days for payment timing calculations
- **A-006**: Lease terms (duration, monthly payment) are set at minting and only modified through explicit extension
- **A-007**: Physical car delivery and return processes are handled off-chain
- **A-008**: Identity verification of dealers and customers is handled off-chain (contract only manages addresses)
- **A-009**: OpenZeppelin contract libraries (v4.9.0+) are available and audited
- **A-010**: Solidity ^0.8.0 is supported by target deployment networks

## Dependencies *(optional)*

### External Dependencies

- **OpenZeppelin Contracts v4.9.0+**:
  - ERC721: NFT standard implementation
  - Ownable: Access control for dealer functions
  - ReentrancyGuard: Protection against reentrancy attacks

### Technical Dependencies

- **Solidity Compiler**: ^0.8.0 (for built-in overflow protection)
- **Development Framework**: Hardhat, Foundry, or Truffle for testing and deployment
- **Testing Tools**: Ethereum test framework (Hardhat Network, Ganache, or Foundry)
- **Block Explorer**: Etherscan or equivalent for contract verification

### Deployment Prerequisites

- **Testnet ETH**: For initial deployment and testing (Sepolia, Mumbai, etc.)
- **Mainnet ETH**: For production deployment (if proceeding to mainnet)
- **Node Provider**: Infura, Alchemy, or similar for blockchain connectivity

## Out of Scope *(optional)*

### Explicitly Excluded from This Feature

- **Physical car management**: Actual vehicle delivery, maintenance, and return logistics
- **Identity verification**: KYC/AML checks for dealers and customers
- **Fiat payment integration**: Converting USD/EUR to ETH for payments
- **Insurance integration**: Car insurance products and claims
- **Damage assessment**: Handling car damage or excessive wear beyond mileage
- **Multi-sig wallet integration**: Requiring multiple approvals for dealer actions
- **DAO governance**: Community voting on contract parameters or dispute resolution
- **Upgradeable proxy pattern**: Contract is immutable once deployed (v1.0.0)
- **Cross-chain functionality**: Leases on multiple blockchains simultaneously
- **NFT marketplace integration**: Listing/trading lease NFTs on OpenSea or similar
- **Oracle integration**: Real-time mileage tracking or external data feeds
- **Fractional leasing**: Multiple customers sharing a single vehicle lease
- **Payment token flexibility**: Only ETH accepted, no USDC/USDT/other tokens
- **Automated lease expiration**: Requires manual trigger, not time-based automation
- **Frontend development**: Web3 UI for browsing and managing leases (separate project)
- **Mobile app**: Native iOS/Android applications (separate project)

## Notes *(optional)*

### Implementation Guidance

This specification is designed to align with the **CarLease Constitution v1.0.0**:

- **Security-First (Principle I)**: All security requirements (FR-034 through FR-038) must be implemented before any other functionality
- **Gas Optimization (Principle II)**: Use efficient data types (uint16, uint32, uint64) and struct packing as defined in CarMetadata and Lease structures
- **Test-First (Principle III)**: Write tests for all acceptance scenarios and functional requirements BEFORE implementing contract code
- **Transparency & Events (Principle IV)**: All event requirements (FR-039 through FR-047) are mandatory for every state change
- **Upgradeability (Principle V)**: This is version 1.0.0 - document any design decisions that impact future upgrades

### Development Order Recommendation

1. **Phase 0**: Set up project structure, install dependencies, configure testing framework
2. **Phase 1**: Implement and test NFT minting (FR-001 through FR-004, User Story 1 foundation)
3. **Phase 2**: Implement and test commit-reveal mechanism (FR-005 through FR-011, User Story 5)
4. **Phase 3**: Implement and test payment processing (FR-012 through FR-017, User Story 1 continuation)
5. **Phase 4**: Implement and test confirmation/refund (FR-018 through FR-022, User Story 2)
6. **Phase 5**: Implement and test deposit management (FR-023 through FR-027, User Story 3)
7. **Phase 6**: Implement and test termination/extension (FR-028 through FR-033, User Story 4)
8. **Phase 7**: Verify all security requirements and events (FR-034 through FR-047)
9. **Phase 8**: Integration testing of complete user journeys
10. **Phase 9**: Gas optimization review and security audit preparation

### Constitution Compliance Checklist

Before proceeding to `/speckit.plan`:
- [ ] All security requirements explicitly defined (ReentrancyGuard, access control, commit-reveal)
- [ ] Gas optimization considerations documented (data types, struct packing, events)
- [ ] Test-first approach reflected in acceptance scenarios and functional requirements
- [ ] Event emission requirements specified for all state changes
- [ ] Version 1.0.0 acknowledged with upgrade considerations noted

### Business Context

This smart contract addresses the problem of **trust in vehicle leasing**. Traditional leasing requires:
- Trust that dealer won't change terms
- Trust that customer will pay
- Trust that deposits will be returned fairly
- Centralized intermediaries to enforce agreements

Blockchain solution provides:
- **Immutable lease terms** (encoded in NFT)
- **Automated enforcement** (smart contract logic)
- **Transparent payment history** (on-chain events)
- **Fair dispute resolution** (deposit mechanics)
- **Reduced intermediary costs** (direct dealer-customer interaction)

Target users: Early adopters interested in crypto-enabled car leasing, dealers wanting transparent processes, customers seeking trustless agreements.
