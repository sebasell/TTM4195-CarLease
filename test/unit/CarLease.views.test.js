const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - View Functions", function () {
  // Fixture with active lease
  async function activeLeaseFixture() {
    const [owner, lessee1] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();

    // Mint NFT
    await carLease.mintOption(
      "Tesla Model 3",
      "Blue",
      2024,
      ethers.parseEther("30"),
      ethers.parseEther("0.5"),
      36,
      50000
    );

    const tokenId = 1;

    // Commit
    const secret = ethers.id("my-secret-12345");
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "bytes32", "address"],
        [tokenId, secret, lessee1.address]
      )
    );
    await carLease.connect(lessee1).commitToLease(tokenId, commitment);

    // Reveal with deposit
    const monthlyPayment = ethers.parseEther("0.5");
    const deposit = monthlyPayment * 3n;
    await carLease.connect(lessee1).revealAndPay(
      tokenId,
      secret,
      36,
      monthlyPayment,
      { value: deposit }
    );

    // Confirm lease
    await carLease.connect(owner).confirmLease(tokenId);

    return { carLease, owner, lessee1, tokenId, monthlyPayment };
  }

  it("should return car metadata via getCarMetadata", async function () {
    const { carLease, tokenId } = await loadFixture(activeLeaseFixture);

    const metadata = await carLease.getCarMetadata(tokenId);

    expect(metadata.model).to.equal("Tesla Model 3");
    expect(metadata.color).to.equal("Blue");
    expect(metadata.year).to.equal(2024);
    expect(metadata.originalValueWei).to.equal(ethers.parseEther("30"));
    expect(metadata.mileageLimit).to.equal(50000);
  });
});
