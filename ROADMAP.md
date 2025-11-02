# TTM4195-CarLease Roadmap

## Current Version: v1.0 (MVP)

### ✅ Released Features

**User Story 1: Complete Lease Lifecycle** (Priority: P1)
- NFT-based lease option minting by dealers
- Commit-reveal pattern for customer leasing
- Deposit payment (3x monthly payment)
- Dealer confirmation with 7-day window
- Monthly payment tracking with 45-day grace period
- Lease termination by owner or lessee

**User Story 5: Front-Running Prevention** (Priority: P1)
- Cryptographic commitment mechanism
- Secret-based reveal process
- First-reveal-wins competition
- Address binding to prevent front-running attacks

**User Story 2: Customer Deposit Protection** (Priority: P2)
- Automatic refund after 7-day dealer abandonment
- Full deposit return if lease not confirmed
- Lease cancellation with proper state cleanup

**User Story 3: Dealer Deposit Protection** (Priority: P2)
- Deposit claim after 45-day payment grace period
- Protection against customer default
- Lease termination after claim

### 🏗️ v1.1 - Planned Enhancements

**Phase 8: Termination & Edge Cases**
- Enhanced lease termination logic
- Early termination penalties
- Edge case handling (zero payments, immediate default, etc.)

**Phase 9: Gas Optimization**
- Storage slot optimization (already implemented in struct packing)
- Function call optimization
- Event emission efficiency

**Phase 10: Security Hardening**
- Additional reentrancy tests
- Access control edge cases
- Integer overflow/underflow validation (built-in with Solidity ^0.8.0)

**Phase 11: Event Coverage**
- Ensure all state changes emit events
- Add indexed parameters for filtering
- Event documentation

**Phase 12: Documentation**
- NatSpec documentation for all functions
- Architecture diagrams
- Deployment guide
- Integration examples

**Phase 13: Deployment Preparation**
- Testnet deployment scripts
- Mainnet deployment checklist
- Contract verification
- Gas usage analysis

---

## v2.0 - Future Features

### 🔮 User Story 4: Lease Extension (Reserved)

**Status**: Stub implemented, tests verify "Not implemented" revert

**Feature Description**:
Allow customers to extend active leases for additional months with adjusted payment terms.

**Planned Functionality**:
```solidity
function extendLease(
    uint256 tokenId,
    uint256 additionalMonths,
    uint256 newMonthlyPayment
) external payable nonReentrant
```

**Requirements**:
- **FR-031**: Extension request handling
  - Only lessee can extend their active lease
  - Validate lease is active (not terminated or expired)
  - Possibly restrict to "near end" (e.g., 80% complete)

- **FR-032**: Additional deposit calculation
  - Require `msg.value == newMonthlyPayment * 3`
  - Add to existing deposit balance
  - Ensure sufficient security for extension period

- **FR-033**: Lease duration and payment updates
  - `lease.durationMonths += additionalMonths`
  - `lease.monthlyPayment = newMonthlyPayment`
  - `lease.deposit += msg.value`
  - Recalculate expected payments based on new terms

- **FR-047**: Event emission
  - `emit LeaseExtended(tokenId, lessee, additionalMonths, newMonthlyPayment, additionalDeposit)`
  - Emit before state changes per events-first principle

**Design Considerations** (To Be Resolved):

1. **Timing Restrictions**:
   - Allow extensions at any time or only near lease end?
   - Minimum months remaining before extension allowed?
   - Maximum number of extensions per lease?

2. **Payment Adjustments**:
   - Allow any payment amount or enforce min/max bounds?
   - Tie to original monthly payment (e.g., ±20% only)?
   - Market rate adjustments?

3. **Deposit Handling**:
   - Keep original deposit + new deposit separate?
   - Single combined deposit pool?
   - How to handle refunds after extensions?

4. **Duration Limits**:
   - Maximum lease duration after extensions?
   - Minimum extension period (e.g., 3 months minimum)?
   - Total mileage recalculation?

5. **Confirmation Process**:
   - Does dealer need to confirm extension?
   - Automatic approval or manual review?
   - Extension request timeout?

**Implementation Checklist**:
- [ ] Resolve design considerations
- [ ] Update Lease struct if needed (extension count, original terms)
- [ ] Implement validation logic
- [ ] Implement state update logic
- [ ] Update tests to expect success instead of revert
- [ ] Add integration test for multiple extensions
- [ ] Gas optimization review
- [ ] Security audit for new attack vectors

**Test Coverage**:
- ✅ 8 unit tests (currently expect revert)
- ✅ 1 integration test (currently expect revert)
- ⏳ Update tests to validate implementation

**Estimated Effort**: 3-5 days (design decisions + implementation + testing)

---

## v3.0 - Advanced Features (Conceptual)

### Potential Future Enhancements

**Multi-NFT Portfolios**:
- Dealers manage multiple vehicles
- Batch minting and operations
- Portfolio view functions

**Dynamic Pricing**:
- Time-based price adjustments
- Mileage-based pricing tiers
- Seasonal adjustments

**Insurance Integration**:
- On-chain insurance coverage tracking
- Claim handling
- Premium payments

**Maintenance Tracking**:
- Service record NFTs
- Maintenance payment handling
- Warranty tracking

**Secondary Market**:
- Transfer active leases between lessees
- Dealer approval mechanism
- Credit check integration

**Governance**:
- DAO for parameter updates
- Community-driven feature voting
- Dispute resolution

**Off-Chain Integrations**:
- Oracle for car valuation
- Credit score verification
- KYC/AML compliance

---

## Contributing to the Roadmap

This is a university project (TTM4195), but suggestions for v2.x features are welcome:

1. Open an issue with the `enhancement` label
2. Describe the use case and user story
3. Propose functional requirements
4. Consider security implications
5. Estimate complexity and dependencies

## Roadmap Updates

This roadmap is reviewed after each phase completion and updated based on:
- Test results and findings
- Security considerations
- Gas optimization discoveries
- User feedback (if deployed)
- Academic requirements (TTM4195 course)

**Last Updated**: November 2, 2025
**Current Phase**: Phase 8 (Termination & Edge Cases)
**Progress**: 118/215 tasks complete (54.9%)
