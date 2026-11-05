const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("IoT_Configs", function () {
  const ERR_AUTH = "Unauthorized: Only owner or SOC analysts can access configurations";
  const ERR_NOT_FOUND = "No IoT configuration found for this ID";

  const cfg1 = ["LevelSensor-01", "Sensor", "v1.2.3", "192.168.1.10", "min=1,max=5"];
  const cfg2 = ["Pump-02", "Actuator", "v2.0.0", "192.168.1.20", "pressure<=8bar"];

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IoT_Configs");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  async function withConfigFixture() {
    const base = await deployFixture();
    await base.c.storeIoTConfig(...cfg1);
    return base;
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts with zero devices", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.deviceCount()).to.equal(0n);
      expect(await c.getDeviceCount()).to.equal(0n);
    });
  });

  describe("storeIoTConfig", function () {
    it("lets the owner store a config; first id is 1; emits the event", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).storeIoTConfig(...cfg1))
        .to.emit(c, "IoTConfigStored")
        .withArgs(1n, cfg1[0], owner.address);
      expect(await c.deviceCount()).to.equal(1n);
    });

    it("lets an SOC analyst store a config", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).storeIoTConfig(...cfg1))
        .to.emit(c, "IoTConfigStored")
        .withArgs(1n, cfg1[0], analyst.address);
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).storeIoTConfig(...cfg1)).to.be.revertedWith(ERR_AUTH);
      expect(await c.deviceCount()).to.equal(0n);
    });

    it("assigns sequential ids and keeps configs separate", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await c.storeIoTConfig(...cfg1);
      await expect(c.storeIoTConfig(...cfg2))
        .to.emit(c, "IoTConfigStored")
        .withArgs(2n, cfg2[0], owner.address);
      expect(await c.getDeviceCount()).to.equal(2n);
      expect((await c.getIoTConfig(1)).deviceName).to.equal(cfg1[0]);
      expect((await c.getIoTConfig(2)).deviceName).to.equal(cfg2[0]);
    });

    it("allows empty non-name fields", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeIoTConfig("Dev", "", "", "", "");
      const r = await c.getIoTConfig(1);
      expect(r.deviceName).to.equal("Dev");
      expect(r.deviceType).to.equal("");
      expect(r.operationalThresholds).to.equal("");
    });

    // Documents current behaviour: existence is checked via non-empty deviceName.
    it("increments the count for an empty deviceName, but the config is then unreadable", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeIoTConfig("", "Sensor", "v1", "10.0.0.1", "x");
      expect(await c.deviceCount()).to.equal(1n);
      await expect(c.getIoTConfig(1)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getIoTConfig", function () {
    it("returns all five fields in order for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(withConfigFixture);
      const r1 = await c.connect(owner).getIoTConfig(1);
      expect([r1[0], r1[1], r1[2], r1[3], r1[4]]).to.deep.equal(cfg1);
      const r2 = await c.connect(analyst).getIoTConfig(1);
      expect(r2.deviceName).to.equal(cfg1[0]);
      expect(r2.deviceType).to.equal(cfg1[1]);
      expect(r2.firmwareVersion).to.equal(cfg1[2]);
      expect(r2.ipAddress).to.equal(cfg1[3]);
      expect(r2.operationalThresholds).to.equal(cfg1[4]);
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(withConfigFixture);
      await expect(c.connect(outsider).getIoTConfig(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts for id 0 and ids beyond the count", async function () {
      const { c } = await loadFixture(withConfigFixture);
      await expect(c.getIoTConfig(0)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.getIoTConfig(2)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getDeviceCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(withConfigFixture);
      expect(await c.connect(outsider).getDeviceCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(withConfigFixture);
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).storeIoTConfig(...cfg2)).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getIoTConfig(1)).to.be.revertedWith(ERR_AUTH);
    });
  });
});
