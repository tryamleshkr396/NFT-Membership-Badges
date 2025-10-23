// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title NFT Membership Badges - simple ERC721 with issuer role and revocation
contract MembershipBadges is ERC721, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    Counters.Counter private _idCounter;
    string private _baseTokenURI;
    mapping(uint256 => string) private _tokenURIs;

    event BadgeIssued(address indexed to, uint256 indexed tokenId, string tokenURI);
    event BadgeRevoked(uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_, string memory baseURI_) ERC721(name_, symbol_) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ISSUER_ROLE, msg.sender);
        _baseTokenURI = baseURI_;
    }

    /// @notice Issue a membership badge to `to`. Only accounts with ISSUER_ROLE can call.
    function issueBadge(address to, string calldata tokenURI_) external onlyRole(ISSUER_ROLE) returns (uint256) {
        _idCounter.increment();
        uint256 tokenId = _idCounter.current();
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;
        emit BadgeIssued(to, tokenId, tokenURI_);
        return tokenId;
    }

    /// @notice Revoke (burn) a badge. Only ISSUER_ROLE can revoke.
    function revokeBadge(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        require(_exists(tokenId), "MembershipBadges: nonexistent token");
        _burn(tokenId);
        emit BadgeRevoked(tokenId);
    }

    /// @notice Admin can grant ISSUER_ROLE to other accounts.
    function addIssuer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /// @notice Admin can revoke ISSUER_ROLE from an account.
    function removeIssuer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, account);
    }

    /// @notice Set base URI (used if a token-specific URI is not provided).
    function setBaseURI(string calldata baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI_;
    }

    /// @notice Override tokenURI to prefer token-specific URI, fallback to base + id.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "MembershipBadges: nonexistent token");
        string memory tUri = _tokenURIs[tokenId];
        if (bytes(tUri).length != 0) {
            return tUri;
        }
        string memory base = _baseTokenURI;
        return bytes(base).length == 0 ? "" : string(abi.encodePacked(base, _toString(tokenId)));
    }

    function _burn(uint256 tokenId) internal override {
        super._burn(tokenId);
        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }

    /// @dev simple uint -> string helper (avoids importing Strings for minimalism)
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
