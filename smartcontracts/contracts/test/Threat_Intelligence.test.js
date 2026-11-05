const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ThreatIntelligence", function () {
  const ERR_AUTH = "Access denied: Not authorized";
  const ERR_ID = "Invalid ID: Hash does not exist";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ThreatIntelligence");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts with zero hashes", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.getThreatIntelligenceCount()).to.equal(0n);
    });
  });

  describe("addThreatIntelligence", function () {
    it("lets the owner add a hash; first id is 0 (zero-indexed)", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).addThreatIntelligence("ti-0"))
        .to.emit(c, "ThreatIntelligenceAdded")
        .withArgs(0n, "ti-0", owner.address);
      expect(await c.getThreatIntelligenceCount()).to.equal(1n);
    });

    it("lets an SOC analyst add a hash", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).addThreatIntelligence("ti-a"))
        .to.emit(c, "ThreatIntelligenceAdded")
        .withArgs(0n, "ti-a", analyst.address);
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).addThreatIntelligence("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.getThreatIntelligenceCount()).to.equal(0n);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.addThreatIntelligence("a")).to.emit(c, "ThreatIntelligenceAdded").withArgs(0n, "a", owner.address);
      await expect(c.addThreatIntelligence("b")).to.emit(c, "ThreatIntelligenceAdded").withArgs(1n, "b", owner.address);
      expect(await c.getThreatIntelligenceCount()).to.equal(2n);
    });

    it("accepts duplicates and empty strings", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.addThreatIntelligence("dup");
      await c.addThreatIntelligence("dup");
      await c.addThreatIntelligence("");
      expect(await c.getThreatIntelligence(0)).to.equal("dup");
      expect(await c.getThreatIntelligence(1)).to.equal("dup");
      expect(await c.getThreatIntelligence(2)).to.equal("");
    });
  });

  describe("getThreatIntelligence", function () {
    it("returns stored hashes for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.addThreatIntelligence("ti-0");
      await c.addThreatIntelligence("ti-1");
      expect(await c.connect(owner).getThreatIntelligence(0)).to.equal("ti-0");
      expect(await c.connect(analyst).getThreatIntelligence(1)).to.equal("ti-1");
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.addThreatIntelligence("ti-0");
      await expect(c.connect(outsider).getThreatIntelligence(0)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts with 'Invalid ID' for ids >= count", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.getThreatIntelligence(0)).to.be.revertedWith(ERR_ID);
      await c.addThreatIntelligence("ti-0");
      await expect(c.getThreatIntelligence(1)).to.be.revertedWith(ERR_ID);
      await expect(c.getThreatIntelligence(ethers.MaxUint256)).to.be.revertedWith(ERR_ID);
    });
  });

  describe("getThreatIntelligenceCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.addThreatIntelligence("ti-0");
      expect(await c.connect(outsider).getThreatIntelligenceCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(analyst).addThreatIntelligence("ti-0");
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).addThreatIntelligence("ti-1")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getThreatIntelligence(0)).to.be.revertedWith(ERR_AUTH);
    });
  });
});
