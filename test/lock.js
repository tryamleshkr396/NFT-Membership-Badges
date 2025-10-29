const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MembershipBadges", function () {
  let membershipBadges;
  let owner, issuer, user1, user2, user3;
  const NAME = "NFT Membership Badges";
  const SYMBOL = "BADGE";
  const BASE_URI = "https://api.membership.example.com/metadata/";

  // Membership tiers
  const BRONZE = 0;
  const SILVER = 1;
  const GOLD = 2;
  const PLATINUM = 3;
  const DIAMOND = 4;

  beforeEach(async function () {
    [owner, issuer, user1, user2, user3] = await ethers.getSigners();

    const MembershipBadges = await ethers.getContractFactory("MembershipBadges");
    membershipBadges = await MembershipBadges.deploy(NAME, SYMBOL, BASE_URI);
    await membershipBadges.deployed();

    // Grant issuer role to issuer account
    const ISSUER_ROLE = await membershipBadges.ISSUER_ROLE();
    await membershipBadges.grantRole(ISSUER_ROLE, issuer.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await membershipBadges.name()).to.equal(NAME);
      expect(await membershipBadges.symbol()).to.equal(SYMBOL);
    });

    it("Should set the owner as admin and issuer", async function () {
      const DEFAULT_ADMIN_ROLE = await membershipBadges.DEFAULT_ADMIN_ROLE();
      const ISSUER_ROLE = await membershipBadges.ISSUER_ROLE();
      
      expect(await membershipBadges.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await membershipBadges.hasRole(ISSUER_ROLE, owner.address)).to.be.true;
    });

    it("Should set default tier validity periods", async function () {
      expect(await membershipBadges.tierValidityPeriod(BRONZE)).to.equal(30 * 24 * 60 * 60); // 30 days
      expect(await membershipBadges.tierValidityPeriod(SILVER)).to.equal(90 * 24 * 60 * 60); // 90 days
      expect(await membershipBadges.tierValidityPeriod(GOLD)).to.equal(180 * 24 * 60 * 60); // 180 days
      expect(await membershipBadges.tierValidityPeriod(PLATINUM)).to.equal(365 * 24 * 60 * 60); // 365 days
      expect(await membershipBadges.tierValidityPeriod(DIAMOND)).to.equal(730 * 24 * 60 * 60); // 730 days
    });
  });

  describe("Badge Issuance", function () {
    it("Should allow issuer to mint a badge", async function () {
      const tokenURI = "ipfs://QmYourTokenURI/bronze/1";
      
      await expect(
        membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, tokenURI)
      ).to.emit(membershipBadges, "BadgeIssued");

      expect(await membershipBadges.balanceOf(user1.address)).to.equal(1);
      expect(await membershipBadges.ownerOf(1)).to.equal(user1.address);
      expect(await membershipBadges.tokenURI(1)).to.equal(tokenURI);
    });

    it("Should not allow non-issuer to mint a badge", async function () {
      await expect(
        membershipBadges.connect(user1).issueBadge(user2.address, BRONZE, 0, "")
      ).to.be.reverted;
    });

    it("Should set correct membership info when issuing badge", async function () {
      const tokenURI = "ipfs://QmYourTokenURI/silver/1";
      const tx = await membershipBadges.connect(issuer).issueBadge(user1.address, SILVER, 0, tokenURI);
      const receipt = await tx.wait();
      const currentTime = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
      
      const membershipInfo = await membershipBadges.getMembershipInfo(1);
      expect(membershipInfo.tier).to.equal(SILVER);
      expect(membershipInfo.issuedAt).to.equal(currentTime);
      expect(membershipInfo.expiresAt).to.equal(currentTime + 90 * 24 * 60 * 60); // 90 days for silver
      expect(membershipInfo.isActive).to.be.true;
      expect(membershipInfo.issuer).to.equal(issuer.address);
    });

    it("Should use custom expiry when provided", async function () {
      const customExpiry = (await time.latest()) + 60 * 24 * 60 * 60; // 60 days
      
      await membershipBadges.connect(issuer).issueBadge(user1.address, GOLD, customExpiry, "");
      
      const membershipInfo = await membershipBadges.getMembershipInfo(1);
      expect(membershipInfo.expiresAt).to.equal(customExpiry);
    });

    it("Should revert with past expiry date", async function () {
      const pastExpiry = (await time.latest()) - 60 * 60; // 1 hour ago
      
      await expect(
        membershipBadges.connect(issuer).issueBadge(user1.address, GOLD, pastExpiry, "")
      ).to.be.revertedWith("MembershipBadges: expiry must be in future");
    });

    it("Should revert when issuing to zero address", async function () {
      await expect(
        membershipBadges.connect(issuer).issueBadge(ethers.constants.AddressZero, BRONZE, 0, "")
      ).to.be.revertedWith("MembershipBadges: cannot issue to zero address");
    });
  });

  describe("Active Membership Management", function () {
    it("Should track active membership correctly", async function () {
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "");
      
      const activeMembership = await membershipBadges.getActiveMembership(user1.address);
      expect(activeMembership.tokenId).to.equal(1);
      expect(activeMembership.tier).to.equal(BRONZE);
      expect(activeMembership.isValid).to.be.true;
    });

    it("Should revoke old membership when issuing new one", async function () {
      // Issue bronze badge
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "bronze");
      expect(await membershipBadges.balanceOf(user1.address)).to.equal(1);
      
      // Issue silver badge (should revoke bronze)
      await membershipBadges.connect(issuer).issueBadge(user1.address, SILVER, 0, "silver");
      expect(await membershipBadges.balanceOf(user1.address)).to.equal(1);
      
      // Bronze badge should be burned
      await expect(membershipBadges.ownerOf(1)).to.be.reverted;
      
      // Silver badge should be active
      const activeMembership = await membershipBadges.getActiveMembership(user1.address);
      expect(activeMembership.tokenId).to.equal(2);
      expect(activeMembership.tier).to.equal(SILVER);
    });

    it("Should check if user has valid membership", async function () {
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.false;
      
      await membershipBadges.connect(issuer).issueBadge(user1.address, GOLD, 0, "");
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.true;
    });
  });

  describe("Badge Revocation", function () {
    beforeEach(async function () {
      await membershipBadges.connect(issuer).issueBadge(user1.address, SILVER, 0, "");
    });

    it("Should allow issuer to revoke badge", async function () {
      await expect(
        membershipBadges.connect(issuer).revokeBadge(1)
      ).to.emit(membershipBadges, "BadgeRevoked");

      await expect(membershipBadges.ownerOf(1)).to.be.reverted;
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.false;
    });

    it("Should not allow non-issuer to revoke badge", async function () {
      await expect(
        membershipBadges.connect(user2).revokeBadge(1)
      ).to.be.reverted;
    });

    it("Should revert when trying to revoke non-existent badge", async function () {
      await expect(
        membershipBadges.connect(issuer).revokeBadge(999)
      ).to.be.revertedWith("MembershipBadges: nonexistent token");
    });
  });

  describe("Badge Expiry", function () {
    it("Should mark badge as expired when time passes", async function () {
      const shortExpiry = (await time.latest()) + 60; // 1 minute
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, shortExpiry, "");
      
      // Initially valid
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.true;
      
      // Fast forward time
      await time.increaseTo(shortExpiry + 1);
      
      // Should be expired
      const membershipInfo = await membershipBadges.getMembershipInfo(1);
      expect(membershipInfo.isExpired).to.be.true;
      
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.false;
    });

    it("Should allow checking and expiring badge manually", async function () {
      const shortExpiry = (await time.latest()) + 60;
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, shortExpiry, "");
      
      await time.increaseTo(shortExpiry + 1);
      
      await expect(
        membershipBadges.checkAndExpireBadge(1)
      ).to.emit(membershipBadges, "BadgeExpired");
      
      const membershipInfo = await membershipBadges.getMembershipInfo(1);
      expect(membershipInfo.isActive).to.be.false;
    });
  });

  describe("Token Transfers", function () {
    beforeEach(async function () {
      await membershipBadges.connect(issuer).issueBadge(user1.address, GOLD, 0, "");
    });

    it("Should update active membership on transfer", async function () {
      // Transfer from user1 to user2
      await membershipBadges.connect(user1).transferFrom(user1.address, user2.address, 1);
      
      // user1 should have no active membership
      expect(await membershipBadges.hasValidMembership(user1.address)).to.be.false;
      
      // user2 should have the active membership
      const activeMembership = await membershipBadges.getActiveMembership(user2.address);
      expect(activeMembership.tokenId).to.equal(1);
      expect(activeMembership.isValid).to.be.true;
    });

    it("Should revoke existing membership when receiving transfer", async function () {
      // Give user2 a membership first
      await membershipBadges.connect(issuer).issueBadge(user2.address, BRONZE, 0, "");
      
      // Transfer gold badge from user1 to user2 (should revoke bronze)
      await membershipBadges.connect(user1).transferFrom(user1.address, user2.address, 1);
      
      // user2 should only have the gold badge
      expect(await membershipBadges.balanceOf(user2.address)).to.equal(1);
      const activeMembership = await membershipBadges.getActiveMembership(user2.address);
      expect(activeMembership.tier).to.equal(GOLD);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to add/remove issuers", async function () {
      const ISSUER_ROLE = await membershipBadges.ISSUER_ROLE();
      
      await membershipBadges.addIssuer(user1.address);
      expect(await membershipBadges.hasRole(ISSUER_ROLE, user1.address)).to.be.true;
      
      await membershipBadges.removeIssuer(user1.address);
      expect(await membershipBadges.hasRole(ISSUER_ROLE, user1.address)).to.be.false;
    });

    it("Should allow admin to update tier validity periods", async function () {
      const newValidityPeriod = 45 * 24 * 60 * 60; // 45 days
      
      await expect(
        membershipBadges.setTierValidityPeriod(BRONZE, newValidityPeriod)
      ).to.emit(membershipBadges, "TierValidityUpdated");
      
      expect(await membershipBadges.tierValidityPeriod(BRONZE)).to.equal(newValidityPeriod);
    });

    it("Should allow admin to update base URI", async function () {
      const newBaseURI = "https://new-api.example.com/metadata/";
      await membershipBadges.setBaseURI(newBaseURI);
      
      // Issue a badge and check if it uses the new base URI
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "");
      
      // If no specific token URI is set, it should use base URI + token ID
      const expectedURI = newBaseURI + "1";
      await membershipBadges.connect(issuer).issueBadge(user2.address, BRONZE, 0, "");
      
      // The token should use the token-specific URI if provided, otherwise base + id
    });

    it("Should allow pausing and unpausing", async function () {
      const PAUSER_ROLE = await membershipBadges.PAUSER_ROLE();
      
      await membershipBadges.pause();
      expect(await membershipBadges.paused()).to.be.true;
      
      // Should not allow minting when paused
      await expect(
        membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "")
      ).to.be.reverted;
      
      await membershipBadges.unpause();
      expect(await membershipBadges.paused()).to.be.false;
      
      // Should allow minting when unpaused
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "");
      expect(await membershipBadges.balanceOf(user1.address)).to.equal(1);
    });
  });

  describe("Utility Functions", function () {
    it("Should return correct tier names", async function () {
      expect(await membershipBadges.getTierName(BRONZE)).to.equal("Bronze");
      expect(await membershipBadges.getTierName(SILVER)).to.equal("Silver");
      expect(await membershipBadges.getTierName(GOLD)).to.equal("Gold");
      expect(await membershipBadges.getTierName(PLATINUM)).to.equal("Platinum");
      expect(await membershipBadges.getTierName(DIAMOND)).to.equal("Diamond");
    });

    it("Should return correct total supply", async function () {
      expect(await membershipBadges.totalSupply()).to.equal(0);
      
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "");
      expect(await membershipBadges.totalSupply()).to.equal(1);
      
      await membershipBadges.connect(issuer).issueBadge(user2.address, SILVER, 0, "");
      expect(await membershipBadges.totalSupply()).to.equal(2);
    });

    it("Should support correct interfaces", async function () {
      // ERC721
      expect(await membershipBadges.supportsInterface("0x80ac58cd")).to.be.true;
      // ERC721Metadata
      expect(await membershipBadges.supportsInterface("0x5b5e139f")).to.be.true;
      // AccessControl
      expect(await membershipBadges.supportsInterface("0x7965db0b")).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple rapid badge issuances correctly", async function () {
      // Issue multiple badges rapidly
      await membershipBadges.connect(issuer).issueBadge(user1.address, BRONZE, 0, "1");
      await membershipBadges.connect(issuer).issueBadge(user1.address, SILVER, 0, "2");
      await membershipBadges.connect(issuer).issueBadge(user1.address, GOLD, 0, "3");
      
      // Should only have the latest badge
      expect(await membershipBadges.balanceOf(user1.address)).to.equal(1);
      const activeMembership = await membershipBadges.getActiveMembership(user1.address);
      expect(activeMembership.tier).to.equal(GOLD);
    });

    it("Should handle zero active membership correctly", async function () {
      const activeMembership = await membershipBadges.getActiveMembership(user1.address);
      expect(activeMembership.tokenId).to.equal(0);
      expect(activeMembership.isValid).to.be.false;
    });
  });
});
