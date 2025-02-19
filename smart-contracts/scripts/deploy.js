
async function main() {
  
  const ProcessStage = await hre.ethers.getContractFactory("ProcessStage");

  //deploy the rsu contract which also deploys vehicle and analyzer vehicle contracts
  const processStage = await ProcessStage.deploy();

  // wait for the deployment completion
  await processStage.deployed();

  //Get all the addresses

  const [tankAddr, levelSensorAddr] = await processStage.getChildContractAddresses();


  console.log(`Process Stage deployed to:  ${processStage.address}`);
  console.log(`Tank Contract deployed to:  ${tankAddr}`);
  console.log(`Level Sensor Contract deployed to:  ${levelSensorAddr}`);  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
