const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AttackerProfile", function () {
  const ERR_AUTH = "Access denied: Not authorized";
  const ERR_ID = "Invalid ID: Profile does not exist";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AttackerProfile");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts with zero profiles", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.getAttackerProfileCount()).to.equal(0n);
    });
  });

  describe("addAttackerProfile", function () {
    it("lets the owner add a profile and emits the event with id 0 (zero-indexed)", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).addAttackerProfile("hash-A"))
        .to.emit(c, "AttackerProfileAdded")
        .withArgs(0n, "hash-A", owner.address);
      expect(await c.getAttackerProfileCount()).to.equal(1n);
    });

    it("lets an SOC analyst add a profile and records them as addedBy", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).addAttackerProfile("hash-B"))
        .to.emit(c, "AttackerProfileAdded")
        .withArgs(0n, "hash-B", analyst.address);
    });

    it("reverts for unauthorized callers and leaves the count unchanged", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).addAttackerProfile("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.getAttackerProfileCount()).to.equal(0n);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.addAttackerProfile("h0")).to.emit(c, "AttackerProfileAdded").withArgs(0n, "h0", owner.address);
      await expect(c.addAttackerProfile("h1")).to.emit(c, "AttackerProfileAdded").withArgs(1n, "h1", owner.address);
      await expect(c.addAttackerProfile("h2")).to.emit(c, "AttackerProfileAdded").withArgs(2n, "h2", owner.address);
      expect(await c.getAttackerProfileCount()).to.equal(3n);
    });

    it("accepts duplicate hashes as separate entries", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.addAttackerProfile("same");
      await c.addAttackerProfile("same");
      expect(await c.getAttackerProfile(0)).to.equal("same");
      expect(await c.getAttackerProfile(1)).to.equal("same");
      expect(await c.getAttackerProfileCount()).to.equal(2n);
    });

    it("accepts an empty string (count-based check, no empty-string sentinel)", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.addAttackerProfile("");
      expect(await c.getAttackerProfile(0)).to.equal("");
    });

    it("stores long strings", async function () {
      const { c } = await loadFixture(deployFixture);
      const long = "a".repeat(2000);
      await c.addAttackerProfile(long);
      expect(await c.getAttackerProfile(0)).to.equal(long);
    });
  });

  describe("getAttackerProfile", function () {
    it("returns the stored hash by id for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.addAttackerProfile("h0");
      await c.addAttackerProfile("h1");
      expect(await c.connect(owner).getAttackerProfile(0)).to.equal("h0");
      expect(await c.connect(analyst).getAttackerProfile(1)).to.equal("h1");
    });

    it("reverts for unauthorized callers even with a valid id", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.addAttackerProfile("h0");
      await expect(c.connect(outsider).getAttackerProfile(0)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts with 'Invalid ID' when none exist or id == count", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.getAttackerProfile(0)).to.be.revertedWith(ERR_ID);
      await c.addAttackerProfile("h0");
      await expect(c.getAttackerProfile(1)).to.be.revertedWith(ERR_ID);
      await expect(c.getAttackerProfile(999)).to.be.revertedWith(ERR_ID);
    });
  });

  describe("getAttackerProfileCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.addAttackerProfile("h0");
      expect(await c.connect(outsider).getAttackerProfileCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(analyst).addAttackerProfile("h0");
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).addAttackerProfile("h1")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getAttackerProfile(0)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).addAttackerProfile("h0")).to.not.be.reverted;
    });
  });
});
