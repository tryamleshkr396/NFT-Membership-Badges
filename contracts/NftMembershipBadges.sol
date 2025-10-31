// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NftMembershipBadges is ERC721URIStorage, Ownable {
    uint256 public nextBadgeId;

    struct Badge {
        string tier;
        uint256 issuedAt;
    }

    mapping(uint256 => Badge) public badgeDetails;

    event BadgeMinted(address indexed to, uint256 badgeId, string tier);
    event BadgeRevoked(uint256 badgeId);

    constructor() ERC721("NFT Membership Badge", "NMB") Ownable(msg.sender) {}

    function mintBadge(address to, string memory tier, string memory tokenURI) external onlyOwner {
        uint256 badgeId = nextBadgeId++;
        _safeMint(to, badgeId);
        _setTokenURI(badgeId, tokenURI);
        badgeDetails[badgeId] = Badge(tier, block.timestamp);
        emit BadgeMinted(to, badgeId, tier);
    }

    function revokeBadge(uint256 badgeId) external onlyOwner {
        require(_ownerOf(badgeId) != address(0), "Badge does not exist");
        _burn(badgeId);
        delete badgeDetails[badgeId];
        emit BadgeRevoked(badgeId);
    }

    function getBadge(uint256 badgeId) external view returns (Badge memory) {
        require(_ownerOf(badgeId) != address(0), "Badge not found");
        return badgeDetails[badgeId];
    }
}
