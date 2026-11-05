const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("LevelSensor", function () {
  const ERR_AUTH = "Access denied: Not authorized";
  const ERR_RANGE = "Minimum level must be less than maximum level";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("LevelSensor");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
    });

    it("initializes default thresholds to (1, 5)", async function () {
      const { c } = await loadFixture(deployFixture);
      const [min, max] = await c.getWaterLevelThresholds();
      expect(min).to.equal(1n);
      expect(max).to.equal(5n);
    });
  });

  describe("getWaterLevelThresholds", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      const [min, max] = await c.connect(outsider).getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([1n, 5n]);
    });
  });

  describe("setWaterLevelThresholds", function () {
    it("lets the owner update thresholds and emits ThresholdUpdated", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).setWaterLevelThresholds(2, 10))
        .to.emit(c, "ThresholdUpdated")
        .withArgs(2n, 10n, owner.address);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([2n, 10n]);
    });

    it("lets an SOC analyst update thresholds", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).setWaterLevelThresholds(3, 7))
        .to.emit(c, "ThresholdUpdated")
        .withArgs(3n, 7n, analyst.address);
    });

    it("reverts for unauthorized callers and leaves thresholds unchanged", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).setWaterLevelThresholds(2, 10)).to.be.revertedWith(ERR_AUTH);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([1n, 5n]);
    });

    it("reverts when min == max", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.setWaterLevelThresholds(5, 5)).to.be.revertedWith(ERR_RANGE);
    });

    it("reverts when min > max", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.setWaterLevelThresholds(9, 3)).to.be.revertedWith(ERR_RANGE);
    });

    it("keeps previous thresholds after a failed update", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setWaterLevelThresholds(2, 8);
      await expect(c.setWaterLevelThresholds(8, 2)).to.be.revertedWith(ERR_RANGE);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([2n, 8n]);
    });

    it("accepts a minimum of 0", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setWaterLevelThresholds(0, 1);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([0n, 1n]);
    });

    it("accepts the largest valid range (0, 2^256-1)", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setWaterLevelThresholds(0, ethers.MaxUint256);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([0n, ethers.MaxUint256]);
    });

    it("rejects (max, max) at the upper bound", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.setWaterLevelThresholds(ethers.MaxUint256, ethers.MaxUint256)).to.be.revertedWith(ERR_RANGE);
    });

    it("allows repeated updates; last write wins", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setWaterLevelThresholds(1, 2);
      await c.setWaterLevelThresholds(10, 20);
      const [min, max] = await c.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([10n, 20n]);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).setWaterLevelThresholds(2, 3)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).setWaterLevelThresholds(2, 3)).to.not.be.reverted;
    });
  });
});
