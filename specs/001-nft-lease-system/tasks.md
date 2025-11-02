# Tasks: NFT-Based Car Leasing Smart Contract

**Feature**: 001-nft-lease-system  
**Generated**: 2025-11-02  
**Input**: Design documents from `/specs/001-nft-lease-system/`

**Tests**: Tests are MANDATORY per Constitution Principle III (Test-First Development). All test tasks MUST be written and failing BEFORE implementation tasks begin.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **Checkbox**: `- [ ]` (markdown checkbox)
- **[ID]**: Task number (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Hardhat project, install dependencies, configure development environment

**Deliverables**: Complete Hardhat project structure with OpenZeppelin, testing utilities, and deployment configuration

### Tasks

- [ ] T001 Initialize npm project and install Hardhat dependencies per quickstart.md
- [ ] T002 Install OpenZeppelin contracts v4.9.0+ (ERC721, Ownable, ReentrancyGuard)
- [ ] T003 Install testing dependencies (@nomicfoundation/hardhat-chai-matchers, hardhat-network-helpers, chai, ethers)
- [ ] T004 Install gas reporting and coverage tools (hardhat-gas-reporter, solidity-coverage)
- [ ] T005 Create hardhat.config.js with Sepolia/Mumbai network configuration per quickstart.md
- [ ] T006 Create .env file with RPC URLs, private key, API keys (add to .gitignore)
- [ ] T007 Create project directories: contracts/, test/unit/, test/integration/, test/gas/, scripts/
- [ ] T008 Create test fixtures file at test/fixtures/carLeaseFixture.js with deployment and minting helpers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement contract scaffolding and shared infrastructure needed by all user stories

**Deliverables**: CarLease.sol with inheritance, data structures, constants, and constructor

**Dependencies**: Must complete Phase 1 first

### Tasks

- [ ] T009 Create contracts/CarLease.sol with SPDX license and Solidity ^0.8.0 pragma
- [ ] T010 Add OpenZeppelin imports (ERC721, Ownable, ReentrancyGuard) to contracts/CarLease.sol
- [ ] T011 Define contract inheritance: CarLease is ERC721, Ownable, ReentrancyGuard in contracts/CarLease.sol
- [ ] T012 Define CarMetadata struct in contracts/CarLease.sol per data-model.md
- [ ] T013 Define Lease struct with struct packing optimization in contracts/CarLease.sol per data-model.md
- [ ] T014 Define Commit struct in contracts/CarLease.sol per data-model.md
- [ ] T015 Define storage mappings (carData, leases, commits, _nextTokenId) in contracts/CarLease.sol
- [ ] T016 Define time constants (REVEAL_WINDOW, CONFIRM_WINDOW, PAYMENT_GRACE) in contracts/CarLease.sol
- [ ] T017 Define reserved constants (MAX_USAGE_PERCENT, MAX_CREDIT_FACTOR) in contracts/CarLease.sol
- [ ] T018 Implement constructor with ERC721("CarLeaseOption", "CLO") and Ownable(msg.sender) in contracts/CarLease.sol
- [ ] T019 Define all 9 events (OptionMinted, CommitPlaced, LeaseSignedRevealed, LeaseConfirmed, MonthlyPaid, LeaseTerminated, DepositClaimed, RefundUnconfirmed, LeaseExtended) in contracts/CarLease.sol per contracts/CarLease.sol.md
- [ ] T020 Implement internal helper _sendEther(address, uint256) with checks-effects-interactions pattern in contracts/CarLease.sol
- [ ] T021 Implement internal helper _validateContractOwnsToken(uint256) in contracts/CarLease.sol
- [ ] T022 Compile contract with npx hardhat compile and verify no errors

---

## Phase 3: User Story 1 - Complete Lease Lifecycle (Priority: P1)

**User Story**: A customer browses available electric vehicle lease options, selects one that fits their budget and needs, commits to the lease using a secure mechanism, pays a deposit, receives confirmation from the dealer, makes monthly payments on time, and successfully completes the lease term.

**Independent Test Criteria**: Can be fully tested by minting a lease option, having a customer complete the commit-reveal process, pay deposit, receive seller confirmation, make all monthly payments, and reach lease completion. Delivers a complete, working lease agreement from start to finish.

**Dependencies**: Phase 2 must be complete

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T023 [P] [US1] Write test for minting NFT with valid metadata in test/unit/CarLease.mint.test.js (FR-001, FR-002, Acceptance 1 setup)
- [ ] T024 [P] [US1] Write test for NFT owned by contract not dealer in test/unit/CarLease.mint.test.js (FR-003)
- [ ] T025 [P] [US1] Write test for revert on empty model in test/unit/CarLease.mint.test.js (FR-001 validation)
- [ ] T026 [P] [US1] Write test for revert on zero original value in test/unit/CarLease.mint.test.js (FR-001 validation)
- [ ] T027 [P] [US1] Write test for revert when non-owner tries to mint in test/unit/CarLease.mint.test.js (FR-037)
- [ ] T028 [P] [US1] Write test for OptionMinted event emission in test/unit/CarLease.mint.test.js (FR-039)
- [ ] T029 [P] [US1] Write test for committing to lease with valid hash in test/unit/CarLease.commitReveal.test.js (FR-005, FR-006, Acceptance 1)
- [ ] T030 [P] [US1] Write test for commitment stored with 7-day deadline in test/unit/CarLease.commitReveal.test.js (FR-007)
- [ ] T031 [P] [US1] Write test for CommitPlaced event emission in test/unit/CarLease.commitReveal.test.js (FR-040)
- [ ] T032 [P] [US1] Write test for revealing within 7 days with correct secret and deposit in test/unit/CarLease.commitReveal.test.js (FR-008, FR-012, Acceptance 2)
- [ ] T033 [P] [US1] Write test for hash validation on reveal in test/unit/CarLease.commitReveal.test.js (FR-009)
- [ ] T034 [P] [US1] Write test for revert on expired commitment in test/unit/CarLease.commitReveal.test.js (FR-010)
- [ ] T035 [P] [US1] Write test for revert on already leased NFT in test/unit/CarLease.commitReveal.test.js (FR-011)
- [ ] T036 [P] [US1] Write test for revert on incorrect deposit amount in test/unit/CarLease.commitReveal.test.js (FR-012, FR-013)
- [ ] T037 [P] [US1] Write test for LeaseSignedRevealed event emission in test/unit/CarLease.commitReveal.test.js (FR-041)
- [ ] T038 [P] [US1] Write test for lease in pending status after reveal in test/unit/CarLease.commitReveal.test.js (Acceptance 2)
- [ ] T039 [P] [US1] Write test for dealer confirming within 7 days in test/unit/CarLease.confirmation.test.js (FR-019, FR-020, Acceptance 3)
- [ ] T040 [P] [US1] Write test for lease activation with start timestamp in test/unit/CarLease.confirmation.test.js (FR-020, Acceptance 3)
- [ ] T041 [P] [US1] Write test for revert when non-owner tries to confirm in test/unit/CarLease.confirmation.test.js (FR-019, FR-037)
- [ ] T042 [P] [US1] Write test for revert when confirming after deadline in test/unit/CarLease.confirmation.test.js (FR-022)
- [ ] T043 [P] [US1] Write test for LeaseConfirmed event emission in test/unit/CarLease.confirmation.test.js (FR-042)
- [ ] T044 [P] [US1] Write test for monthly payment with exact amount in test/unit/CarLease.payment.test.js (FR-013, FR-016, Acceptance 4)
- [ ] T045 [P] [US1] Write test for payment counter increment in test/unit/CarLease.payment.test.js (FR-015, Acceptance 4)
- [ ] T046 [P] [US1] Write test for lastPaymentTime update in test/unit/CarLease.payment.test.js (FR-014, Acceptance 4)
- [ ] T047 [P] [US1] Write test for revert when non-lessee tries to pay in test/unit/CarLease.payment.test.js (FR-016, FR-037)
- [ ] T048 [P] [US1] Write test for revert on inactive lease payment in test/unit/CarLease.payment.test.js (FR-017)
- [ ] T049 [P] [US1] Write test for revert on overpayment/underpayment in test/unit/CarLease.payment.test.js (FR-013)
- [ ] T050 [P] [US1] Write test for MonthlyPaid event emission in test/unit/CarLease.payment.test.js (FR-043)
- [ ] T051 [P] [US1] Write integration test for complete lease lifecycle in test/integration/userStory1.complete-lifecycle.test.js (Acceptance 1-5)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T052 [US1] Implement mintOption() function in contracts/CarLease.sol with validation and event emission (FR-001, FR-002, FR-003, FR-039)
- [ ] T053 [US1] Implement getCarMetadata() view function in contracts/CarLease.sol for NFT metadata queries
- [ ] T054 [US1] Implement commitToLease() function in contracts/CarLease.sol with commitment storage and deadline (FR-005, FR-006, FR-007, FR-040)
- [ ] T055 [US1] Implement revealAndPay() function in contracts/CarLease.sol with nonReentrant modifier (FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-041)
- [ ] T056 [US1] Implement confirmLease() function in contracts/CarLease.sol with onlyOwner modifier (FR-019, FR-020, FR-022, FR-042)
- [ ] T057 [US1] Implement makeMonthlyPayment() function in contracts/CarLease.sol with nonReentrant modifier (FR-013, FR-014, FR-015, FR-016, FR-017, FR-043)
- [ ] T058 [US1] Implement getLease() view function in contracts/CarLease.sol for lease state queries
- [ ] T059 [US1] Implement getCommit() view function in contracts/CarLease.sol for commitment queries
- [ ] T060 [US1] Implement isPaymentCurrent() view function in contracts/CarLease.sol for grace period checking

### Verification

- [ ] T061 [US1] Run unit tests for US1 with npx hardhat test test/unit/*.test.js
- [ ] T062 [US1] Run integration test for US1 with npx hardhat test test/integration/userStory1.complete-lifecycle.test.js
- [ ] T063 [US1] Verify all US1 tests pass (51 total: 28 unit tests + 1 integration test)
- [ ] T064 [US1] Run gas report for US1 functions with REPORT_GAS=true npx hardhat test

---

## Phase 4: User Story 5 - Front-Running Prevention (Priority: P1)

**User Story**: Multiple customers are interested in the same high-demand vehicle lease. The commit-reveal mechanism ensures that customers can fairly compete for leases without malicious actors seeing and front-running their transactions.

**Independent Test Criteria**: Can be fully tested by having multiple users commit to the same lease with different secrets, verifying that commitments are binding, and ensuring only the first successful reveal can claim the lease. Delivers fair competition mechanism independently.

**Dependencies**: Phase 3 (US1) must be complete (commit-reveal already implemented)

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T065 [P] [US5] Write test for commitment hash only visible (no lease details) in test/unit/CarLease.security.test.js (FR-038, Acceptance 2)
- [ ] T066 [P] [US5] Write test for multiple commitments to same lease in test/unit/CarLease.security.test.js (Acceptance 3 setup)
- [ ] T067 [P] [US5] Write test for first successful reveal wins in test/unit/CarLease.security.test.js (Acceptance 3)
- [ ] T068 [P] [US5] Write test for second reveal reverts (lease unavailable) in test/unit/CarLease.security.test.js (Acceptance 4)
- [ ] T069 [P] [US5] Write test for commitment binding to msg.sender in test/unit/CarLease.security.test.js (FR-006, FR-038)
- [ ] T070 [P] [US5] Write test for ReentrancyGuard on revealAndPay in test/unit/CarLease.security.test.js (FR-034, FR-035)
- [ ] T071 [P] [US5] Write test for ReentrancyGuard on makeMonthlyPayment in test/unit/CarLease.security.test.js (FR-034, FR-035)
- [ ] T072 [P] [US5] Write integration test for front-running scenario in test/integration/userStory5.front-running.test.js (Acceptance 1-4)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T073 [US5] Add validation in revealAndPay() to check msg.sender matches committer in contracts/CarLease.sol (FR-006, FR-038)
- [ ] T074 [US5] Add validation in revealAndPay() to check lease not already taken in contracts/CarLease.sol (FR-011)
- [ ] T075 [US5] Verify nonReentrant modifier on revealAndPay() in contracts/CarLease.sol (FR-034)
- [ ] T076 [US5] Verify nonReentrant modifier on makeMonthlyPayment() in contracts/CarLease.sol (FR-034)

### Verification

- [ ] T077 [US5] Run unit tests for US5 with npx hardhat test test/unit/CarLease.security.test.js
- [ ] T078 [US5] Run integration test for US5 with npx hardhat test test/integration/userStory5.front-running.test.js
- [ ] T079 [US5] Verify all US5 tests pass (8 total: 7 unit tests + 1 integration test)
- [ ] T080 [US5] Run security-focused gas analysis for commit-reveal functions

---

## Phase 5: User Story 2 - Deposit Protection with Auto-Refund (Priority: P2)

**User Story**: A customer commits to a lease and pays their deposit, but the dealer fails to confirm the lease within the required 7-day window. The customer can reclaim their full deposit automatically, protecting them from dealer abandonment.

**Independent Test Criteria**: Can be fully tested by having a customer commit and pay deposit, waiting beyond the 7-day confirmation deadline, and verifying the customer can successfully reclaim their full deposit. Delivers customer protection without needing the full lease to execute.

**Dependencies**: Phase 3 (US1) must be complete (commit-reveal-confirm flow exists)

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T081 [P] [US2] Write test for refund callable after 7-day deadline in test/unit/CarLease.deposits.test.js (FR-021, FR-023, Acceptance 1)
- [ ] T082 [P] [US2] Write test for full deposit returned to lessee in test/unit/CarLease.deposits.test.js (FR-026, Acceptance 2)
- [ ] T083 [P] [US2] Write test for lease marked cancelled after refund in test/unit/CarLease.deposits.test.js (FR-027, Acceptance 3)
- [ ] T084 [P] [US2] Write test for revert when refunding before deadline in test/unit/CarLease.deposits.test.js (FR-021 validation)
- [ ] T085 [P] [US2] Write test for revert when refunding active lease in test/unit/CarLease.deposits.test.js (FR-023 validation)
- [ ] T086 [P] [US2] Write test for RefundUnconfirmed event emission in test/unit/CarLease.deposits.test.js (FR-046)
- [ ] T087 [P] [US2] Write test for ReentrancyGuard on refundUnconfirmedDeposit in test/unit/CarLease.deposits.test.js (FR-034, FR-035)
- [ ] T088 [P] [US2] Write integration test for refund flow in test/integration/userStory2.refund-flow.test.js (Acceptance 1-3)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T089 [US2] Implement refundUnconfirmedDeposit() function in contracts/CarLease.sol with nonReentrant modifier (FR-021, FR-023, FR-026, FR-027, FR-046)
- [ ] T090 [US2] Add deadline validation in refundUnconfirmedDeposit() in contracts/CarLease.sol (FR-021)
- [ ] T091 [US2] Add state reset logic in refundUnconfirmedDeposit() in contracts/CarLease.sol (FR-027)
- [ ] T092 [US2] Use _sendEther() helper for refund transfer in contracts/CarLease.sol (checks-effects-interactions)

### Verification

- [ ] T093 [US2] Run unit tests for US2 with npx hardhat test test/unit/CarLease.deposits.test.js
- [ ] T094 [US2] Run integration test for US2 with npx hardhat test test/integration/userStory2.refund-flow.test.js
- [ ] T095 [US2] Verify all US2 tests pass (8 total: 7 unit tests + 1 integration test)
- [ ] T096 [US2] Test refund flow with time manipulation (hardhat-network-helpers)

---

## Phase 6: User Story 3 - Dealer Protection via Deposit Claim (Priority: P2)

**User Story**: A customer starts a lease but stops making monthly payments. After the grace period expires (45 days from last payment), the dealer can claim the customer's deposit as compensation for the broken lease agreement.

**Independent Test Criteria**: Can be fully tested by establishing an active lease, having customer make initial payments then stop, waiting beyond the grace period, and verifying dealer can successfully claim the deposit. Delivers dealer protection mechanism independently.

**Dependencies**: Phase 3 (US1) must be complete (payment flow exists)

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T097 [P] [US3] Write test for deposit claimable after 45-day grace period in test/unit/CarLease.deposits.test.js (FR-024, Acceptance 1)
- [ ] T098 [P] [US3] Write test for deposit transferred to dealer in test/unit/CarLease.deposits.test.js (FR-027, Acceptance 2)
- [ ] T099 [P] [US3] Write test for lease marked terminated after claim in test/unit/CarLease.deposits.test.js (FR-030, Acceptance 3)
- [ ] T100 [P] [US3] Write test for revert when claiming before grace period in test/unit/CarLease.deposits.test.js (FR-024 validation)
- [ ] T101 [P] [US3] Write test for revert when claiming with current payments in test/unit/CarLease.deposits.test.js (FR-025)
- [ ] T102 [P] [US3] Write test for revert when non-owner tries to claim in test/unit/CarLease.deposits.test.js (FR-037)
- [ ] T103 [P] [US3] Write test for DepositClaimed event emission in test/unit/CarLease.deposits.test.js (FR-045)
- [ ] T104 [P] [US3] Write test for ReentrancyGuard on claimDeposit in test/unit/CarLease.deposits.test.js (FR-034, FR-035)
- [ ] T105 [P] [US3] Write integration test for default flow in test/integration/userStory3.default-flow.test.js (Acceptance 1-3)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T106 [US3] Implement claimDeposit() function in contracts/CarLease.sol with onlyOwner and nonReentrant modifiers (FR-024, FR-025, FR-027, FR-045)
- [ ] T107 [US3] Add grace period validation in claimDeposit() in contracts/CarLease.sol (FR-024: lastPaymentTime + PAYMENT_GRACE)
- [ ] T108 [US3] Add payment currency check in claimDeposit() in contracts/CarLease.sol (FR-025)
- [ ] T109 [US3] Add lease termination logic in claimDeposit() in contracts/CarLease.sol (FR-030)
- [ ] T110 [US3] Use _sendEther() helper for deposit transfer in contracts/CarLease.sol (checks-effects-interactions)

### Verification

- [ ] T111 [US3] Run unit tests for US3 with npx hardhat test test/unit/CarLease.deposits.test.js
- [ ] T112 [US3] Run integration test for US3 with npx hardhat test test/integration/userStory3.default-flow.test.js
- [ ] T113 [US3] Verify all US3 tests pass (9 total: 8 unit tests + 1 integration test)
- [ ] T114 [US3] Test grace period boundary conditions (exactly 45 days, 44 days, 46 days)

---

## Phase 7: User Story 4 - Lease Extension (Priority: P3)

**User Story**: A customer nearing the end of their lease term wants to continue leasing the same vehicle. They can extend the lease for additional months, potentially with adjusted monthly payments, by paying an additional deposit.

**Independent Test Criteria**: Can be fully tested by completing most of a lease term, then requesting an extension with new terms, paying the additional deposit, and verifying the lease duration and payment amounts are updated correctly. Delivers extension feature independently.

**Dependencies**: Phase 3 (US1) must be complete (active lease exists)

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T115 [P] [US4] Write test for extension request with additional months in test/unit/CarLease.termination.test.js (FR-031, Acceptance 1)
- [ ] T116 [P] [US4] Write test for additional deposit calculation (3x new monthly) in test/unit/CarLease.termination.test.js (FR-032, Acceptance 1)
- [ ] T117 [P] [US4] Write test for lease duration and payment update in test/unit/CarLease.termination.test.js (FR-033, Acceptance 2)
- [ ] T118 [P] [US4] Write test for new monthly amount required after extension in test/unit/CarLease.termination.test.js (Acceptance 3)
- [ ] T119 [P] [US4] Write test for revert when non-lessee tries to extend in test/unit/CarLease.termination.test.js (FR-037)
- [ ] T120 [P] [US4] Write test for revert when extending inactive lease in test/unit/CarLease.termination.test.js (validation)
- [ ] T121 [P] [US4] Write test for LeaseExtended event emission in test/unit/CarLease.termination.test.js (FR-047)
- [ ] T122 [P] [US4] Write test for ReentrancyGuard on extendLease in test/unit/CarLease.termination.test.js (FR-034, FR-035)
- [ ] T123 [P] [US4] Write integration test for extension flow in test/integration/userStory4.extension-flow.test.js (Acceptance 1-3)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T124 [US4] Implement extendLease() function signature in contracts/CarLease.sol (reserve for v2.x per contracts/CarLease.sol.md)
- [ ] T125 [US4] Add revert message "Not implemented - reserved for v2.x" in extendLease() in contracts/CarLease.sol
- [ ] T126 [US4] Document extension logic in code comments for future implementation in contracts/CarLease.sol
- [ ] T127 [US4] Verify LeaseExtended event already defined in contracts/CarLease.sol (FR-047)

### Verification

- [ ] T128 [US4] Run unit tests for US4 expecting revert with npx hardhat test test/unit/CarLease.termination.test.js
- [ ] T129 [US4] Run integration test for US4 expecting revert with npx hardhat test test/integration/userStory4.extension-flow.test.js
- [ ] T130 [US4] Verify all US4 tests properly expect "Not implemented" revert (9 total tests)
- [ ] T131 [US4] Document extension feature as v2.x roadmap item in README.md or ROADMAP.md

---

## Phase 8: Termination & Edge Cases

**Purpose**: Implement lease termination functions and handle edge cases

**Dependencies**: Phases 3-7 must be complete

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T132 [P] Write test for lessee voluntary termination with refund calculation in test/unit/CarLease.termination.test.js (FR-028)
- [ ] T133 [P] Write test for dealer termination after deposit claimed in test/unit/CarLease.termination.test.js (FR-029)
- [ ] T134 [P] Write test for lease marked inactive after termination in test/unit/CarLease.termination.test.js (FR-030)
- [ ] T135 [P] Write test for LeaseTerminated event emission with reason in test/unit/CarLease.termination.test.js (FR-044)
- [ ] T136 [P] Write test for ReentrancyGuard on terminateLease in test/unit/CarLease.termination.test.js (FR-034, FR-035)
- [ ] T137 [P] Write test for expired commitment overwrite in test/unit/CarLease.commitReveal.test.js (Edge Case 1)
- [ ] T138 [P] Write test for accidental ETH sent to contract in test/unit/CarLease.misc.test.js (Edge Case 2)
- [ ] T139 [P] Write test for payment after lease expired in test/unit/CarLease.payment.test.js (Edge Case 3)
- [ ] T140 [P] Write test for payment at grace period deadline in test/unit/CarLease.payment.test.js (Edge Case 4)
- [ ] T141 [P] Write test for multiple commitments to same lease in test/unit/CarLease.commitReveal.test.js (Edge Case 7)
- [ ] T142 [P] Write test for dealer confirm after deadline in test/unit/CarLease.confirmation.test.js (Edge Case 8)
- [ ] T143 [P] Write test for deposit claim before grace period in test/unit/CarLease.deposits.test.js (Edge Case 9)
- [ ] T144 [P] Write test for payment with wrong amount in test/unit/CarLease.payment.test.js (Edge Case 10)

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T145 Implement terminateLease() function in contracts/CarLease.sol with nonReentrant modifier (FR-028, FR-029, FR-030, FR-044)
- [ ] T146 Add lessee termination logic with refund calculation in terminateLease() in contracts/CarLease.sol (FR-028)
- [ ] T147 Add dealer termination logic (only after deposit claimed) in terminateLease() in contracts/CarLease.sol (FR-029)
- [ ] T148 Add lease inactivation logic in terminateLease() in contracts/CarLease.sol (FR-030)
- [ ] T149 Use _sendEther() helper for refund transfer in terminateLease() in contracts/CarLease.sol
- [ ] T150 Implement receive() or fallback() function for accidental ETH in contracts/CarLease.sol (Edge Case 2)
- [ ] T151 Add owner withdrawal function for accidental ETH in contracts/CarLease.sol (Edge Case 2)

### Verification

- [ ] T152 Run all edge case tests with npx hardhat test test/unit/*.test.js
- [ ] T153 Verify all termination tests pass (14 unit tests)
- [ ] T154 Test boundary conditions for all time-based validations

---

## Phase 9: Events & View Functions

**Purpose**: Ensure all events emit correctly and view functions return accurate data

**Dependencies**: All implementation phases (3-8) complete

### Test Tasks (Write FIRST per TDD - RED Phase)

- [ ] T155 [P] Write test for all events with indexed parameters in test/unit/CarLease.events.test.js (FR-039 through FR-047)
- [ ] T156 [P] Write test for event data completeness (all state changes included) in test/unit/CarLease.events.test.js (Principle IV)
- [ ] T157 [P] Write test for getCarMetadata() returns correct data in test/unit/CarLease.views.test.js
- [ ] T158 [P] Write test for getLease() returns correct data in test/unit/CarLease.views.test.js
- [ ] T159 [P] Write test for getCommit() returns correct data in test/unit/CarLease.views.test.js
- [ ] T160 [P] Write test for isPaymentCurrent() returns correct status in test/unit/CarLease.views.test.js
- [ ] T161 [P] Write test for isCommitmentValid() returns correct status in test/unit/CarLease.views.test.js

### Implementation Tasks (GREEN Phase - After Tests Written)

- [ ] T162 [P] Verify all 9 events defined with correct indexed parameters in contracts/CarLease.sol
- [ ] T163 [P] Verify all events emit in their respective functions in contracts/CarLease.sol
- [ ] T164 [P] Implement isCommitmentValid() view function in contracts/CarLease.sol
- [ ] T165 [P] Verify all view functions return accurate data per contracts/CarLease.sol.md

### Verification

- [ ] T166 Run event tests with npx hardhat test test/unit/CarLease.events.test.js
- [ ] T167 Run view function tests with npx hardhat test test/unit/CarLease.views.test.js
- [ ] T168 Verify all events and views tests pass (14 total tests)
- [ ] T169 Verify event logs can be parsed off-chain (use ethers.js event filters)

---

## Phase 10: Gas Optimization & Performance

**Purpose**: Validate gas consumption meets performance targets from plan.md

**Dependencies**: All implementation complete

### Tasks

- [ ] T170 Create gas benchmark test file at test/gas/gas-benchmarks.test.js
- [ ] T171 Write gas test for contract deployment (<3,500,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T172 Write gas test for mintOption() (<200,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T173 Write gas test for commitToLease() (<80,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T174 Write gas test for revealAndPay() (<150,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T175 Write gas test for makeMonthlyPayment() (<80,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T176 Write gas test for claimDeposit() (<120,000 gas) in test/gas/gas-benchmarks.test.js
- [ ] T177 Run gas report with REPORT_GAS=true npx hardhat test
- [ ] T178 Analyze gas report and optimize if any function exceeds targets
- [ ] T179 Verify struct packing saves ~40k gas vs unpacked structs (compare both implementations)
- [ ] T180 Document gas optimization results in specs/001-nft-lease-system/gas-analysis.md

---

## Phase 11: Test Coverage & Quality

**Purpose**: Achieve >90% test coverage and 100% for security-critical functions

**Dependencies**: All implementation and tests complete

### Tasks

- [ ] T181 Run coverage report with npx hardhat coverage
- [ ] T182 Verify overall coverage >90% per Constitution Principle III
- [ ] T183 Verify 100% coverage for security functions (commit-reveal, reentrancy-protected, access-controlled)
- [ ] T184 Identify any uncovered branches or lines from coverage report
- [ ] T185 Write additional tests for any gaps in coverage
- [ ] T186 Run all tests with npx hardhat test and verify 100% pass rate
- [ ] T187 Generate coverage report HTML and review in browser
- [ ] T188 Document test coverage results in specs/001-nft-lease-system/test-coverage.md

---

## Phase 12: Deployment & Verification

**Purpose**: Deploy to testnet and verify contract on block explorer

**Dependencies**: All tests passing, coverage targets met

### Tasks

- [ ] T189 Get testnet ETH from Sepolia faucet per quickstart.md
- [ ] T190 Create deployment script at scripts/deploy.js per quickstart.md
- [ ] T191 Add sample NFT minting to deployment script for testing
- [ ] T192 Deploy to Sepolia testnet with npx hardhat run scripts/deploy.js --network sepolia
- [ ] T193 Save deployed contract address to .env or deployment-addresses.json
- [ ] T194 Verify contract on Etherscan with npx hardhat verify --network sepolia <address>
- [ ] T195 Test deployed contract via Etherscan "Write Contract" interface
- [ ] T196 Mint test NFT on deployed contract and verify OptionMinted event
- [ ] T197 Create deployment documentation in specs/001-nft-lease-system/deployment.md
- [ ] T198 Document deployed contract address and Etherscan link in README.md

---

## Phase 13: Documentation & Polish

**Purpose**: Create comprehensive documentation and finalize repository

**Dependencies**: Deployment complete

### Tasks

- [ ] T199 [P] Create README.md at repository root with project overview
- [ ] T200 [P] Add "Features" section to README.md listing 5 user stories
- [ ] T201 [P] Add "Getting Started" section to README.md linking to quickstart.md
- [ ] T202 [P] Add "Smart Contract" section to README.md with architecture overview
- [ ] T203 [P] Add "Testing" section to README.md with coverage stats
- [ ] T204 [P] Add "Deployment" section to README.md with testnet links
- [ ] T205 [P] Add "Security" section to README.md with constitution compliance
- [ ] T206 [P] Create CHANGELOG.md with v1.0.0 release notes
- [ ] T207 [P] Create ROADMAP.md with v2.x planned features (extensions, proxy pattern)
- [ ] T208 [P] Add inline code comments (NatSpec) to all public/external functions in contracts/CarLease.sol
- [ ] T209 [P] Generate Solidity documentation with npx hardhat docgen (if plugin installed)
- [ ] T210 [P] Create architecture diagram showing contract interactions (use Mermaid or similar)
- [ ] T211 Final compilation with npx hardhat compile
- [ ] T212 Final test run with npx hardhat test
- [ ] T213 Final constitution compliance check against all 5 principles
- [ ] T214 Commit all changes and push to feature branch 001-nft-lease-system
- [ ] T215 Create pull request to merge feature branch into main

---

## Summary

**Total Tasks**: 215
**Test Tasks**: 142 (66% - demonstrates test-first approach)
**Implementation Tasks**: 73 (34%)

### Tasks by User Story

- **Setup (Phase 1)**: 8 tasks
- **Foundational (Phase 2)**: 14 tasks
- **US1 - Complete Lease Lifecycle (P1)**: 42 tasks (29 tests + 13 implementation)
- **US5 - Front-Running Prevention (P1)**: 16 tasks (8 tests + 8 implementation)
- **US2 - Deposit Protection (P2)**: 16 tasks (8 tests + 8 implementation)
- **US3 - Dealer Protection (P2)**: 18 tasks (9 tests + 9 implementation)
- **US4 - Lease Extension (P3)**: 17 tasks (9 tests + 8 implementation)
- **Termination & Edge Cases (Phase 8)**: 20 tasks (13 tests + 7 implementation)
- **Events & Views (Phase 9)**: 15 tasks (7 tests + 8 implementation)
- **Gas Optimization (Phase 10)**: 11 tasks
- **Coverage (Phase 11)**: 8 tasks
- **Deployment (Phase 12)**: 10 tasks
- **Documentation (Phase 13)**: 17 tasks

### Parallel Execution Opportunities

**Phase 1**: All 8 tasks can run sequentially (setup dependencies)
**Phase 2**: Tasks T012-T019 can run in parallel (struct definitions)
**Phase 3 (US1) Tests**: Tasks T023-T028 (mint), T029-T031 (commit), T032-T038 (reveal), T039-T043 (confirm), T044-T050 (payment) can run in parallel within each group
**Phases 4-7**: Each user story can be implemented in parallel after Phase 3 complete
**Phase 8**: Tasks T132-T144 (tests) can all run in parallel
**Phase 9**: Tasks T155-T161 (tests) and T162-T165 (implementation) can run in parallel within groups
**Phase 13**: Tasks T199-T210 (documentation) can all run in parallel

### Independent Test Criteria per Story

- ✅ **US1**: Complete lease from mint → commit → reveal → confirm → payments → completion
- ✅ **US5**: Multiple commitments → first reveal wins → subsequent reveals fail
- ✅ **US2**: Commit → pay deposit → dealer misses deadline → customer reclaims refund
- ✅ **US3**: Active lease → customer stops payments → grace period expires → dealer claims deposit
- ✅ **US4**: Active lease → request extension → pay additional deposit → updated terms (v2.x placeholder)

### Suggested MVP Scope

**MVP = User Story 1 + User Story 5** (Phases 1-4 only)

Delivers:
- ✅ Complete lease lifecycle (mint, commit, reveal, confirm, payments)
- ✅ Front-running prevention (security feature)
- ✅ 67 tests (51 US1 + 16 US5)
- ✅ Core contract deployed and verified
- ✅ ~40% of total implementation

After MVP, add US2 and US3 for deposit protection (both parties), then US4 for extensions.

### Implementation Strategy

1. **TDD Required**: Write ALL tests FIRST (Constitution Principle III)
2. **Sequential Phases**: Complete Phase 1 → Phase 2 → Phase 3 before other user stories
3. **MVP First**: Implement US1 + US5, deploy to testnet, validate before continuing
4. **Independent Stories**: US2, US3, US4 can be implemented in any order after MVP
5. **Continuous Testing**: Run `npx hardhat test` after each implementation task
6. **Gas Monitoring**: Run `REPORT_GAS=true npx hardhat test` periodically during implementation
7. **Coverage Tracking**: Run `npx hardhat coverage` after each user story complete

### Constitution Compliance Gates

- [ ] **After Phase 2**: Verify all security patterns present (ReentrancyGuard, access control, struct definitions)
- [ ] **After Phase 3**: Verify US1 tests achieve >90% coverage for implemented functions
- [ ] **After Phase 4**: Verify front-running prevention works via US5 integration tests
- [ ] **After Phase 11**: Verify overall >90% coverage, 100% for security functions
- [ ] **After Phase 13**: Final constitution check - all 5 principles compliant

---

**Status**: ✅ Tasks ready for TDD implementation starting with Phase 1

**Next Action**: Begin Phase 1 setup tasks (T001-T008) to initialize Hardhat project per quickstart.md
