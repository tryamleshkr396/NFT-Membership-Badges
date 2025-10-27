# NFT Membership Badges

A decentralized membership system where membership is represented as NFTs (ERC-721). This project mints non‑fungible "membership badges" that prove access, perks, or roles. Badges can be transferred or revoked, and metadata (images, attributes) is stored on IPFS.

---

## Feature
- Membership represented as ERC-721 NFTs (unique badges)
- Per-badge metadata on IPFS (image, tier, expiry, perks)
- Controlled minting by authorized issuer(s)
- Transfer, revoke, and query membership state
- Frontend examples for wallet interaction and badge management
- Deployable to Polygon (Mumbai) for low-cost testing

---

## How it works (high level)
- Each badge is an NFT token with a tokenURI pointing to IPFS-hosted metadata.
- The contract exposes minting and revocation functions restricted to an issuer role.
- Frontend interacts via Ethers.js + MetaMask to request mints, check ownership, and display badge metadata.




