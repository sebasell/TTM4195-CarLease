# Implementation Plan: NFT-Based Car Leasing Smart Contract

**Branch**: `001-nft-lease-system` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-nft-lease-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Implement an NFT-based smart contract system that enables trustless car leasing between dealers and customers on EVM-compatible blockchains. Each lease option is represented as an ERC721 NFT with metadata, and the contract automates the complete lifecycle: lease selection via commit-reveal, deposit payment, dealer confirmation, monthly payments, and lease completion or default handling.

**Technical Approach**: Solidity smart contract inheriting from OpenZeppelin's ERC721, Ownable, and ReentrancyGuard. Use commit-reveal pattern to prevent front-running, struct packing for gas optimization, comprehensive event emission for transparency, and Test-Driven Development with >90% coverage. Deploy initially to testnet (Sepolia/Mumbai) before mainnet.

## Technical Context

**Language/Version**: Solidity ^0.8.0 (required for built-in overflow protection per Constitution Principle I)

**Primary Dependencies**: 
- OpenZeppelin Contracts v4.9.0+ (ERC721, Ownable, ReentrancyGuard)
- Hardhat or Foundry (testing and deployment framework - NEEDS CLARIFICATION: which to use)

**Storage**: On-chain blockchain storage (Ethereum/Polygon state)
- Mappings for NFT metadata, lease data, commitments
- Efficient struct packing (uint16/uint32/uint64) per Constitution Principle II

**Testing**: Hardhat/Foundry test framework with JavaScript/TypeScript or Solidity tests
- Unit tests for all 47 functional requirements (FR-001 through FR-047)
- Integration tests for 5 user story workflows
- Gas consumption tests for critical operations
- Security tests for reentrancy and front-running scenarios

**Target Platform**: EVM-compatible blockchains
- Primary: Ethereum Mainnet, Polygon, Arbitrum
- Testing: Sepolia (Ethereum testnet), Mumbai (Polygon testnet)

**Project Type**: Single smart contract project with supporting test infrastructure

**Performance Goals**:
- Contract deployment: <3,500,000 gas
- mintOption(): <200,000 gas
- commitToLease(): <80,000 gas
- revealAndPay(): <150,000 gas
- makeMonthlyPayment(): <80,000 gas
- claimDeposit(): <120,000 gas

**Constraints**:
- Immutable once deployed (no proxy pattern in v1.0.0)
- Must prevent reentrancy attacks (ReentrancyGuard required)
- Must prevent front-running (commit-reveal required)
- All state changes must emit events (Constitution Principle IV)
- Test coverage >90% required before deployment

**Scale/Scope**:
- Support for unlimited NFT lease options (limited only by gas)
- Handle 100+ concurrent lease commitments without issues
- Contract size must fit within 24KB deployment limit
- Event logs enable off-chain indexing of full lease history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Security-First Development ✅

**Status**: PASS - All security requirements explicitly defined

- ✅ **Reentrancy Protection**: FR-034 mandates ReentrancyGuard on all ETH transfer functions
- ✅ **Overflow Protection**: Solidity ^0.8.0 specified for built-in checks (FR-036)
- ✅ **Access Control**: FR-037 defines owner-only and lessee-only function requirements
- ✅ **Front-Running Prevention**: FR-038 requires commit-reveal pattern, implemented in User Story 5
- ✅ **Checks-Effects-Interactions**: FR-035 mandates pattern validation → update → transfer

**Justification**: Not applicable - no violations to justify

### Principle II: Gas Optimization ✅

**Status**: PASS - Gas efficiency designed into data structures

- ✅ **Efficient Data Types**: CarMetadata uses uint16 for year, Lease uses uint32/uint64 for counters/timestamps
- ✅ **Struct Packing**: Documented packing saves ~2 storage slots per lease (~5000+ gas)
- ✅ **Event-Based Data**: Payment history via events, not storage arrays (unbounded growth avoided)
- ✅ **Indexed Parameters**: Event schema defines indexed parameters for filtering efficiency
- ✅ **No Unbounded Loops**: No iteration over all leases/NFTs on-chain

**Justification**: Not applicable - no violations to justify

### Principle III: Test-First Development (NON-NEGOTIABLE) ✅

**Status**: PASS - TDD approach defined in specification

- ✅ **Tests Before Implementation**: Spec defines 17 acceptance scenarios to be written as tests first
- ✅ **Unit Tests Required**: FR-001 through FR-047 map to individual test cases
- ✅ **Integration Tests Required**: 5 user stories define end-to-end test workflows
- ✅ **Edge Case Coverage**: 10 edge cases documented with expected behaviors
- ✅ **Gas Tests Required**: SC-007 mandates gas consumption validation
- ✅ **Coverage Target**: SC-009 requires >90% coverage, 100% for security-critical functions

**Justification**: Not applicable - no violations to justify

### Principle IV: Transparency & Events ✅

**Status**: PASS - Comprehensive event emission required

- ✅ **State Change Events**: FR-039 through FR-047 define 9 events covering all state changes
- ✅ **Indexed Parameters**: Event schema specifies indexed tokenId and address parameters
- ✅ **Past Tense Naming**: Events named LeaseConfirmed, DepositClaimed (not ConfirmLease, ClaimDeposit)
- ✅ **Off-Chain Monitoring**: Event strategy enables full audit trail reconstruction
- ✅ **100% Emission Accuracy**: SC-010 requires every state change to emit corresponding event

**Justification**: Not applicable - no violations to justify

### Principle V: Upgradeability & Versioning ✅

**Status**: PASS - Version 1.0.0 with upgrade considerations documented

- ✅ **Version Documented**: Contract specified as v1.0.0 in specification notes
- ✅ **Dependencies Locked**: OpenZeppelin v4.9.0+, Solidity ^0.8.0 specified
- ✅ **Migration Strategy**: Out of scope section notes proxy pattern deferred to v2.0.0
- ✅ **Semantic Versioning**: Constitution defines MAJOR.MINOR.PATCH format
- ✅ **Design Decisions**: Immutable deployment choice documented with rationale

**Justification**: Not applicable - no violations to justify

### Overall Constitution Compliance

**GATE STATUS**: ✅ **PASSED** - Proceed to Phase 0 Research

All 5 constitution principles are addressed in the specification:
- 0 violations requiring justification
- 0 complexity debt incurred
- 0 security compromises made
- 0 testing shortcuts taken

**Re-evaluation Required**: After Phase 1 design completion (data-model.md, contracts/ generated)

---

## Phase 1 Constitution Re-Check (POST-DESIGN)

**Date**: 2025-11-02  
**Artifacts Evaluated**: data-model.md, contracts/CarLease.sol.md, quickstart.md

### Principle I: Security-First Development ✅ PASS

**Evidence**:
- ✅ **Reentrancy Protection**: contracts/CarLease.sol.md documents 5 functions with `nonReentrant` modifier (revealAndPay, makeMonthlyPayment, claimDeposit, refundUnconfirmedDeposit, terminateLease)
- ✅ **Integer Overflow**: Solidity ^0.8.0 specified with built-in overflow protection
- ✅ **Access Control**: `onlyOwner` modifier applied to mintOption, confirmLease, claimDeposit, terminateLease (conditional)
- ✅ **Front-Running Protection**: Commit-reveal pattern fully specified (hash binds tokenId + secret + msg.sender)
- ✅ **Checks-Effects-Interactions**: Internal `_sendEther()` helper follows CEI pattern in contracts/CarLease.sol.md

**Compliance Score**: 5/5 security requirements addressed

### Principle II: Gas Optimization ✅ PASS

**Evidence**:
- ✅ **Efficient Data Types**: data-model.md uses uint16 (year), uint32 (durationMonths, paymentsMade), uint64 (timestamps)
- ✅ **Struct Packing**: Lease struct optimized to 4 storage slots (saves ~40k gas per lease vs. 7 slots unpacked)
- ✅ **Event-Based Data**: Payment history via `MonthlyPaid` events (no unbounded arrays)
- ✅ **Storage Refunds**: Commitment deletion after reveal documented
- ✅ **Memory Caching**: Internal validation helpers cache storage reads

**Gas Savings Documented**: ~40,000 gas per lease creation

### Principle III: Test-First Development ✅ PASS

**Evidence**:
- ✅ **TDD Workflow**: quickstart.md documents RED-GREEN-REFACTOR cycle with complete example
- ✅ **Tests Before Code**: Example shows writing test file before implementing mintOption()
- ✅ **Test Organization**: Three-layer structure (unit/integration/gas) defined in project structure
- ✅ **Coverage Targets**: >90% overall, 100% security functions specified
- ✅ **Test Utilities**: Fixtures, time manipulation, balance checks, event assertions all documented

**Test Files Planned**: 8 unit test files, 5 integration test files, 1 gas test file

### Principle IV: Transparency & Events ✅ PASS

**Evidence**:
- ✅ **All State Changes**: 9 events defined for all state-changing operations (FR-039 through FR-047)
- ✅ **Indexed Parameters**: contracts/CarLease.sol.md uses indexed tokenId, lessee, committer, by, seller
- ✅ **Past Tense Naming**: OptionMinted, CommitPlaced, LeaseSignedRevealed, LeaseConfirmed, MonthlyPaid, LeaseTerminated, DepositClaimed, RefundUnconfirmed, LeaseExtended
- ✅ **Comprehensive Data**: Events include all changed state (e.g., LeaseSignedRevealed contains full lease terms)
- ✅ **Event-to-State Mapping**: Table in data-model.md maps every state change to its event

**Events Defined**: 9/9 required events with proper naming and indexing

### Principle V: Upgradeability & Versioning ✅ PASS

**Evidence**:
- ✅ **Dependency Versioning**: Solidity ^0.8.0, OpenZeppelin v4.9.0+, Hardhat specified
- ✅ **Semantic Versioning**: Version metadata documented in plan (1.0.0 implied)
- ✅ **Future Extensibility**: extendLease() function signature reserved (reverts with "Not implemented - reserved for v2.x")
- ✅ **Migration Strategy**: Deployment strategy (testnet → mainnet) documented in research.md R-006
- ✅ **Backward Compatibility**: Constants MAX_USAGE_PERCENT, MAX_CREDIT_FACTOR reserved for future without breaking current implementation

**Upgrade Path**: v1.0.0 → v2.x extension points documented

---

### Phase 1 Constitution Check Summary

| Principle | Status | Violations | Notes |
|-----------|--------|-----------|-------|
| I. Security-First | ✅ PASS | 0 | Reentrancy, access control, front-running all addressed |
| II. Gas Optimization | ✅ PASS | 0 | Struct packing saves ~40k gas, event-based history |
| III. Test-First Development | ✅ PASS | 0 | TDD workflow documented with full example, >90% coverage target |
| IV. Transparency & Events | ✅ PASS | 0 | 9/9 events defined with proper indexing and naming |
| V. Upgradeability | ✅ PASS | 0 | Versioning, dependencies, extension points documented |

**Overall**: ✅ **5/5 PASS** - 0 violations, 0 complexity debt, 0 security compromises

**Conclusion**: Phase 1 design artifacts (data-model.md, contracts/CarLease.sol.md, quickstart.md) fully comply with all constitution principles. Ready for Phase 2 task generation via `/speckit.tasks` command.

## Project Structure

### Documentation (this feature)

```text
specs/001-nft-lease-system/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already created)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── CarLease.sol.md  # Solidity contract interface specification
├── checklists/          # Quality validation
│   └── requirements.md  # Specification quality checklist (already created)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Single smart contract project structure
CarLease.sol             # Main contract (already exists - will be updated)
contracts/               # Additional contract files if needed
├── interfaces/          # Contract interfaces
└── libraries/           # Reusable libraries (if extracted)

test/                    # Test files (TDD - write first!)
├── unit/                # Unit tests for individual functions
│   ├── test_minting.js          # FR-001 through FR-004
│   ├── test_commit_reveal.js    # FR-005 through FR-011
│   ├── test_payments.js         # FR-012 through FR-017
│   ├── test_confirmation.js     # FR-018 through FR-022
│   ├── test_deposits.js         # FR-023 through FR-027
│   ├── test_termination.js      # FR-028 through FR-033
│   ├── test_security.js         # FR-034 through FR-038
│   └── test_events.js           # FR-039 through FR-047
├── integration/         # End-to-end workflow tests
│   ├── test_complete_lease.js   # User Story 1 (P1)
│   ├── test_refund_flow.js      # User Story 2 (P2)
│   ├── test_default_flow.js     # User Story 3 (P2)
│   ├── test_extension_flow.js   # User Story 4 (P3)
│   └── test_frontrunning.js     # User Story 5 (P1)
└── gas/                 # Gas consumption tests
    └── test_gas_costs.js        # Validate SC-007 metrics

scripts/                 # Deployment and utility scripts
├── deploy.js            # Deployment script
├── verify.js            # Contract verification on Etherscan
└── utils/               # Helper utilities

artifacts/               # Compiled contract artifacts (existing)
.deps/                   # Remix IDE dependencies (existing)
```

**Structure Decision**: Single contract project structure selected because:
- Core functionality is contained in one smart contract (CarLease.sol)
- No frontend/backend split needed (contract-only implementation)
- Test organization follows functional requirement groupings
- Follows Hardhat/Foundry standard project layout

## Complexity Tracking

**No complexity violations** - Constitution Check passed with 0 issues requiring justification.

**No complexity violations** - Constitution Check passed with 0 issues requiring justification.

---

## Phase 0: Research (NEEDS CLARIFICATION Resolution)

### Research Tasks

**Task R-001: Testing Framework Selection**

**Unknown**: Technical Context lists "Hardhat or Foundry" - need to select one framework

**Research Focus**:
- Hardhat vs Foundry comparison for Solidity testing
- Community adoption and documentation quality
- TypeScript/JavaScript vs Solidity test syntax
- Integration with existing CarLease.sol structure
- Gas reporting capabilities
- Deployment script support

**Decision Criteria**:
- Ease of use for TDD workflow
- Better gas optimization tooling
- Faster test execution
- OpenZeppelin compatibility

**Output**: Document selected framework with rationale in research.md

---

## Phase 1: Design (Post-Research)

**Prerequisites**: research.md complete with framework decision

### Phase 1 Deliverables

1. **data-model.md**: Entity definitions and relationships
   - CarMetadata structure with field validation rules
   - Lease structure with state transitions
   - Commit structure with expiration logic
   - Relationship mappings (tokenId → metadata, tokenId → lease, tokenId → commit)

2. **contracts/CarLease.sol.md**: Contract interface specification
   - Function signatures for all 47 functional requirements
   - Event definitions with indexed parameters
   - Modifier definitions (onlyOwner, nonReentrant, custom validators)
   - State variable declarations with access patterns

3. **quickstart.md**: Developer onboarding guide
   - Environment setup (Node.js, selected framework, OpenZeppelin)
   - Project initialization steps
   - Test execution commands
   - Deployment to testnet instructions
   - Contract verification process

4. **Agent context update**: Run `.specify/scripts/bash/update-agent-context.sh copilot`
   - Add Solidity, OpenZeppelin, selected test framework to context
   - Preserve manual additions between markers

### Constitution Re-Check

After Phase 1 design artifacts generated:
- ✅ Verify all security patterns documented in contracts/
- ✅ Verify gas optimization reflected in data-model.md
- ✅ Verify test structure supports TDD in quickstart.md
- ✅ Verify event schema complete in contracts/
- ✅ Verify version metadata included

---

## Phase 1: Design Artifacts ✅ COMPLETE

**Status**: All Phase 1 deliverables generated and validated  
**Date Completed**: 2025-11-02

### Deliverables

1. ✅ **data-model.md**: Entity definitions, relationships, validation rules
   - 4 entities: CarMetadata, Lease, Commit, NFT Token
   - State transition diagrams for Lease lifecycle
   - Storage optimization strategy (struct packing)
   - Validation rules mapped to FR-001 through FR-047
   - Event emission mapping for all state changes

2. ✅ **contracts/CarLease.sol.md**: Complete contract interface specification
   - Function signatures for all 47 functional requirements
   - 9 event definitions with indexed parameters (OptionMinted, CommitPlaced, LeaseSignedRevealed, LeaseConfirmed, MonthlyPaid, LeaseTerminated, DepositClaimed, RefundUnconfirmed, LeaseExtended)
   - Modifier definitions (onlyOwner, nonReentrant)
   - State variable declarations with storage patterns
   - Security considerations (reentrancy, front-running, access control)
   - Gas optimization techniques (struct packing, event-based history)
   - Internal helper functions (_sendEther, _validateContractOwnsToken)

3. ✅ **quickstart.md**: Developer onboarding guide
   - Environment setup (Node.js, Hardhat, OpenZeppelin)
   - Project initialization (npm packages, hardhat.config.js, .env)
   - TDD workflow with complete example (mintOption implementation)
   - Test fixtures and utilities (time manipulation, balance checks, event assertions)
   - Local deployment (Hardhat node, deployment script, console interaction)
   - Testnet deployment (Sepolia/Mumbai, RPC setup, faucets)
   - Contract verification (Etherscan)
   - Troubleshooting guide

4. ✅ **Agent context update**: Executed `.specify/scripts/bash/update-agent-context.sh copilot`
   - Added Solidity ^0.8.0 to context
   - Added on-chain blockchain storage to context
   - Updated .github/copilot-instructions.md

### Constitution Re-Check Results

✅ **Phase 1 Constitution Check**: 5/5 PASS (see Phase 1 Constitution Re-Check section above)
- Security: Reentrancy, access control, front-running all addressed
- Gas: Struct packing saves ~40k gas, event-based history
- TDD: Workflow documented with full example, >90% coverage target
- Events: 9/9 events defined with proper indexing and naming
- Upgradeability: Versioning, dependencies, extension points documented

---

## Next Steps

**Phase 1 Complete** ✅ → Ready for Phase 2 task generation

**To generate implementation tasks**:
```bash
/speckit.tasks
```

This will:
1. Read spec.md (user stories and functional requirements)
2. Read plan.md (technical context and design artifacts)
3. Generate tasks.md with prioritized implementation checklist
4. Organize tasks by user story with test-first approach
5. Include acceptance criteria and constitution compliance checks

**Before running /speckit.tasks**, review generated artifacts:
- ✅ research.md - Hardhat framework selected, patterns documented
- ✅ data-model.md - Entity definitions and state transitions
- ✅ contracts/CarLease.sol.md - Contract interface specification
- ✅ quickstart.md - Development environment setup

**After /speckit.tasks completes**:
1. Follow tasks.md checklist for TDD implementation
2. Write tests first (RED phase)
3. Implement minimal code to pass (GREEN phase)
4. Refactor while keeping tests green (REFACTOR phase)
5. Run coverage and gas reports periodically
6. Deploy to testnet after all tests pass

