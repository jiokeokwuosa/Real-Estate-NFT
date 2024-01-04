import { ethers } from "hardhat";

const tokens = (n: number) => {
  return ethers.parseUnits(n.toString(), "ether")
}

async function main() {
  const [buyer, seller, inspector, lender] = await ethers.getSigners();

  // deploy real estate contract
  console.log('deploying real estate contract...')
  const RealEstate = await ethers.getContractFactory("RealEstate");
  const realEstate = await RealEstate.deploy();
  await realEstate.waitForDeployment();
  console.log(`deployed real estate contract at address ${await realEstate.getAddress()}`)

  console.log('miniting 3 nfts...')
  for (let i = 0; i < 3; i++) {
    const transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}.json`);
    await transaction.wait();
  }
  console.log('minted 3 nfts')

  // deploy escrow contract
  console.log('deploying escrow contract...')
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(lender.address, inspector.address, seller.address, await realEstate.getAddress());
  await escrow.waitForDeployment();
  console.log(`deployed escrow contract at address ${await escrow.getAddress()}`)

  // approve nft
  console.log('approving the nfts...')
  for (let i = 0; i < 3; i++) {
    const transaction = await realEstate.connect(seller).approve(escrow.getAddress(), `${i + 1}`);
    await transaction.wait();
  }
  console.log('nfts approved')

  // list nft
  console.log('listing the nfts...')
  let transaction = await escrow.connect(seller).list(1, buyer.getAddress(), tokens(20), tokens(10));
  await transaction.wait();
  transaction = await escrow.connect(seller).list(2, buyer.getAddress(), tokens(15), tokens(5));
  await transaction.wait();
  transaction = await escrow.connect(seller).list(3, buyer.getAddress(), tokens(10), tokens(5));
  await transaction.wait();
  console.log('nfts listed successfully')

  console.log('Done')
}
// run command --> npx hardhat run scripts/deploy.ts --network localhost
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
