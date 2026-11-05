const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Trap_Rules", function () {
  const ERR_AUTH = "Unauthorized: Only owner or SOC analysts can access trap rules";
  const ERR_NOT_FOUND = "Trap rule does not exist";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Trap_Rules");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  async function withRuleFixture() {
    const base = await deployFixture();
    await base.c.addTrapRule("trap-1");
    return base;
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts with zero rules", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.ruleCount()).to.equal(0n);
      expect(await c.getTrapRuleCount()).to.equal(0n);
    });
  });

  describe("addTrapRule", function () {
    it("lets the owner add a rule; first id is 1; emits the event", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).addTrapRule("alert on Modbus write"))
        .to.emit(c, "TrapRuleAdded")
        .withArgs(1n, "alert on Modbus write", owner.address);
      expect(await c.ruleCount()).to.equal(1n);
    });

    it("lets an SOC analyst add a rule", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).addTrapRule("r"))
        .to.emit(c, "TrapRuleAdded")
        .withArgs(1n, "r", analyst.address);
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).addTrapRule("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.ruleCount()).to.equal(0n);
    });

    it("stores the rule as active with the correct id and description", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.addTrapRule("rule-x");
      const rule = await c.getTrapRule(1);
      expect(rule.id).to.equal(1n);
      expect(rule.description).to.equal("rule-x");
      expect(rule.isActive).to.equal(true);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.addTrapRule("a")).to.emit(c, "TrapRuleAdded").withArgs(1n, "a", owner.address);
      await expect(c.addTrapRule("b")).to.emit(c, "TrapRuleAdded").withArgs(2n, "b", owner.address);
      expect(await c.getTrapRuleCount()).to.equal(2n);
      expect((await c.getTrapRule(2)).id).to.equal(2n);
    });

    // Documents current behaviour: existence is checked via non-empty description.
    it("increments the count for an empty description, but the rule is then unreadable", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.addTrapRule("");
      expect(await c.ruleCount()).to.equal(1n);
      await expect(c.getTrapRule(1)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("updateTrapRule", function () {
    it("lets the owner update description and status, and emits the event", async function () {
      const { c, owner } = await loadFixture(withRuleFixture);
      await expect(c.connect(owner).updateTrapRule(1, "trap-1-v2", false))
        .to.emit(c, "TrapRuleUpdated")
        .withArgs(1n, "trap-1-v2", false, owner.address);
      const rule = await c.getTrapRule(1);
      expect(rule.id).to.equal(1n);
      expect(rule.description).to.equal("trap-1-v2");
      expect(rule.isActive).to.equal(false);
    });

    it("lets an SOC analyst update a rule", async function () {
      const { c, analyst } = await loadFixture(withRuleFixture);
      await expect(c.connect(analyst).updateTrapRule(1, "by-analyst", true))
        .to.emit(c, "TrapRuleUpdated")
        .withArgs(1n, "by-analyst", true, analyst.address);
    });

    it("can deactivate and then reactivate a rule", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await c.updateTrapRule(1, "trap-1", false);
      expect((await c.getTrapRule(1)).isActive).to.equal(false);
      await c.updateTrapRule(1, "trap-1", true);
      expect((await c.getTrapRule(1)).isActive).to.equal(true);
    });

    it("does not change the rule count or other rules", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await c.addTrapRule("trap-2");
      await c.updateTrapRule(1, "changed", false);
      expect(await c.getTrapRuleCount()).to.equal(2n);
      const r2 = await c.getTrapRule(2);
      expect(r2.description).to.equal("trap-2");
      expect(r2.isActive).to.equal(true);
    });

    it("reverts for unauthorized callers and leaves the rule unchanged", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      await expect(c.connect(outsider).updateTrapRule(1, "hack", false)).to.be.revertedWith(ERR_AUTH);
      const rule = await c.getTrapRule(1);
      expect(rule.description).to.equal("trap-1");
      expect(rule.isActive).to.equal(true);
    });

    it("reverts for id 0 and non-existent ids", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await expect(c.updateTrapRule(0, "x", true)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.updateTrapRule(2, "x", true)).to.be.revertedWith(ERR_NOT_FOUND);
    });

    // Documents current behaviour: updating to "" makes the rule non-existent.
    it("updating a rule to an empty description makes it unreadable and unupdatable", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await c.updateTrapRule(1, "", true);
      await expect(c.getTrapRule(1)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.updateTrapRule(1, "again", true)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getTrapRule", function () {
    it("returns the struct for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(withRuleFixture);
      for (const signer of [owner, analyst]) {
        const rule = await c.connect(signer).getTrapRule(1);
        expect(rule.id).to.equal(1n);
        expect(rule.description).to.equal("trap-1");
        expect(rule.isActive).to.equal(true);
      }
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      await expect(c.connect(outsider).getTrapRule(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts for id 0 and ids beyond the count", async function () {
      const { c } = await loadFixture(withRuleFixture);
      await expect(c.getTrapRule(0)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.getTrapRule(2)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getTrapRuleCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(withRuleFixture);
      expect(await c.connect(outsider).getTrapRuleCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(withRuleFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).addTrapRule("x")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).updateTrapRule(1, "x", true)).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getTrapRule(1)).to.be.revertedWith(ERR_AUTH);
    });
  });
});
