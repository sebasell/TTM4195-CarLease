const { ethers } = require("hardhat");

/**
 * Deploys a fresh CarLease contract
 * @returns {Promise<{carLease, owner, lessee1, lessee2}>}
 */
async function deployCarLeaseFixture() {
  const [owner, lessee1, lessee2] = await ethers.getSigners();
  
  const CarLease = await ethers.getContractFactory("CarLease");
  const carLease = await CarLease.deploy();
  
  return { carLease, owner, lessee1, lessee2 };
}

/**
 * Deploys CarLease contract and mints one NFT
 * @returns {Promise<{carLease, owner, lessee1, lessee2, tokenId}>}
 */
async function mintedNFTFixture() {
  const { carLease, owner, lessee1, lessee2 } = await deployCarLeaseFixture();
  
  const tx = await carLease.mintOption(
    "Tesla Model 3",
    "Blue",
    2024,
    ethers.parseEther("30"),
    ethers.parseEther("0.5"),
    36,
    50000
  );
  
  await tx.wait();
  const tokenId = 1; // First minted NFT
  
  return { carLease, owner, lessee1, lessee2, tokenId };
}

/**
 * Deploys CarLease, mints NFT, and places commitment
 * @returns {Promise<{carLease, owner, lessee1, lessee2, tokenId, secret, commitment}>}
 */
async function committedLeaseFixture() {
  const { carLease, owner, lessee1, lessee2, tokenId } = await mintedNFTFixture();
  
  const secret = ethers.id("my-secret-12345");
  const commitment = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "bytes32", "address"],
      [tokenId, secret, lessee1.address]
    )
  );
  
  await carLease.connect(lessee1).commitToLease(tokenId, commitment);
  
  return { carLease, owner, lessee1, lessee2, tokenId, secret, commitment };
}

/**
 * Deploys CarLease, mints NFT, commits, and reveals with deposit
 * @returns {Promise<{carLease, owner, lessee1, lessee2, tokenId, secret}>}
 */
async function revealedLeaseFixture() {
  const { carLease, owner, lessee1, lessee2, tokenId, secret } = await committedLeaseFixture();
  
  const monthlyPayment = ethers.parseEther("0.5");
  const deposit = monthlyPayment * 3n;
  
  await carLease.connect(lessee1).revealAndPay(tokenId, secret, 36, monthlyPayment, { value: deposit });
  
  return { carLease, owner, lessee1, lessee2, tokenId, secret };
}

/**
 * Deploys CarLease, mints NFT, commits, reveals, and dealer confirms
 * @returns {Promise<{carLease, owner, lessee1, lessee2, tokenId}>}
 */
async function activeLeaseFixture() {
  const { carLease, owner, lessee1, lessee2, tokenId } = await revealedLeaseFixture();
  
  await carLease.connect(owner).confirmLease(tokenId);
  
  return { carLease, owner, lessee1, lessee2, tokenId };
}

module.exports = {
  deployCarLeaseFixture,
  mintedNFTFixture,
  committedLeaseFixture,
  revealedLeaseFixture,
  activeLeaseFixture
};
