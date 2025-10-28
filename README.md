# NFT Membership Badges

A decentralized membership system where membership is represented as NFTs (ERC-721) with different tiers and expiration dates. This project creates non‑fungible "membership badges" that prove access, perks, or roles with advanced features like automatic tier management, expiry tracking, and role-based access control.

## 🌟 Features

- **Tiered Membership System**: 5 different membership tiers (Bronze, Silver, Gold, Platinum, Diamond)
- **Expiry Management**: Automatic membership expiration with customizable validity periods
- **Role-Based Access Control**: Secure issuer and admin roles using OpenZeppelin's AccessControl
- **Single Active Membership**: Users can only have one active membership at a time (upgrading revokes previous)
- **Transfer Support**: Membership badges can be transferred between users
- **Pausable Operations**: Contract can be paused for emergency situations
- **Comprehensive Events**: Full event logging for tracking membership lifecycle
- **Gas Optimized**: Efficient contract design with minimal gas usage
- **IPFS Integration Ready**: Support for IPFS metadata storage

## 🏗️ Architecture

### Smart Contract Components

- **MembershipBadges.sol**: Main ERC721 contract with membership logic
- **Membership Tiers**: Enum-based tier system with configurable validity periods
- **Access Control**: Three roles - Admin, Issuer, and Pauser
- **Metadata Support**: ERC721URIStorage for flexible metadata management

### Membership Tiers

| Tier | Default Validity | Description |
|------|------------------|-------------|
| Bronze | 30 days | Basic membership |
| Silver | 90 days | Standard membership |
| Gold | 180 days | Premium membership |
| Platinum | 365 days | VIP membership |
| Diamond | 730 days | Elite membership |

## 🚀 Getting Started

### Prerequisites

- Node.js v16+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NFT-Membership-Badges
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

Edit `.env` file with your settings:

```bash
# Required
PRIVATE_KEY=your_private_key_here

# Optional Contract Configuration
MEMBERSHIP_NAME=NFT Membership Badges
MEMBERSHIP_SYMBOL=BADGE
BASE_URI=https://api.membership.example.com/metadata/

# Network Configuration
POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 🔧 Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with gas reporting
REPORT_GAS=true npm test
```

### Local Development

1. Start local Hardhat network:
```bash
npm run node
```

2. Deploy to local network:
```bash
npm run deploy:localhost
```

## 📦 Deployment

### Deploy to Testnet

1. Configure your `.env` file with testnet settings
2. Fund your deployer account with testnet tokens
3. Deploy:

```bash
# Deploy to Core Testnet
npm run deploy

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network polygonMumbai

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

### Verify Contract

After deployment, verify on block explorer:

```bash
npx hardhat verify --network <network> <contract-address> "NFT Membership Badges" "BADGE" "https://api.membership.example.com/metadata/"
```

## 🎯 Usage

### Contract Interaction

#### Issuing Badges

```javascript
// Issue a Silver badge with default expiry
await membershipBadges.issueBadge(
  userAddress,          // recipient
  1,                    // SILVER tier (0=Bronze, 1=Silver, 2=Gold, 3=Platinum, 4=Diamond)
  0,                    // custom expiry (0 = use default)
  "ipfs://token-uri"    // metadata URI
);

// Issue a Gold badge with custom expiry
const customExpiry = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 120); // 120 days
await membershipBadges.issueBadge(userAddress, 2, customExpiry, "ipfs://token-uri");
```

#### Checking Membership

```javascript
// Check if user has valid membership
const hasValidMembership = await membershipBadges.hasValidMembership(userAddress);

// Get active membership details
const membership = await membershipBadges.getActiveMembership(userAddress);
console.log({
  tokenId: membership.tokenId.toString(),
  tier: membership.tier, // 0=Bronze, 1=Silver, etc.
  expiresAt: new Date(membership.expiresAt.toNumber() * 1000),
  isValid: membership.isValid
});

// Get full membership info for a token
const info = await membershipBadges.getMembershipInfo(tokenId);
```

#### Admin Functions

```javascript
// Add new issuer
await membershipBadges.addIssuer(issuerAddress);

// Update tier validity period
await membershipBadges.setTierValidityPeriod(0, 60 * 60 * 24 * 45); // Bronze: 45 days

// Pause contract
await membershipBadges.pause();

// Update base URI
await membershipBadges.setBaseURI("https://new-api.example.com/metadata/");
```

### Frontend Integration

```javascript
// Example with ethers.js
const contract = new ethers.Contract(contractAddress, abi, signer);

// Check user's membership
async function checkMembership(userAddress) {
  const membership = await contract.getActiveMembership(userAddress);
  if (membership.isValid) {
    const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    return {
      tier: tierNames[membership.tier],
      expiresAt: new Date(membership.expiresAt.toNumber() * 1000),
      tokenId: membership.tokenId.toString()
    };
  }
  return null;
}

// Issue badge (admin/issuer only)
async function issueBadge(recipient, tier, customExpiry, tokenURI) {
  const tx = await contract.issueBadge(recipient, tier, customExpiry, tokenURI);
  return await tx.wait();
}
```

## 🧪 Testing

The project includes comprehensive tests covering:

- ✅ Contract deployment and initialization
- ✅ Badge issuance with different tiers
- ✅ Membership expiry and validation
- ✅ Role-based access control
- ✅ Badge transfers and ownership
- ✅ Admin functions and configuration
- ✅ Edge cases and error handling
- ✅ Pause/unpause functionality
- ✅ Gas optimization verification

### Test Coverage

```bash
npm run test:coverage
```

Expected coverage: >95% for all contract functions.

## 🔒 Security

### Access Control

- **DEFAULT_ADMIN_ROLE**: Full contract control, can manage roles and configuration
- **ISSUER_ROLE**: Can issue and revoke badges
- **PAUSER_ROLE**: Can pause/unpause contract operations

### Security Features

- ✅ Role-based access control
- ✅ Pausable operations for emergency stops
- ✅ Input validation and error handling
- ✅ Protection against common attacks (reentrancy, overflow)
- ✅ OpenZeppelin battle-tested contracts

### Audit Recommendations

- Consider formal audit before mainnet deployment
- Implement timelock for admin functions
- Add rate limiting for badge issuance
- Consider implementing badge burning mechanism

## 📁 Project Structure

```
NFT-Membership-Badges/
├── contracts/
│   └── project.sol              # Main membership contract
├── scripts/
│   └── deploy.js               # Deployment script
├── test/
│   └── lock.js                 # Comprehensive test suite
├── hardhat.config.js           # Hardhat configuration
├── package.json                # Dependencies and scripts
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🛠️ Customization

### Adding New Membership Tiers

1. Update the `MembershipTier` enum in the contract
2. Add default validity period in constructor
3. Update frontend tier mappings
4. Redeploy contract

### Custom Validity Periods

```solidity
// Set custom validity for Bronze tier (45 days)
await membershipBadges.setTierValidityPeriod(0, 45 * 24 * 60 * 60);
```

### Metadata Integration

The contract supports flexible metadata through:
- Token-specific URIs for custom metadata
- Base URI + token ID for standardized metadata
- IPFS integration for decentralized storage

Example metadata structure:
```json
{
  "name": "Gold Membership Badge #123",
  "description": "Premium membership with extended access",
  "image": "ipfs://QmYourImageHash",
  "attributes": [
    {"trait_type": "Tier", "value": "Gold"},
    {"trait_type": "Expires", "value": "2024-12-31"},
    {"trait_type": "Issued", "value": "2024-01-01"}
  ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [IPFS Documentation](https://docs.ipfs.io/)

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. Always perform thorough testing before deploying to mainnet.