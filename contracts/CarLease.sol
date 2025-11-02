// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CarLease
 * @notice NFT-based smart contract for trustless car leasing
 * @dev Implements ERC721 for lease options, with commit-reveal pattern for front-running prevention
 */
contract CarLease is ERC721, Ownable, ReentrancyGuard {
    
    // ============================================
    // DATA STRUCTURES
    // ============================================
    
    /**
     * @notice Immutable car information for each NFT
     * @dev Stored once at mint, never modified
     */
    struct CarMetadata {
        string model;              // Car model name (e.g., "Tesla Model 3")
        string color;              // Car color (e.g., "Blue", "Red")
        uint16 year;               // Manufacturing year (e.g., 2024)
        uint256 originalValueWei;  // Car's purchase value in wei
        uint256 mileageLimit;      // Maximum allowed mileage for lease
    }
    
    /**
     * @notice Mutable lease agreement state
     * @dev Struct packing: address(20) + uint64(8) + uint32(4) = 32 bytes (slot 1)
     *                      uint256 = 32 bytes (slot 2 & 3)
     *                      uint32(4) + uint64(8) + bool(1) + bool(1) + uint64(8) = 22 bytes (slot 4)
     *      Saves ~40,000 gas per lease vs unpacked
     */
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
    
    /**
     * @notice Temporary commitment during commit-reveal pattern
     * @dev Hash binds tokenId + secret + address to prevent front-running
     */
    struct Commit {
        bytes32 commitment;        // Hash of (tokenId, secret, committerAddress)
        address committer;         // Address that placed commitment
        uint64 deadline;           // Reveal must occur before this time
    }
    
    // ============================================
    // STORAGE
    // ============================================
    
    /// @notice Maps tokenId to car metadata
    mapping(uint256 => CarMetadata) public carData;
    
    /// @notice Maps tokenId to lease state
    mapping(uint256 => Lease) public leases;
    
    /// @notice Maps tokenId to active commitment
    mapping(uint256 => Commit) public commits;
    
    /// @notice Auto-increment token ID counter
    uint256 private _nextTokenId = 1;
    
    // ============================================
    // CONSTANTS
    // ============================================
    
    /// @notice Time window for revealing commitment (7 days)
    uint64 public constant REVEAL_WINDOW = 7 days;
    
    /// @notice Time window for dealer confirmation (7 days)
    uint64 public constant CONFIRM_WINDOW = 7 days;
    
    /// @notice Grace period before deposit can be claimed (45 days)
    uint64 public constant PAYMENT_GRACE = 45 days;
    
    /// @notice Reserved for future: max usage percentage adjustment
    uint32 public constant MAX_USAGE_PERCENT = 100;
    
    /// @notice Reserved for future: credit score factor
    uint32 public constant MAX_CREDIT_FACTOR = 1000;
    
    // ============================================
    // EVENTS
    // ============================================
    
    /**
     * @notice Emitted when dealer mints a new lease option NFT
     * @param tokenId The newly minted token ID
     * @param model Car model name
     * @param color Car color
     * @param year Manufacturing year
     * @param originalValueWei Car value in wei
     */
    event OptionMinted(
        uint256 indexed tokenId,
        string model,
        string color,
        uint16 year,
        uint256 originalValueWei
    );
    
    /**
     * @notice Emitted when customer places commit-reveal commitment
     * @param tokenId NFT ID being committed to
     * @param committer Address placing commitment
     * @param commitment Hash of (tokenId, secret, committer)
     * @param deadline Reveal deadline timestamp
     */
    event CommitPlaced(
        uint256 indexed tokenId,
        address indexed committer,
        bytes32 commitment,
        uint64 deadline
    );
    
    /**
     * @notice Emitted when customer reveals commitment and pays deposit
     * @param tokenId NFT ID being leased
     * @param lessee Customer address
     * @param durationMonths Lease duration
     * @param monthlyPayment Payment amount in wei
     * @param deposit Deposit amount in wei
     * @param confirmDeadline Dealer confirmation deadline
     */
    event LeaseSignedRevealed(
        uint256 indexed tokenId,
        address indexed lessee,
        uint32 durationMonths,
        uint256 monthlyPayment,
        uint256 deposit,
        uint64 confirmDeadline
    );
    
    /**
     * @notice Emitted when dealer confirms lease activation
     * @param tokenId NFT ID being confirmed
     * @param lessee Customer address
     * @param startTime Lease activation timestamp
     */
    event LeaseConfirmed(
        uint256 indexed tokenId,
        address indexed lessee,
        uint64 startTime
    );
    
    /**
     * @notice Emitted when customer makes monthly payment
     * @param tokenId NFT ID for payment
     * @param lessee Customer address
     * @param paymentNumber Payment sequence number (1-indexed)
     * @param amount Payment amount in wei
     * @param timestamp Payment timestamp
     */
    event MonthlyPaid(
        uint256 indexed tokenId,
        address indexed lessee,
        uint32 paymentNumber,
        uint256 amount,
        uint64 timestamp
    );
    
    /**
     * @notice Emitted when lease is terminated (by lessee or dealer)
     * @param tokenId NFT ID being terminated
     * @param by Terminator address (lessee or owner)
     * @param reason Termination reason code
     */
    event LeaseTerminated(
        uint256 indexed tokenId,
        address indexed by,
        string reason
    );
    
    /**
     * @notice Emitted when dealer claims deposit after default
     * @param tokenId NFT ID with claimed deposit
     * @param seller Dealer address receiving deposit
     * @param depositAmount Deposit amount in wei
     */
    event DepositClaimed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 depositAmount
    );
    
    /**
     * @notice Emitted when lessee gets refund for unconfirmed deposit
     * @param tokenId NFT ID with refunded deposit
     * @param lessee Customer receiving refund
     * @param depositAmount Refund amount in wei
     */
    event RefundUnconfirmed(
        uint256 indexed tokenId,
        address indexed lessee,
        uint256 depositAmount
    );
    
    /**
     * @notice Emitted when lease duration is extended (future feature)
     * @param tokenId NFT ID being extended
     * @param lessee Customer address
     * @param newDurationMonths Updated total duration
     */
    event LeaseExtended(
        uint256 indexed tokenId,
        address indexed lessee,
        uint32 newDurationMonths
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Initializes CarLease contract with ERC721 metadata
     * @dev Sets up NFT name and symbol, initializes owner
     */
    constructor() 
        ERC721("CarLeaseOption", "CLO") 
        Ownable(msg.sender) 
    {
        // _nextTokenId = 1 (initialized at declaration)
    }
    
    // ============================================
    // INTERNAL HELPERS
    // ============================================
    
    /**
     * @notice Processes ETH transfer to recipient with error handling
     * @dev Follows checks-effects-interactions pattern
     * @param recipient Address to send ETH
     * @param amount Amount in wei
     */
    function _sendEther(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice Validates that token exists and is owned by contract
     * @dev Used to ensure NFT control before lease operations
     * @param tokenId Token ID to validate
     */
    function _validateContractOwnsToken(uint256 tokenId) internal view {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(ownerOf(tokenId) == address(this), "Contract must own token");
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - NFT Management
    // ============================================
    
    /**
     * @notice Dealer mints a new lease option NFT
     * @dev Only contract owner (dealer) can mint. NFT owned by contract not dealer (FR-003).
     * @param model Car model name (e.g., "Tesla Model 3")
     * @param color Car color (e.g., "Blue")
     * @param year Manufacturing year (e.g., 2024)
     * @param originalValueWei Car purchase value in wei
     * @param monthlyPaymentWei Monthly lease payment in wei
     * @param durationMonths Lease duration (e.g., 36 months)
     * @param mileageLimit Maximum allowed mileage
     * @return tokenId The newly minted token ID
     */
    function mintOption(
        string memory model,
        string memory color,
        uint16 year,
        uint256 originalValueWei,
        uint256 monthlyPaymentWei,
        uint32 durationMonths,
        uint256 mileageLimit
    ) external onlyOwner returns (uint256) {
        // FR-001: Validate metadata
        require(bytes(model).length > 0, "Model cannot be empty");
        require(originalValueWei > 0, "Original value must be greater than zero");
        require(monthlyPaymentWei > 0, "Monthly payment must be greater than zero");
        require(durationMonths > 0, "Duration must be greater than zero");
        
        uint256 tokenId = _nextTokenId++;
        
        // FR-003: Mint to contract address (not dealer)
        // Use _mint instead of _safeMint because contract doesn't need IERC721Receiver
        _mint(address(this), tokenId);
        
        // Store metadata
        carData[tokenId] = CarMetadata({
            model: model,
            color: color,
            year: year,
            originalValueWei: originalValueWei,
            mileageLimit: mileageLimit
        });
        
        // FR-039: Emit event
        emit OptionMinted(
            tokenId,
            model,
            color,
            year,
            originalValueWei
        );
        
        return tokenId;
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - Commit-Reveal Pattern
    // ============================================
    
    /**
     * @notice Customer places commitment to lease an NFT
     * @dev Commit-reveal pattern prevents front-running (FR-005, FR-006)
     * @param tokenId NFT ID to commit to
     * @param commitment Hash of keccak256(tokenId, secret, msg.sender)
     */
    function commitToLease(uint256 tokenId, bytes32 commitment) external {
        _validateContractOwnsToken(tokenId);
        require(!leases[tokenId].exists, "Already leased");
        
        // FR-007: Store commitment with 7-day deadline
        commits[tokenId] = Commit({
            commitment: commitment,
            committer: msg.sender,
            deadline: uint64(block.timestamp) + REVEAL_WINDOW
        });
        
        // FR-040: Emit event
        emit CommitPlaced(
            tokenId,
            msg.sender,
            commitment,
            commits[tokenId].deadline
        );
    }
    
    /**
     * @notice Customer reveals commitment and pays deposit to initiate lease
     * @dev Must be called within REVEAL_WINDOW of commitment (FR-008, FR-010)
     * @param tokenId NFT ID to lease
     * @param secret Random secret used in commitment
     * @param durationMonths Lease duration in months
     * @param monthlyPaymentWei Monthly payment amount in wei
     */
    function revealAndPay(
        uint256 tokenId,
        bytes32 secret,
        uint32 durationMonths,
        uint256 monthlyPaymentWei
    ) external payable nonReentrant {
        _validateContractOwnsToken(tokenId);
        
        Commit memory c = commits[tokenId];
        
        // FR-010: Check deadline
        require(block.timestamp <= c.deadline, "Commitment expired");
        
        // FR-009: Validate hash
        bytes32 computedHash = keccak256(
            abi.encodePacked(tokenId, secret, msg.sender)
        );
        require(computedHash == c.commitment, "Invalid secret");
        
        // FR-011: Check not already leased
        require(!leases[tokenId].exists, "Already leased");
        
        // FR-012, FR-013: Validate deposit = 3x monthly payment
        uint256 requiredDeposit = monthlyPaymentWei * 3;
        require(msg.value == requiredDeposit, "Incorrect deposit");
        
        // Create lease in pending state
        uint64 confirmDeadline = uint64(block.timestamp) + CONFIRM_WINDOW;
        
        leases[tokenId] = Lease({
            lessee: msg.sender,
            startTime: 0,  // Not started yet (pending confirmation)
            durationMonths: durationMonths,
            monthlyPayment: monthlyPaymentWei,
            deposit: msg.value,
            paymentsMade: 0,
            lastPaymentTime: 0,
            active: false,  // Pending confirmation
            exists: true,
            confirmDeadline: confirmDeadline
        });
        
        // Clear commitment
        delete commits[tokenId];
        
        // FR-041: Emit event
        emit LeaseSignedRevealed(
            tokenId,
            msg.sender,
            durationMonths,
            monthlyPaymentWei,
            msg.value,
            confirmDeadline
        );
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - Lease Confirmation
    // ============================================
    
    /**
     * @notice Dealer confirms lease activation
     * @dev Only owner can confirm. Activates lease and sets start timestamp (FR-019, FR-020)
     * @param tokenId NFT ID to confirm
     */
    function confirmLease(uint256 tokenId) external onlyOwner {
        Lease storage lease = leases[tokenId];
        
        // FR-020: Validate lease exists
        require(lease.exists, "Lease does not exist");
        
        // FR-022: Check not already confirmed
        require(!lease.active, "Already confirmed");
        
        // Activate lease
        lease.active = true;
        lease.startTime = uint64(block.timestamp);
        
        // FR-042: Emit event
        emit LeaseConfirmed(
            tokenId,
            lease.lessee,
            lease.startTime
        );
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - Monthly Payments
    // ============================================
    
    /**
     * @notice Customer makes monthly lease payment
     * @dev Payment must equal monthlyPayment amount. Updates counters and timestamp (FR-013, FR-014, FR-015)
     * @param tokenId NFT ID for payment
     */
    function makeMonthlyPayment(uint256 tokenId) external payable nonReentrant {
        Lease storage lease = leases[tokenId];
        
        // FR-017: Validate active lease
        require(lease.exists, "Lease does not exist");
        require(lease.active, "Lease not active");
        
        // FR-016: Only lessee can pay
        require(msg.sender == lease.lessee, "Only lessee can pay");
        
        // FR-013: Validate payment amount
        require(msg.value == lease.monthlyPayment, "Incorrect payment amount");
        
        // FR-015: Check payment is due (must wait ~30 days between payments)
        uint256 timeSinceStart = block.timestamp - lease.startTime;
        uint256 expectedPayments = timeSinceStart / 30 days;
        require(lease.paymentsMade < expectedPayments, "Payment not due");
        
        // FR-014: Update payment tracking
        lease.paymentsMade++;
        lease.lastPaymentTime = uint64(block.timestamp);
        
        // FR-043: Emit event
        emit MonthlyPaid(
            tokenId,
            lease.lessee,
            lease.paymentsMade,
            msg.value,
            uint64(block.timestamp)
        );
    }
    
    /**
     * @notice Terminates lease (by owner or lessee)
     * @dev Used for non-payment termination or early termination
     * @param tokenId NFT ID to terminate
     */
    function terminateLease(uint256 tokenId) external {
        Lease storage lease = leases[tokenId];
        
        require(lease.exists, "Lease does not exist");
        require(lease.active, "Lease not active");
        require(msg.sender == owner() || msg.sender == lease.lessee, "Unauthorized");
        
        // Deactivate lease
        lease.active = false;
        
        emit LeaseTerminated(tokenId, msg.sender, "Terminated");
    }
    
    // ============================================
    // PUBLIC FUNCTIONS - Deposit Management
    // ============================================
    
    /**
     * @notice Customer reclaims deposit when dealer fails to confirm
     * @dev Can only be called after confirmation deadline passes and before dealer confirms (FR-021, FR-023)
     * @param tokenId NFT ID to refund
     */
    function refundUnconfirmedDeposit(uint256 tokenId) external nonReentrant {
        Lease storage lease = leases[tokenId];
        
        // FR-023: Validate lease exists but not confirmed
        require(lease.exists, "Lease does not exist");
        require(!lease.active, "Lease already confirmed");
        
        // FR-021: Check confirmation deadline has passed
        require(block.timestamp > lease.confirmDeadline, "Confirmation deadline not passed");
        
        // Only lessee can claim refund
        require(msg.sender == lease.lessee, "Only lessee can claim refund");
        
        // FR-026: Store deposit amount before clearing
        uint256 refundAmount = lease.deposit;
        require(refundAmount > 0, "No deposit to refund");
        
        // FR-027: Clear lease state (mark as cancelled)
        delete leases[tokenId];
        
        // FR-046: Emit event
        emit RefundUnconfirmed(tokenId, msg.sender, refundAmount);
        
        // Transfer refund (checks-effects-interactions pattern)
        _sendEther(msg.sender, refundAmount);
    }
    
    /**
     * @notice Dealer claims deposit after customer payment default
     * @dev Can only be called after 45-day grace period expires (FR-024, FR-025, FR-027, FR-030)
     * @param tokenId NFT ID to claim deposit from
     */
    function claimDeposit(uint256 tokenId) external onlyOwner nonReentrant {
        Lease storage lease = leases[tokenId];
        
        // Validate lease exists and is active
        require(lease.exists, "Lease does not exist");
        require(lease.active, "Lease not active");
        
        // FR-024: Check 45-day grace period has passed since last payment
        require(
            block.timestamp > lease.lastPaymentTime + PAYMENT_GRACE,
            "Payment grace period not expired"
        );
        
        // FR-025: Customer must not be current on payments
        // (implicitly satisfied if grace period expired, but double-check)
        uint256 timeSinceStart = block.timestamp - lease.startTime;
        uint256 expectedPayments = timeSinceStart / 30 days;
        require(lease.paymentsMade < expectedPayments, "Payments are current");
        
        // FR-027: Store deposit amount before clearing
        uint256 claimAmount = lease.deposit;
        require(claimAmount > 0, "No deposit to claim");
        
        // FR-030: Mark lease as terminated
        lease.active = false;
        lease.deposit = 0;
        
        // FR-045: Emit event
        emit DepositClaimed(tokenId, owner(), claimAmount);
        
        // Transfer deposit to dealer (checks-effects-interactions pattern)
        _sendEther(owner(), claimAmount);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Gets car metadata for an NFT
     * @param tokenId NFT ID to query
     * @return CarMetadata struct with car details
     */
    function getCarMetadata(uint256 tokenId) external view returns (CarMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return carData[tokenId];
    }
    
    /**
     * @notice Gets lease information for an NFT
     * @param tokenId NFT ID to query
     * @return Lease struct with lease details
     */
    function getLease(uint256 tokenId) external view returns (Lease memory) {
        return leases[tokenId];
    }
    
    /**
     * @notice Gets commitment information for an NFT
     * @param tokenId NFT ID to query
     * @return Commit struct with commitment details
     */
    function getCommit(uint256 tokenId) external view returns (Commit memory) {
        return commits[tokenId];
    }
    
    /**
     * @notice Checks if lessee's payments are current
     * @param tokenId NFT ID to check
     * @return True if payments are up to date within grace period
     */
    function isPaymentCurrent(uint256 tokenId) external view returns (bool) {
        Lease memory lease = leases[tokenId];
        
        if (!lease.active) return false;
        
        uint256 timeSinceStart = block.timestamp - lease.startTime;
        uint256 expectedPayments = timeSinceStart / 30 days;
        
        // Allow grace period for payment
        if (lease.paymentsMade >= expectedPayments) return true;
        if (block.timestamp <= lease.lastPaymentTime + PAYMENT_GRACE) return true;
        
        return false;
    }
    
    /**
     * @notice Checks if a commitment is still valid (not expired)
     * @param tokenId NFT ID to check
     * @return True if commitment exists and not expired
     */
    function isCommitmentValid(uint256 tokenId) external view returns (bool) {
        Commit memory c = commits[tokenId];
        return c.deadline > 0 && block.timestamp <= c.deadline;
    }
}
