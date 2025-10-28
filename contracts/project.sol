// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title NFT Membership Badges - Enhanced ERC721 with membership tiers and expiry
/// @notice This contract manages membership badges with different tiers and expiration dates
contract MembershipBadges is ERC721, ERC721URIStorage, AccessControl, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Membership tiers
    enum MembershipTier { 
        BRONZE,   // 0
        SILVER,   // 1
        GOLD,     // 2
        PLATINUM, // 3
        DIAMOND   // 4
    }

    struct MembershipInfo {
        MembershipTier tier;
        uint256 issuedAt;
        uint256 expiresAt;
        bool isActive;
        address issuer;
    }

    Counters.Counter private _tokenIdCounter;
    string private _baseTokenURI;
    
    // Mapping from token ID to membership information
    mapping(uint256 => MembershipInfo) private _membershipInfo;
    
    // Mapping from address to their active membership token ID (0 if none)
    mapping(address => uint256) private _activeMembership;
    
    // Mapping from tier to maximum validity period (in seconds)
    mapping(MembershipTier => uint256) public tierValidityPeriod;

    event BadgeIssued(
        address indexed to, 
        uint256 indexed tokenId, 
        MembershipTier tier,
        uint256 expiresAt,
        string tokenURI
    );
    event BadgeRevoked(uint256 indexed tokenId, address indexed revokedBy);
    event BadgeExpired(uint256 indexed tokenId);
    event TierValidityUpdated(MembershipTier tier, uint256 validityPeriod);

    constructor(
        string memory name_, 
        string memory symbol_, 
        string memory baseURI_
    ) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _baseTokenURI = baseURI_;
        
        // Set default validity periods for each tier (in seconds)
        tierValidityPeriod[MembershipTier.BRONZE] = 30 days;
        tierValidityPeriod[MembershipTier.SILVER] = 90 days;
        tierValidityPeriod[MembershipTier.GOLD] = 180 days;
        tierValidityPeriod[MembershipTier.PLATINUM] = 365 days;
        tierValidityPeriod[MembershipTier.DIAMOND] = 730 days; // 2 years
    }

    /// @notice Issue a membership badge with specified tier
    /// @param to Address to receive the badge
    /// @param tier Membership tier
    /// @param customExpiry Custom expiry timestamp (0 for default tier validity)
    /// @param tokenURI_ Custom token URI for metadata
    function issueBadge(
        address to,
        MembershipTier tier,
        uint256 customExpiry,
        string calldata tokenURI_
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        require(to != address(0), "MembershipBadges: cannot issue to zero address");
        
        // Revoke existing active membership if any
        uint256 existingTokenId = _activeMembership[to];
        if (existingTokenId != 0 && _membershipInfo[existingTokenId].isActive) {
            _revokeBadgeInternal(existingTokenId);
        }
        
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        uint256 expiresAt;
        if (customExpiry > 0) {
            require(customExpiry > block.timestamp, "MembershipBadges: expiry must be in future");
            expiresAt = customExpiry;
        } else {
            expiresAt = block.timestamp + tierValidityPeriod[tier];
        }
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        
        _membershipInfo[tokenId] = MembershipInfo({
            tier: tier,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            issuer: msg.sender
        });
        
        _activeMembership[to] = tokenId;
        
        emit BadgeIssued(to, tokenId, tier, expiresAt, tokenURI_);
        return tokenId;
    }

    /// @notice Revoke (burn) a badge
    function revokeBadge(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        _revokeBadgeInternal(tokenId);
    }

    /// @notice Internal function to revoke a badge
    function _revokeBadgeInternal(uint256 tokenId) internal {
        require(_exists(tokenId), "MembershipBadges: nonexistent token");
        
        address owner = ownerOf(tokenId);
        _membershipInfo[tokenId].isActive = false;
        
        if (_activeMembership[owner] == tokenId) {
            _activeMembership[owner] = 0;
        }
        
        _burn(tokenId);
        emit BadgeRevoked(tokenId, msg.sender);
    }

    /// @notice Check if a token has expired and mark it if so
    function checkAndExpireBadge(uint256 tokenId) external {
        require(_exists(tokenId), "MembershipBadges: nonexistent token");
        
        MembershipInfo storage info = _membershipInfo[tokenId];
        if (info.isActive && block.timestamp >= info.expiresAt) {
            info.isActive = false;
            address owner = ownerOf(tokenId);
            if (_activeMembership[owner] == tokenId) {
                _activeMembership[owner] = 0;
            }
            emit BadgeExpired(tokenId);
        }
    }

    /// @notice Get membership information for a token
    function getMembershipInfo(uint256 tokenId) external view returns (
        MembershipTier tier,
        uint256 issuedAt,
        uint256 expiresAt,
        bool isActive,
        address issuer,
        bool isExpired
    ) {
        require(_exists(tokenId), "MembershipBadges: nonexistent token");
        
        MembershipInfo memory info = _membershipInfo[tokenId];
        bool expired = block.timestamp >= info.expiresAt;
        
        return (
            info.tier,
            info.issuedAt,
            info.expiresAt,
            info.isActive && !expired,
            info.issuer,
            expired
        );
    }

    /// @notice Get active membership for an address
    function getActiveMembership(address member) external view returns (
        uint256 tokenId,
        MembershipTier tier,
        uint256 expiresAt,
        bool isValid
    ) {
        tokenId = _activeMembership[member];
        if (tokenId == 0) {
            return (0, MembershipTier.BRONZE, 0, false);
        }
        
        MembershipInfo memory info = _membershipInfo[tokenId];
        bool isValid_ = info.isActive && block.timestamp < info.expiresAt;
        
        return (tokenId, info.tier, info.expiresAt, isValid_);
    }

    /// @notice Check if an address has valid membership
    function hasValidMembership(address member) external view returns (bool) {
        uint256 tokenId = _activeMembership[member];
        if (tokenId == 0) return false;
        
        MembershipInfo memory info = _membershipInfo[tokenId];
        return info.isActive && block.timestamp < info.expiresAt;
    }

    /// @notice Update tier validity period (admin only)
    function setTierValidityPeriod(MembershipTier tier, uint256 validityPeriod) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(validityPeriod > 0, "MembershipBadges: validity period must be positive");
        tierValidityPeriod[tier] = validityPeriod;
        emit TierValidityUpdated(tier, validityPeriod);
    }

    /// @notice Admin can grant ISSUER_ROLE to other accounts
    function addIssuer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /// @notice Admin can revoke ISSUER_ROLE from an account
    function removeIssuer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, account);
    }

    /// @notice Set base URI (used if a token-specific URI is not provided)
    function setBaseURI(string calldata baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI_;
    }

    /// @notice Pause contract operations
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause contract operations
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Get total number of badges issued
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @notice Override _beforeTokenTransfer to handle pausing and membership updates
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Update active membership tracking on transfer
        if (from != address(0) && to != address(0)) {
            // Transfer from one user to another
            if (_activeMembership[from] == tokenId) {
                _activeMembership[from] = 0;
            }
            if (_activeMembership[to] != 0) {
                // Revoke existing membership of recipient
                _revokeBadgeInternal(_activeMembership[to]);
            }
            _activeMembership[to] = tokenId;
        }
    }

    /// @notice Override _burn to clean up membership info
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _membershipInfo[tokenId];
    }

    /// @notice Override tokenURI to use ERC721URIStorage
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    /// @notice Override _baseURI to return the base URI
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Override supportsInterface for multiple inheritance
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC721, ERC721URIStorage, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Get tier name as string
    function getTierName(MembershipTier tier) external pure returns (string memory) {
        if (tier == MembershipTier.BRONZE) return "Bronze";
        if (tier == MembershipTier.SILVER) return "Silver";
        if (tier == MembershipTier.GOLD) return "Gold";
        if (tier == MembershipTier.PLATINUM) return "Platinum";
        if (tier == MembershipTier.DIAMOND) return "Diamond";
        return "Unknown";
    }
}
