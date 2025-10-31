import hre from "hardhat";

async function main() {
  const NftMembershipBadges = await hre.ethers.getContractFactory("NftMembershipBadges");
  const contract = await NftMembershipBadges.deploy();

  await contract.waitForDeployment();
  console.log("NftMembershipBadges deployed to:", await contract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
