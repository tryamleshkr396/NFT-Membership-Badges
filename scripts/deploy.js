/* eslint-disable no-console */
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  const NAME = process.env.MEMBERSHIP_NAME || "NFT Membership Badges";
  const SYMBOL = process.env.MEMBERSHIP_SYMBOL || "BADGE";
  const BASE_URI = process.env.BASE_URI || "https://api.membership.example.com/metadata/";
  const CONFIRMATIONS = Number(process.env.CONFIRMATIONS || (network === "hardhat" ? 1 : 5));

  console.log(`Deploying MembershipBadges to ${network} with deployer ${deployer.address} ...`);
  console.log(`Deployer balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  const MembershipBadges = await hre.ethers.getContractFactory("MembershipBadges");
  const contract = await MembershipBadges.deploy(NAME, SYMBOL, BASE_URI);
  
  await contract.deployed();
  console.log(`MembershipBadges deployed at: ${contract.address}`);
  console.log(`Awaiting ${CONFIRMATIONS} block confirmations...`);
  await contract.deployTransaction.wait(CONFIRMATIONS);

  // Optional: Issue some initial badges for testing
  const ISSUE_TEST_BADGES = process.env.ISSUE_TEST_BADGES === "true";
  if (ISSUE_TEST_BADGES) {
    console.log("\nIssuing test badges...");
    
    const testRecipient = process.env.TEST_RECIPIENT || deployer.address;
    
    // Issue Bronze badge
    console.log("Issuing Bronze badge...");
    const bronzeTx = await contract.issueBadge(
      testRecipient,
      0, // BRONZE tier
      0, // Use default expiry
      `${BASE_URI}bronze/1`
    );
    await bronzeTx.wait();
    console.log(`Bronze badge issued to ${testRecipient}`);
    
    // Issue Silver badge (this will revoke the bronze badge)
    console.log("Issuing Silver badge...");
    const silverTx = await contract.issueBadge(
      testRecipient,
      1, // SILVER tier
      0, // Use default expiry
      `${BASE_URI}silver/1`
    );
    await silverTx.wait();
    console.log(`Silver badge issued to ${testRecipient}`);
    
    // Check membership info
    const membershipInfo = await contract.getActiveMembership(testRecipient);
    console.log(`Active membership: Token ID ${membershipInfo.tokenId}, Tier: ${membershipInfo.tier}, Valid: ${membershipInfo.isValid}`);
  }

  // Optional: Contract verification
  if (process.env.ETHERSCAN_API_KEY && network !== "hardhat") {
    try {
      console.log("\nVerifying contract...");
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [NAME, SYMBOL, BASE_URI],
      });
      console.log("Verification successful.");
    } catch (err) {
      const msg = `${err}`;
      if (msg.includes("Already Verified")) {
        console.log("Contract already verified.");
      } else {
        console.log(`Verification failed: ${msg}`);
      }
    }
  }

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`Contract Address: ${contract.address}`);
  console.log(`Network: ${network}`);
  console.log(`Name: ${NAME}`);
  console.log(`Symbol: ${SYMBOL}`);
  console.log(`Base URI: ${BASE_URI}`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    contractAddress: contract.address,
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    name: NAME,
    symbol: SYMBOL,
    baseURI: BASE_URI,
    transactionHash: contract.deployTransaction.hash
  };
  
  console.log("\nDeployment Info (save this):");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });