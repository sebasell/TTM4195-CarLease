const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CarLease - Minting (FR-001, FR-002, FR-003)", function () {
  // Fixture for deploying contract
  async function deployCarLeaseFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const CarLease = await ethers.getContractFactory("CarLease");
    const carLease = await CarLease.deploy();
    return { carLease, owner, addr1, addr2 };
  }

  describe("mintOption", function () {
    it("should mint NFT with valid metadata (FR-001, FR-002)", async function () {
      const { carLease, owner } = await loadFixture(deployCarLeaseFixture);

      const tx = await carLease.mintOption(
        "Tesla Model 3",           // model
        "Blue",                    // color
        2024,                      // year
        ethers.parseEther("30"),   // originalValueWei
        ethers.parseEther("0.5"),  // monthlyPayment
        36,                        // durationMonths
        50000                      // mileageLimit
      );

      // Check OptionMinted event
      await expect(tx)
        .to.emit(carLease, "OptionMinted")
        .withArgs(
          1,  // tokenId
          "Tesla Model 3",
          "Blue",
          2024,
          ethers.parseEther("30")
        );

      // Verify metadata stored
      const metadata = await carLease.carData(1);
      expect(metadata.model).to.equal("Tesla Model 3");
      expect(metadata.color).to.equal("Blue");
      expect(metadata.year).to.equal(2024);
      expect(metadata.originalValueWei).to.equal(ethers.parseEther("30"));
      expect(metadata.mileageLimit).to.equal(50000);
    });

    it("should mint NFT owned by contract not dealer (FR-003)", async function () {
      const { carLease, owner } = await loadFixture(deployCarLeaseFixture);

      await carLease.mintOption(
        "Tesla Model 3",
        "Blue",
        2024,
        ethers.parseEther("30"),
        ethers.parseEther("0.5"),
        36,
        50000
      );

      // Verify NFT owned by contract (not dealer)
      const contractAddress = await carLease.getAddress();
      expect(await carLease.ownerOf(1)).to.equal(contractAddress);
    });

  it("should revert if model is empty (FR-001 validation)", async function () {
    const { carLease } = await loadFixture(deployCarLeaseFixture);

    await expect(
      carLease.mintOption(
        "",  // Empty model
        "Blue",
        2024,
        ethers.parseEther("30"),
        ethers.parseEther("0.5"),
        36,
        50000
      )
    ).to.be.revertedWith("Model cannot be empty");
  });

  it("should revert if original value is zero (FR-001 validation)", async function () {
    const { carLease } = await loadFixture(deployCarLeaseFixture);

    await expect(
      carLease.mintOption(
        "Tesla Model 3",
        "Blue",
        2024,
        0,  // Zero value
        ethers.parseEther("0.5"),
        36,
        50000
      )
    ).to.be.revertedWith("Original value must be greater than zero");
  });    it("should revert when non-owner tries to mint (FR-037)", async function () {
      const { carLease, addr1 } = await loadFixture(deployCarLeaseFixture);

      await expect(
        carLease.connect(addr1).mintOption(
          "Tesla Model 3",
          "Blue",
          2024,
          ethers.parseEther("30"),
          ethers.parseEther("0.5"),
          36,
          50000
        )
      ).to.be.revertedWithCustomError(carLease, "OwnableUnauthorizedAccount");
    });

    it("should auto-increment token IDs (FR-002)", async function () {
      const { carLease } = await loadFixture(deployCarLeaseFixture);

      // Mint first NFT
      await carLease.mintOption(
        "Tesla Model 3",
        "Blue",
        2024,
        ethers.parseEther("30"),
        ethers.parseEther("0.5"),
        36,
        50000
      );

      // Mint second NFT
      const tx = await carLease.mintOption(
        "BMW i4",
        "Red",
        2023,
        ethers.parseEther("25"),
        ethers.parseEther("0.4"),
        24,
        40000
      );

      // Should emit with tokenId 2
      await expect(tx)
        .to.emit(carLease, "OptionMinted")
        .withArgs(
          2,  // Second token
          "BMW i4",
          "Red",
          2023,
          ethers.parseEther("25")
        );
    });
  });
});
