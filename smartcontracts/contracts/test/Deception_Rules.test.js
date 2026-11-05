const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Deception_Rules", function () {
  const ERR_AUTH = "Unauthorized: Only owner or SOC analysts can access this function";
  const ERR_NOT_FOUND = "No deception rule found for this ID";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Deception_Rules");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  async function withRuleFixture() {
    const base = await deployFixture();
    await base.c.storeDeceptionRule("rule-1");
    return base;
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts with zero rules", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.ruleCount()).to.equal(0n);
      expect(await c.getRuleCount()).to.equal(0n);
    });
  });

  describe("storeDeceptionRule", function () {
    it("lets the owner store a rule; first id is 1", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).storeDeceptionRule("expose fake valve on port 502"))
        .to.emit(c, "DeceptionRuleStored")
        .withArgs(1n, "expose fake valve on port 502", owner.address);
      expect(await c.ruleCount()).to.equal(1n);
    });

    it("lets an SOC analyst store a rule", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).storeDeceptionRule("r"))
        .to.emit(c, "DeceptionRuleStored")
        .withArgs(1n, "r", analyst.address);
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).storeDeceptionRule("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.ruleCount()).to.equal(0n);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.storeDeceptionRule("a")).to.emit(c, "DeceptionRuleStored").withArgs(1n, "a", owner.address);
      await expect(c.storeDeceptionRule("b")).to.emit(c, "DeceptionRuleStored").withArgs(2n, "b", owner.address);
      expect(await c.getRuleCount()).to.equal(2n);
    });

    // Documents current behaviour: existence is checked via non-empty string.
    it("increments the count for an empty rule, but it is then unreadable and unupdatable", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeDeceptionRule("");
      expect(await c.ruleCount()).to.equal(1n);
      await expect(c.getDeceptionRule(1)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.updateDeceptionRule(1, "fix")).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("updateDeceptionRule", function () {
    it("lets the owner update an existing rule and emits the event", async function () {
      const { c, owner } = await loadFixture(withRuleFixture);
      await expect(c.connect(owner).updateDeceptionRule(1, "rule-1-v2"))
        .to.emit(c, "DeceptionRuleUpdated")
        .withArgs(1n, "rule-1-v2", owner.address);
      expect(await c.getDeceptionRule(1)).to.equal("rule-1-v2");
    });

    it("lets an SOC analyst update a rule and records them as updatedBy", async function () {
      const { c, analyst } = await loadFixture(withRuleFixture);
      await expect(c.connect(analyst).updateDeceptionRule(1, "by-analyst"))
        .to.emit(c, "DeceptionRuleUpdated")
        .withArgs(1n, "by-analyst", analyst.address);
    });

    it("does not change the rule count or other rules", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await c.storeDeceptionRule("rule-2");
      await c.updateDeceptionRule(1, "changed");
      expect(await c.getRuleCount()).to.equal(2n);
      expect(await c.getDeceptionRule(2)).to.equal("rule-2");
    });

    it("reverts for unauthorized callers and leaves the rule unchanged", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      await expect(c.connect(outsider).updateDeceptionRule(1, "hack")).to.be.revertedWith(ERR_AUTH);
      expect(await c.getDeceptionRule(1)).to.equal("rule-1");
    });

    it("reverts for id 0 and non-existent ids", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await expect(c.updateDeceptionRule(0, "x")).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.updateDeceptionRule(2, "x")).to.be.revertedWith(ERR_NOT_FOUND);
    });

    // Documents current behaviour: updating to "" makes the rule non-existent.
    it("updating a rule to an empty string makes it unreadable and unupdatable", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await c.updateDeceptionRule(1, "");
      await expect(c.getDeceptionRule(1)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.updateDeceptionRule(1, "again")).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getDeceptionRule", function () {
    it("returns the stored rule for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(withRuleFixture);
      expect(await c.connect(owner).getDeceptionRule(1)).to.equal("rule-1");
      expect(await c.connect(analyst).getDeceptionRule(1)).to.equal("rule-1");
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      await expect(c.connect(outsider).getDeceptionRule(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts for id 0 and ids beyond the count", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await expect(c.getDeceptionRule(0)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.getDeceptionRule(2)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getRuleCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      expect(await c.connect(outsider).getRuleCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(withRuleFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).storeDeceptionRule("x")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).updateDeceptionRule(1, "x")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getDeceptionRule(1)).to.be.revertedWith(ERR_AUTH);
    });
  });
});
