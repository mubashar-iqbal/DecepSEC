const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tank", function () {
  const ERR_AUTH = "Access denied: Not authorized";
  const ERR_RANGE = "Invalid thresholds: minThreshold must be less than maxThreshold";
  const INT256_MAX = 2n ** 255n - 1n;
  const INT256_MIN = -(2n ** 255n);

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Tank");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
    });

    it("starts with level 0 and thresholds (0, 0)", async function () {
      const { c } = await loadFixture(deployFixture);
      expect(await c.getLevel()).to.equal(0n);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([0n, 0n]);
    });
  });

  describe("setLevel / getLevel", function () {
    it("lets the owner set the level and emits WaterLevelSet", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).setLevel(42))
        .to.emit(c, "WaterLevelSet")
        .withArgs(owner.address, 42n);
      expect(await c.getLevel()).to.equal(42n);
    });

    // Documents current behaviour: setLevel has no access control.
    it("lets ANY address set the level (no access control)", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).setLevel(7))
        .to.emit(c, "WaterLevelSet")
        .withArgs(outsider.address, 7n);
      expect(await c.getLevel()).to.equal(7n);
    });

    it("accepts negative levels", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setLevel(-15);
      expect(await c.getLevel()).to.equal(-15n);
    });

    it("accepts int256 extremes", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setLevel(INT256_MAX);
      expect(await c.getLevel()).to.equal(INT256_MAX);
      await c.setLevel(INT256_MIN);
      expect(await c.getLevel()).to.equal(INT256_MIN);
    });

    it("last write wins", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).setLevel(1);
      await c.connect(outsider).setLevel(2);
      expect(await c.getLevel()).to.equal(2n);
    });

    it("is readable by anyone", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.setLevel(9);
      expect(await c.connect(outsider).getLevel()).to.equal(9n);
    });
  });

  describe("setThresholds / getThresholds", function () {
    it("lets the owner set thresholds and emits ThresholdsUpdated", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).setThresholds(10, 90))
        .to.emit(c, "ThresholdsUpdated")
        .withArgs(owner.address, 10n, 90n);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([10n, 90n]);
    });

    it("lets an SOC analyst set thresholds", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).setThresholds(1, 2))
        .to.emit(c, "ThresholdsUpdated")
        .withArgs(analyst.address, 1n, 2n);
    });

    it("reverts for unauthorized callers and leaves thresholds unchanged", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).setThresholds(10, 90)).to.be.revertedWith(ERR_AUTH);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([0n, 0n]);
    });

    it("reverts when min == max", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.setThresholds(5, 5)).to.be.revertedWith(ERR_RANGE);
    });

    it("reverts when min > max", async function () {
      const { c } = await loadFixture(deployFixture);
      await expect(c.setThresholds(9, 3)).to.be.revertedWith(ERR_RANGE);
    });

    it("keeps previous thresholds after a failed update", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setThresholds(2, 8);
      await expect(c.setThresholds(8, 2)).to.be.revertedWith(ERR_RANGE);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([2n, 8n]);
    });

    it("accepts negative thresholds", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setThresholds(-20, -5);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([-20n, -5n]);
    });

    it("accepts the full int256 range", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setThresholds(INT256_MIN, INT256_MAX);
      const [min, max] = await c.getThresholds();
      expect([min, max]).to.deep.equal([INT256_MIN, INT256_MAX]);
    });

    it("is readable by anyone", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.setThresholds(3, 4);
      const [min, max] = await c.connect(outsider).getThresholds();
      expect([min, max]).to.deep.equal([3n, 4n]);
    });

    it("does not validate the level against the thresholds", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.setThresholds(10, 20);
      await expect(c.setLevel(1000)).to.not.be.reverted;
      await expect(c.setLevel(-1000)).to.not.be.reverted;
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes threshold access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).setThresholds(1, 2)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants threshold access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).setThresholds(1, 2)).to.not.be.reverted;
    });
  });
});
