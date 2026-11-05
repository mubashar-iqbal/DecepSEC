const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("DigitalTwinHashStorage (Twin_Model.sol)", function () {
  const ERR_AUTH = "Access denied: Not authorized";
  const ERR_NOT_FOUND = "Model ID does not exist";

  const H1 = ethers.id("twin-model-v1"); // keccak256 -> bytes32
  const H2 = ethers.id("twin-model-v2");
  const ZERO = ethers.ZeroHash;

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DigitalTwinHashStorage");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  async function withHashFixture() {
    const base = await deployFixture();
    await base.c.storeHash("pump-station", H1);
    return base;
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
    });

    it("has no hashes stored initially", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.getHash("anything")).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("storeHash", function () {
    it("lets the owner store a hash and emits HashStored", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).storeHash("pump-station", H1))
        .to.emit(c, "HashStored")
        .withArgs("pump-station", H1);
      expect(await c.getHash("pump-station")).to.equal(H1);
    });

    it("lets an SOC analyst store a hash", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).storeHash("tank-1", H1)).to.emit(c, "HashStored").withArgs("tank-1", H1);
    });

    it("reverts for unauthorized callers and stores nothing", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).storeHash("pump-station", H1)).to.be.revertedWith(ERR_AUTH);
      await expect(c.getHash("pump-station")).to.be.revertedWith(ERR_NOT_FOUND);
    });

    it("overwrites an existing hash for the same modelId and emits again", async function () {
      const { c } = await loadFixture(withHashFixture);
      await expect(c.storeHash("pump-station", H2)).to.emit(c, "HashStored").withArgs("pump-station", H2);
      expect(await c.getHash("pump-station")).to.equal(H2);
    });

    it("keeps different modelIds independent", async function () {
      const { c } = await loadFixture(withHashFixture);
      await c.storeHash("tank-1", H2);
      expect(await c.getHash("pump-station")).to.equal(H1);
      expect(await c.getHash("tank-1")).to.equal(H2);
    });

    it("treats modelIds as case-sensitive", async function () {
      const { c } = await loadFixture(withHashFixture);
      await expect(c.getHash("Pump-Station")).to.be.revertedWith(ERR_NOT_FOUND);
    });

    it("supports an empty-string modelId", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeHash("", H1);
      expect(await c.getHash("")).to.equal(H1);
    });

    // Documents current behaviour: bytes32(0) is used as the "missing" sentinel.
    it("accepts a zero hash but then treats the model as non-existent", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.storeHash("zero-model", ZERO)).to.emit(c, "HashStored").withArgs("zero-model", ZERO);
      await expect(c.getHash("zero-model")).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.verifyHash("zero-model", ZERO)).to.be.revertedWith(ERR_NOT_FOUND);
    });

    it("overwriting with a zero hash effectively deletes the entry", async function () {
      const { c } = await loadFixture(withHashFixture);
      await c.storeHash("pump-station", ZERO);
      await expect(c.getHash("pump-station")).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getHash", function () {
    // Documents current behaviour: reads are not access-restricted.
    it("is callable by any address", async function () {
      const { c, outsider } = await loadFixture(withHashFixture);
      expect(await c.connect(outsider).getHash("pump-station")).to.equal(H1);
    });

    it("reverts for an unknown modelId", async function () {
      const { c } = await loadFixture(withHashFixture);
      await expect(c.getHash("unknown")).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("verifyHash", function () {
    it("returns true when the hash matches", async function () {
      const { c } = await loadFixture(withHashFixture);
      expect(await c.verifyHash("pump-station", H1)).to.equal(true);
    });

    it("returns false when the hash does not match", async function () {
      const { c } = await loadFixture(withHashFixture);
      expect(await c.verifyHash("pump-station", H2)).to.equal(false);
      expect(await c.verifyHash("pump-station", ZERO)).to.equal(false);
    });

    it("reflects updates after overwrite", async function () {
      const { c } = await loadFixture(withHashFixture);
      await c.storeHash("pump-station", H2);
      expect(await c.verifyHash("pump-station", H1)).to.equal(false);
      expect(await c.verifyHash("pump-station", H2)).to.equal(true);
    });

    it("reverts for an unknown modelId", async function () {
      const { c } = await loadFixture(withHashFixture);
      await expect(c.verifyHash("unknown", H1)).to.be.revertedWith(ERR_NOT_FOUND);
    });

    it("is callable by any address", async function () {
      const { c, outsider } = await loadFixture(withHashFixture);
      expect(await c.connect(outsider).verifyHash("pump-station", H1)).to.equal(true);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes storeHash access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(withHashFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).storeHash("x", H1)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants storeHash access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).storeHash("x", H1)).to.not.be.reverted;
    });
  });
});
