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
    // PLACEHOLDER FUNCTIONS (To be implemented)
    // ============================================
    
    // NFT Management - Phase 3 (US1)
    // function mintOption(...) external onlyOwner returns (uint256) {}
    
    // Commit-Reveal - Phase 3 (US1)
    // function commitToLease(uint256 tokenId, bytes32 commitment) external {}
    // function revealAndPay(...) external payable nonReentrant {}
    
    // Confirmation - Phase 3 (US1)
    // function confirmLease(uint256 tokenId) external onlyOwner {}
    
    // Payments - Phase 3 (US1)
    // function makeMonthlyPayment(uint256 tokenId) external payable nonReentrant {}
    
    // Deposit Management - Phase 5 (US2), Phase 6 (US3)
    // function refundUnconfirmedDeposit(uint256 tokenId) external nonReentrant {}
    // function claimDeposit(uint256 tokenId) external onlyOwner nonReentrant {}
    
    // Termination - Phase 8
    // function terminateLease(uint256 tokenId, string memory reason) external nonReentrant {}
    
    // Extension - Phase 7 (US4) - Reserved for v2.x
    // function extendLease(uint256 tokenId, uint32 additionalMonths) external payable {}
    
    // View Functions - Phase 9
    // function getCarMetadata(uint256 tokenId) external view returns (CarMetadata memory) {}
    // function getLease(uint256 tokenId) external view returns (Lease memory) {}
    // function getCommit(uint256 tokenId) external view returns (Commit memory) {}
    // function isPaymentCurrent(uint256 tokenId) external view returns (bool) {}
    // function isCommitmentValid(uint256 tokenId) external view returns (bool) {}
}
