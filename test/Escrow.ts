import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const tokens = (n: number) => {
  return ethers.parseUnits(n.toString(), "ether")
}

describe("Escrow", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployEscrowFixture() {
    // deploy real estate contract
    const [buyer, seller, inspector, lender] = await ethers.getSigners();

    // test tokenId 
    const tokenId = 1;
    const purchasePrice = tokens(10);
    const escrowAmount = tokens(5);

    const RealEstate = await ethers.getContractFactory("RealEstate");
    const realEstate = await RealEstate.deploy();
    await realEstate.waitForDeployment();

    // deploy escrow contract
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(lender.address, inspector.address, seller.address, await realEstate.getAddress());
    await escrow.waitForDeployment();

    // mint nft
    let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png");
    await transaction.wait();

    // approve nft
    transaction = await realEstate.connect(seller).approve(escrow.getAddress(), tokenId);
    await transaction.wait();

    // list nft
    transaction = await escrow.connect(seller).list(tokenId, buyer.getAddress(), purchasePrice, escrowAmount);
    await transaction.wait();

    return { realEstate, escrow, buyer, seller, inspector, lender, tokenId, purchasePrice, escrowAmount };
  }

  describe("Deployment", function () {
    it("returns the correct nft address", async function () {
      const { escrow, realEstate } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getNFTAddress()
      expect(result).to.equal(await realEstate.getAddress());
    });

    it("returns the correct seller address", async function () {
      const { escrow, seller } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getSeller()
      expect(result).to.equal(await seller.getAddress());
    });

    it("returns the correct inspector address", async function () {
      const { escrow, inspector } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getInspector()
      expect(result).to.equal(await inspector.getAddress());
    });

    it("returns the correct lender address", async function () {
      const { escrow, lender } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getLender()
      expect(result).to.equal(await lender.getAddress());
    });
  });

  describe("List NFT", function () {
    it("updates ownership after listing nft", async function () {
      const { escrow, realEstate, tokenId } = await loadFixture(deployEscrowFixture);

      expect(await realEstate.ownerOf(tokenId)).to.equal(await escrow.getAddress());
    });

    it("marks nft as listed", async function () {
      const { escrow, tokenId } = await loadFixture(deployEscrowFixture);
      const result = await escrow.isNFTListed(tokenId)

      expect(result).to.equal(true);
    });

    it("returns the correct buyer address", async function () {
      const { escrow, buyer, tokenId } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getBuyer(tokenId)
      expect(result).to.equal(await buyer.getAddress());
    });

    it("returns the correct purchase price", async function () {
      const { escrow, purchasePrice, tokenId } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getPurchasedPrice(tokenId)
      expect(result).to.equal(purchasePrice);
    });

    it("returns the correct escrow amount", async function () {
      const { escrow, escrowAmount, tokenId } = await loadFixture(deployEscrowFixture);
      const result = await escrow.getEscrowAmount(tokenId)
      expect(result).to.equal(escrowAmount);
    });
  });

  describe("Deposits", function () {
    it("updates contract balance when the right escrow amount is paid by the buyer", async function () {
      const { escrow, tokenId, buyer, escrowAmount } = await loadFixture(deployEscrowFixture);

      // make deposit
      const transaction = await escrow.connect(buyer).depositDownPayment(tokenId, { value: escrowAmount });
      await transaction.wait();

      const result = await escrow.getBalance();
      await transaction.wait();

      expect(result).to.equal(escrowAmount);
    });

    it("should not allow any person other than the buyer to make down payment", async function () {
      const { escrow, tokenId, seller, escrowAmount } = await loadFixture(deployEscrowFixture);

      await expect(escrow.connect(seller).depositDownPayment(tokenId, { value: escrowAmount })).to.be.revertedWithCustomError(
        escrow,
        "Escrow__OnlyBuyer"
      );;
    });

    it("should not allow  buyer to make down payment with incorrect ether amount", async function () {
      const { escrow, tokenId, buyer, escrowAmount } = await loadFixture(deployEscrowFixture);

      await expect(escrow.connect(buyer).depositDownPayment(tokenId, { value: tokens(2) })).to.be.revertedWithCustomError(
        escrow,
        "Escrow__NotEnoughDeposit"
      );;
    });
  });

  describe("Inspection", function () {
    it("updates inspection status when inspection is carried out by the inspector", async function () {
      const { escrow, tokenId, inspector } = await loadFixture(deployEscrowFixture);

      // update inspection
      const transaction = await escrow.connect(inspector).updateInspectionStatus(tokenId, true);
      await transaction.wait();

      const result = await escrow.getInspectionStatus(tokenId);
      await transaction.wait();

      expect(result).to.equal(true);
    });

    it("should not allow any person other than the inspector to handle inspection", async function () {
      const { escrow, tokenId, seller, escrowAmount } = await loadFixture(deployEscrowFixture);

      await expect(escrow.connect(seller).updateInspectionStatus(tokenId, true)).to.be.revertedWithCustomError(
        escrow,
        "Escrow__OnlyInspector"
      );;
    });
  });

  describe("Approval", function () {
    it("updates approval status", async function () {
      const { escrow, tokenId, buyer, seller, lender } = await loadFixture(deployEscrowFixture);

      let transaction = await escrow.connect(buyer).approveSale(tokenId);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(tokenId);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(tokenId);
      await transaction.wait();

      expect(await escrow.getApprovalStatus(tokenId, buyer.getAddress())).to.equal(true);
      expect(await escrow.getApprovalStatus(tokenId, seller.getAddress())).to.equal(true);
      expect(await escrow.getApprovalStatus(tokenId, lender.getAddress())).to.equal(true);
    });
  });

  describe("Sale", function () {
    beforeEach(async () => {
      const { escrow, tokenId, buyer, escrowAmount, inspector, seller, lender } = await loadFixture(deployEscrowFixture);

      // make deposit
      let transaction = await escrow.connect(buyer).depositDownPayment(tokenId, { value: escrowAmount });
      await transaction.wait();

      // inspection
      transaction = await escrow.connect(inspector).updateInspectionStatus(tokenId, true);
      await transaction.wait();

      // approvals
      transaction = await escrow.connect(buyer).approveSale(tokenId);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(tokenId);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(tokenId);
      await transaction.wait();

      // the lender will pay the remaining amount needed to reach the purchase price
      await lender.sendTransaction({ to: escrow.getAddress(), value: escrowAmount})

      // finalize sale
      transaction = await escrow.connect(seller).finalizeSale(tokenId);
      await transaction.wait();

    })

    // it("updates nft ownership", async function () {
    //   const { realEstate, tokenId, escrow } = await loadFixture(deployEscrowFixture);

    //   expect(await realEstate.ownerOf(tokenId)).to.be.equal(await escrow.getBuyer(tokenId));
    // });

    it("updates escrow balance", async function () {
      const { escrow } = await loadFixture(deployEscrowFixture);

      expect(await escrow.getBalance()).to.equal(0);
    });
  });
});
