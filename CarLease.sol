// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
  CarLease.sol (Hardened)
  - Adds ReentrancyGuard
  - Commit-reveal signing to prevent front-running
  - Checks-effects-interactions and input validation
  - Confirm-deadline with auto-refund if seller doesn't confirm
  - Withdraw for accidental ETH
  - Events for key actions

  NOTE: This is still a simplified educational contract (not production-ready).
*/

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CarLease is ERC721, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId = 1;

    struct CarMetadata {
        string model;
        string color;
        uint16 year;
        uint256 originalValueWei; // price in wei
        uint256 mileageLimit;
    }

    struct Lease {
        address lessee;
        uint64 startTime;       // timestamp when lease activated
        uint32 durationMonths;  // total months in the lease
        uint256 monthlyPayment; // wei per month
        uint256 deposit;        // wei locked (3 * monthlyPayment at signing)
        uint32 paymentsMade;
        uint64 lastPaymentTime; // timestamp of last payment
        bool active;
        bool exists;
        uint64 confirmDeadline; // deadline by which seller must confirm (set at reveal)
    }

    // Commit struct for commit-reveal
    struct Commit {
        bytes32 commitment;
        address committer;
        uint64 deadline; // reveal must occur before this timestamp
    }

    // tokenId -> car metadata
    mapping(uint256 => CarMetadata) public carData;
    // tokenId -> lease
    mapping(uint256 => Lease) public leases;
    // tokenId -> pending lessee (set when lease is revealed & deposit paid but before seller confirms)
    mapping(uint256 => address) public pendingLessee;
    // tokenId -> commit
    mapping(uint256 => Commit) public commits;

    // events
    event OptionMinted(uint256 indexed tokenId, string model, uint256 valueWei);
    event CommitPlaced(uint256 indexed tokenId, address indexed committer, uint64 revealDeadline);
    event LeaseSignedRevealed(uint256 indexed tokenId, address indexed lessee, uint32 durationMonths, uint256 deposit, uint64 confirmDeadline);
    event LeaseConfirmed(uint256 indexed tokenId, address indexed lessee, uint64 startTime);
    event MonthlyPaid(uint256 indexed tokenId, address indexed lessee, uint256 amount, uint64 time);
    event LeaseTerminated(uint256 indexed tokenId, address indexed by, string reason);
    event DepositClaimed(uint256 indexed tokenId, address indexed seller, uint256 amount);
    event RefundUnconfirmed(uint256 indexed tokenId, address indexed lessee, uint256 amount);
    event LeaseExtended(uint256 indexed tokenId, address indexed lessee, uint32 newDurationMonths, uint256 newMonthly);

    // configuration
    uint64 public constant REVEAL_WINDOW = 7 days; // commit valid for 7 days
    uint64 public constant CONFIRM_WINDOW = 7 days; // seller must confirm within 7 days of reveal
    uint64 public constant PAYMENT_GRACE = 45 days; // grace window before seller can claim deposit
    uint32 public constant MAX_USAGE_PERCENT = 100;
    uint32 public constant MAX_CREDIT_FACTOR = 1000;

    constructor() ERC721("CourseCarLease", "CCL") Ownable(msg.sender) {}



    
    // Seller (owner) functions
    

    /**
     * Mint a new NFT representing a car/lease option.
     * Token minted to contract address so contract can control transfers during leases.
     */
    function mintOption(
        string calldata model,
        string calldata color,
        uint16 year,
        uint256 originalValueWei,
        uint256 mileageLimit
    ) external onlyOwner returns (uint256) {
        //require(bytes(model).length > 0, "Model required");
        //require(originalValueWei > 0, "Value must be > 0");
        uint256 tokenId = _nextTokenId++;
        carData[tokenId] = CarMetadata(model, color, year, originalValueWei, mileageLimit);
        _safeMint(msg.sender, tokenId);
        emit OptionMinted(tokenId, model, originalValueWei);
        return tokenId;
    }

    /**
     * Seller confirms a pending lease; this activates the lease.
     * Must be called within confirmDeadline, otherwise lessee can refund.
     */
    function confirmLease(uint256 tokenId) external onlyOwner nonReentrant {
        Lease storage L = leases[tokenId];
        require(L.exists, "No signed lease");
        require(!L.active, "Lease already active");

        require(pendingLessee[tokenId] != address(0), "No pending lessee");
        // confirm deadline must not be passed
        require(block.timestamp <= L.confirmDeadline, "Confirm deadline passed; seller cannot confirm");

        // EFFECTS
        L.active = true;
        L.startTime = uint64(block.timestamp);
        L.lastPaymentTime = uint64(block.timestamp);
        // remove pending commit & pendingLessee is kept (lessee recorded in lease)

        // INTERACTIONS: none with funds here; NFT already in contract
        emit LeaseConfirmed(tokenId, L.lessee, L.startTime);
    }

    // -----------------------------
    // Commit-reveal signing to prevent front-running
    // -----------------------------

    /**
     * Buyer places a commitment for signing a lease.
     * Commitment = keccak256(abi.encodePacked(msg.sender, tokenId, durationMonths, usagePercent, creditScoreFactor, nonce))
     * commitDeadline = block.timestamp + REVEAL_WINDOW
     */
    function commitToSign(uint256 tokenId, bytes32 commitment) external {
        require(ownerOf(tokenId) == address(this), "Option not available");
        require(commitment != bytes32(0), "Invalid commitment");
        // ensure no existing commit or previous commit expired
        Commit storage c = commits[tokenId];
        require(c.commitment == bytes32(0) || block.timestamp > c.deadline, "Existing commit active");

        commits[tokenId] = Commit({
            commitment: commitment,
            committer: msg.sender,
            deadline: uint64(block.timestamp + REVEAL_WINDOW)
        });

        emit CommitPlaced(tokenId, msg.sender, commits[tokenId].deadline);
    }

    /**
     * Reveal the commit, create pending lease and deposit funds.
     * The reveal must match the commitment placed earlier.
     *
     * nonce is secret value used to make the commitment unpredictable.
     */
    function revealAndSign(
        uint256 tokenId,
        uint32 durationMonths,
        uint32 usagePercent,
        uint32 creditScoreFactor,
        uint256 nonce
    ) external payable nonReentrant {
        require(durationMonths > 0, "Duration must be > 0");
        require(usagePercent <= MAX_USAGE_PERCENT, "usagePercent out of range");
        require(creditScoreFactor <= MAX_CREDIT_FACTOR, "creditScoreFactor out of range");
        require(ownerOf(tokenId) == msg.sender, "Option not available");

        Commit storage c = commits[tokenId];
        require(c.commitment != bytes32(0), "No commit found");
        require(c.committer == msg.sender, "Only committer can reveal");
        require(block.timestamp <= c.deadline, "Reveal deadline passed");

        bytes32 expected = keccak256(abi.encodePacked(msg.sender, tokenId, durationMonths, usagePercent, creditScoreFactor, nonce));
        require(expected == c.commitment, "Commitment mismatch");

        // compute monthly and deposit
        uint256 monthly = computeMonthlyPayment(tokenId, durationMonths, usagePercent, creditScoreFactor);
        require(monthly > 0, "Monthly is zero for given params");
        uint256 requiredDeposit = monthly * 3;
        require(msg.value == requiredDeposit, "Deposit must equal 3 * monthly");

        // ensure token not currently leased
        require(!leases[tokenId].exists || !leases[tokenId].active, "Token already leased");

        // EFFECTS: create lease record (pending) and set confirm deadline
        uint64 confirmDeadline = uint64(block.timestamp + CONFIRM_WINDOW);
        leases[tokenId] = Lease({
            lessee: msg.sender,
            startTime: 0,
            durationMonths: durationMonths,
            monthlyPayment: monthly,
            deposit: msg.value,
            paymentsMade: 0,
            lastPaymentTime: 0,
            active: false,
            exists: true,
            confirmDeadline: confirmDeadline
        });

        pendingLessee[tokenId] = msg.sender;

        // clear commit
        delete commits[tokenId];

        emit LeaseSignedRevealed(tokenId, msg.sender, durationMonths, msg.value, confirmDeadline);
    }

    /**
     * If seller does not confirm within confirmDeadline buyer can refund deposit.
     */
    function refundUnconfirmed(uint256 tokenId) external nonReentrant {
        Lease storage L = leases[tokenId];
        require(L.exists && !L.active, "No pending unconfirmed lease");
        require(L.lessee == msg.sender, "Only lessee can request refund");
        require(block.timestamp > L.confirmDeadline, "Confirm deadline not passed yet");

        uint256 refund = L.deposit;

        // EFFECTS: clear lease & pending
        L.exists = false;
        delete pendingLessee[tokenId];

        // INTERACTIONS: refund to lessee
        (bool sent, ) = msg.sender.call{value: refund}("");
        require(sent, "Refund failed");

        emit RefundUnconfirmed(tokenId, msg.sender, refund);
    }

    // -----------------------------
    // Buyer functions (payments)
    // -----------------------------

    /**
     * Compute a monthly payment (view).
     * Input validated to avoid overflow and unreasonable values.
     */
    function computeMonthlyPayment(
        uint256 tokenId,
        uint32 durationMonths,
        uint32 usagePercent,
        uint32 creditScoreFactor
    ) public view returns (uint256) {
        require(durationMonths > 0, "Duration must be > 0");
        require(usagePercent <= MAX_USAGE_PERCENT, "usagePercent too high");
        require(creditScoreFactor <= MAX_CREDIT_FACTOR, "creditScoreFactor too high");

        CarMetadata storage m = carData[tokenId];
        require(m.originalValueWei > 0, "Token not found");

        uint256 base = m.originalValueWei / uint256(durationMonths);
        uint256 usageAdj = (base * uint256(usagePercent)) / 100;
        uint256 creditDisc = (base * uint256(creditScoreFactor)) / 1000;

        uint256 monthly = base + usageAdj;
        if (creditDisc >= monthly) {
            return 0;
        } else {
            return monthly - creditDisc;
        }
    }

    /**
     * Buyer pays the monthly amount.
     * nonReentrant + state updated before external transfer.
     */
    function payMonthly(uint256 tokenId) external payable nonReentrant {
        Lease storage L = leases[tokenId];
        require(L.exists && L.active, "Lease not active");
        require(L.lessee == msg.sender, "Only lessee can pay");
        require(msg.value == L.monthlyPayment, "Incorrect monthly payment");

        // EFFECTS
        L.paymentsMade += 1;
        L.lastPaymentTime = uint64(block.timestamp);

        // INTERACTIONS: forward payment to seller (owner)
        (bool sent, ) = owner().call{value: msg.value}("");
        require(sent, "Transfer to seller failed");

        emit MonthlyPaid(tokenId, msg.sender, msg.value, L.lastPaymentTime);
    }

    // -----------------------------
    // Default handling & termination
    // -----------------------------

    /**
     * If buyer misses a payment beyond grace window seller can claim deposit and terminate.
     * Use checks-effects-interactions and nonReentrant.
     */
    function claimDepositAndTerminate(uint256 tokenId) external onlyOwner nonReentrant {
    Lease storage L = leases[tokenId];
    require(L.exists && L.active, "Active lease required");

    uint64 dueLimit = L.lastPaymentTime + PAYMENT_GRACE;
    require(block.timestamp > dueLimit, "Payment not overdue yet");

    uint256 depositToClaim = L.deposit;

    // EFFECTS: Clear lease
    L.active = false;
    L.exists = false;
    delete pendingLessee[tokenId];

    // INTERACTIONS: Transfer deposit and NFT
    (bool sent, ) = owner().call{value: depositToClaim}("");
    require(sent, "Transfer of deposit failed");

    emit DepositClaimed(tokenId, owner(), depositToClaim);
    emit LeaseTerminated(tokenId, msg.sender, "Default - deposit claimed");

    if (ownerOf(tokenId) == address(this)) {
        _safeTransfer(address(this), owner(), tokenId, "");
    }
}
    /**
     * Buyer can terminate at natural end of lease and get deposit refunded.
     * Checks-effects-interactions + nonReentrant.
     */
    function terminateAtEnd(uint256 tokenId) external nonReentrant {
        Lease storage L = leases[tokenId];
        require(L.exists && L.active, "Active lease required");
        require(L.lessee == msg.sender, "Only lessee can terminate at end");

        uint64 leaseEnd = L.startTime + uint64(uint256(L.durationMonths) * 30 days);
        require(block.timestamp >= leaseEnd, "Lease period not yet finished");

        uint256 depositRefund = L.deposit;

        // EFFECTS: clear lease and pending
        L.active = false;
        L.exists = false;
        delete pendingLessee[tokenId];

        // INTERACTIONS: transfer NFT to seller then refund deposit to lessee
        if (ownerOf(tokenId) == address(this)) {
            _safeTransfer(address(this), owner(), tokenId, "");
        }
        (bool sent, ) = msg.sender.call{value: depositRefund}("");
        require(sent, "Refund to lessee failed");

        emit LeaseTerminated(tokenId, msg.sender, "Ended - deposit refunded");
    }

    // -----------------------------
    // Lease end / extension / new contract
    // -----------------------------

    /**
     * Extend lease: recalculates monthly and updates duration
     * NonReentrant to be safe; emits event.
     */
    function extendLease(uint256 tokenId, uint32 extraMonths, uint32 usagePercent, uint32 creditScoreFactor) external nonReentrant {
        Lease storage L = leases[tokenId];
        require(L.exists && L.active, "Active lease required");
        require(L.lessee == msg.sender, "Only lessee can extend");
        require(extraMonths > 0, "extraMonths must be > 0");
        require(usagePercent <= MAX_USAGE_PERCENT, "usagePercent out of range");
        require(creditScoreFactor <= MAX_CREDIT_FACTOR, "creditScoreFactor out of range");

        uint32 newDuration = L.durationMonths + extraMonths;
        uint256 newMonthly = computeMonthlyPayment(tokenId, newDuration, usagePercent, creditScoreFactor);
        require(newMonthly > 0, "New monthly would be zero");

        // EFFECTS
        L.durationMonths = newDuration;
        L.monthlyPayment = newMonthly;

        emit LeaseExtended(tokenId, msg.sender, newDuration, newMonthly);
    }

    // -----------------------------
    // Utilities / getters / admin
    // -----------------------------

    function getLeaseInfo(uint256 tokenId) external view returns (Lease memory) {
        return leases[tokenId];
    }

    function getCarMetadata(uint256 tokenId) external view returns (CarMetadata memory) {
        return carData[tokenId];
    }

    /**
     * Reclaim NFT to seller only if contract owns it and no active lease exists.
     */
    function reclaimNFTToSeller(uint256 tokenId) public onlyOwner nonReentrant {
        Lease storage L = leases[tokenId];
        require(!L.exists || !L.active, "Cannot reclaim while lease active");
        require(ownerOf(tokenId) == address(this), "Contract does not hold token");
        _safeTransfer(address(this), owner(), tokenId, "");
    }

    /**
     * Withdraw accidental ETH sent to this contract (not related to deposits).
     * Only owner (seller) can withdraw.
     */
    function withdrawAccidentalETH(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Amount exceeds balance");
        (bool sent, ) = owner().call{value: amount}("");
        require(sent, "Withdraw failed");
    }

    // fallback to accept ETH (but prefer explicit functions)
    receive() external payable {}
    fallback() external payable {}
}
