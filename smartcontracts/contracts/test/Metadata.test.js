const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Metadata", function () {
  const ERR_AUTH = "Unauthorized: Only owner or SOC analysts can access metadata";
  const ERR_NOT_FOUND = "No metadata found for this ID";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Metadata");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts empty", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.metadataCount()).to.equal(0n);
      expect(await c.getMetadataCount()).to.equal(0n);
    });
  });

  describe("storeMetadata", function () {
    it("lets the owner store metadata; first id is 1", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).storeMetadata('{"source":"honeypot-1"}'))
        .to.emit(c, "MetadataStored")
        .withArgs(1n, '{"source":"honeypot-1"}', owner.address);
      expect(await c.metadataCount()).to.equal(1n);
    });

    it("lets an SOC analyst store metadata", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).storeMetadata("m1"))
        .to.emit(c, "MetadataStored")
        .withArgs(1n, "m1", analyst.address);
    });

    it("reverts for unauthorized callers and does not change the count", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).storeMetadata("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.metadataCount()).to.equal(0n);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.storeMetadata("a")).to.emit(c, "MetadataStored").withArgs(1n, "a", owner.address);
      await expect(c.storeMetadata("b")).to.emit(c, "MetadataStored").withArgs(2n, "b", owner.address);
      expect(await c.getMetadataCount()).to.equal(2n);
    });

    it("allows duplicate metadata as separate entries", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeMetadata("dup");
      await c.storeMetadata("dup");
      expect(await c.getMetadata(1)).to.equal("dup");
      expect(await c.getMetadata(2)).to.equal("dup");
    });

    // Documents current behaviour: existence is checked via non-empty string.
    it("increments the count for an empty string, but the entry is then unreadable", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeMetadata("");
      expect(await c.metadataCount()).to.equal(1n);
      await expect(c.getMetadata(1)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getMetadata", function () {
    it("returns stored metadata for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.storeMetadata("alpha");
      await c.storeMetadata("beta");
      expect(await c.connect(owner).getMetadata(1)).to.equal("alpha");
      expect(await c.connect(analyst).getMetadata(2)).to.equal("beta");
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.storeMetadata("alpha");
      await expect(c.connect(outsider).getMetadata(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts for id 0 and ids beyond the count", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeMetadata("alpha");
      await expect(c.getMetadata(0)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.getMetadata(2)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getMetadataCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.storeMetadata("alpha");
      expect(await c.connect(outsider).getMetadataCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(analyst).storeMetadata("alpha");
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).storeMetadata("beta")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getMetadata(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).storeMetadata("gamma")).to.not.be.reverted;
    });
  });
});
