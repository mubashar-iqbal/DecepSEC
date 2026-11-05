const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  impersonateAccount,
  stopImpersonatingAccount,
  setBalance,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Process_Stage", function () {
  const ERR_OWNER_ONLY = "Unauthorized: Only owner can perform this action";
  const ERR_AUTH = "Access denied: Not authorized";

  async function deployFixture() {
    const [deployer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Process_Stage");
    const stage = await Factory.deploy();
    await stage.waitForDeployment();

    const tankAddr = await stage.tankAddr();
    const sensorAddr = await stage.levelSensorAddr();
    const tank = await ethers.getContractAt("Tank", tankAddr);
    const sensor = await ethers.getContractAt("LevelSensor", sensorAddr);
    return { stage, tank, sensor, tankAddr, sensorAddr, deployer, other };
  }

  describe("Deployment", function () {
    it("deploys child Tank and LevelSensor contracts with valid addresses", async function () {
      const { tankAddr, sensorAddr } = await loadFixture(deployFixture);
      expect(ethers.isAddress(tankAddr)).to.equal(true);
      expect(ethers.isAddress(sensorAddr)).to.equal(true);
      expect(tankAddr).to.not.equal(ethers.ZeroAddress);
      expect(sensorAddr).to.not.equal(ethers.ZeroAddress);
      expect(tankAddr).to.not.equal(sensorAddr);
    });

    it("has contract code at both child addresses", async function () {
      const { tankAddr, sensorAddr } = await loadFixture(deployFixture);
      expect(await ethers.provider.getCode(tankAddr)).to.not.equal("0x");
      expect(await ethers.provider.getCode(sensorAddr)).to.not.equal("0x");
    });

    it("gives each Process_Stage deployment its own distinct children", async function () {
      const a = await deployFixture();
      const Factory = await ethers.getContractFactory("Process_Stage");
      const stage2 = await Factory.deploy();
      expect(await stage2.tankAddr()).to.not.equal(a.tankAddr);
      expect(await stage2.levelSensorAddr()).to.not.equal(a.sensorAddr);
    });
  });

  describe("getChildContractAddresses", function () {
    it("returns (tankAddr, levelSensorAddr) in that order", async function () {
      const { stage, tankAddr, sensorAddr } = await loadFixture(deployFixture);
      const [t, s] = await stage.getChildContractAddresses();
      expect(t).to.equal(tankAddr);
      expect(s).to.equal(sensorAddr);
    });

    it("matches the public getters and is callable by anyone", async function () {
      const { stage, other } = await loadFixture(deployFixture);
      const [t, s] = await stage.connect(other).getChildContractAddresses();
      expect(t).to.equal(await stage.tankAddr());
      expect(s).to.equal(await stage.levelSensorAddr());
    });
  });

  describe("Child Tank", function () {
    it("is usable with its initial state", async function () {
      const { tank } = await loadFixture(deployFixture);
      expect(await tank.getLevel()).to.equal(0n);
      const [min, max] = await tank.getThresholds();
      expect([min, max]).to.deep.equal([0n, 0n]);
    });

    it("is owned by the Process_Stage contract, not the deployer", async function () {
      const { tank, stage, deployer } = await loadFixture(deployFixture);
      expect(await tank.owner()).to.equal(await stage.getAddress());
      expect(await tank.owner()).to.not.equal(deployer.address);
    });

    it("lets any account set the level (setLevel is unrestricted)", async function () {
      const { tank, other } = await loadFixture(deployFixture);
      await tank.connect(other).setLevel(12);
      expect(await tank.getLevel()).to.equal(12n);
    });

    // Documents current behaviour: the deployer cannot administer the child.
    it("rejects threshold changes and analyst management from the deployer", async function () {
      const { tank, deployer, other } = await loadFixture(deployFixture);
      await expect(tank.connect(deployer).setThresholds(1, 10)).to.be.revertedWith(ERR_AUTH);
      await expect(tank.connect(deployer).addSOCAnalyst(other.address)).to.be.revertedWith(ERR_OWNER_ONLY);
    });

    it("can only be administered by the Process_Stage address itself", async function () {
      const { tank, stage } = await loadFixture(deployFixture);
      const stageAddr = await stage.getAddress();
      await impersonateAccount(stageAddr);
      await setBalance(stageAddr, ethers.parseEther("1"));
      const stageSigner = await ethers.getSigner(stageAddr);

      await expect(tank.connect(stageSigner).setThresholds(1, 10))
        .to.emit(tank, "ThresholdsUpdated")
        .withArgs(stageAddr, 1n, 10n);
      const [min, max] = await tank.getThresholds();
      expect([min, max]).to.deep.equal([1n, 10n]);

      await stopImpersonatingAccount(stageAddr);
    });
  });

  describe("Child LevelSensor", function () {
    it("is usable with its default thresholds (1, 5)", async function () {
      const { sensor } = await loadFixture(deployFixture);
      const [min, max] = await sensor.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([1n, 5n]);
    });

    it("is owned by the Process_Stage contract, not the deployer", async function () {
      const { sensor, stage, deployer } = await loadFixture(deployFixture);
      expect(await sensor.owner()).to.equal(await stage.getAddress());
      expect(await sensor.owner()).to.not.equal(deployer.address);
    });

    // Documents current behaviour: the deployer cannot administer the child.
    it("rejects threshold changes and analyst management from the deployer", async function () {
      const { sensor, deployer, other } = await loadFixture(deployFixture);
      await expect(sensor.connect(deployer).setWaterLevelThresholds(2, 8)).to.be.revertedWith(ERR_AUTH);
      await expect(sensor.connect(deployer).addSOCAnalyst(other.address)).to.be.revertedWith(ERR_OWNER_ONLY);
    });

    it("can only be administered by the Process_Stage address itself", async function () {
      const { sensor, stage } = await loadFixture(deployFixture);
      const stageAddr = await stage.getAddress();
      await impersonateAccount(stageAddr);
      await setBalance(stageAddr, ethers.parseEther("1"));
      const stageSigner = await ethers.getSigner(stageAddr);

      await expect(sensor.connect(stageSigner).setWaterLevelThresholds(2, 8))
        .to.emit(sensor, "ThresholdUpdated")
        .withArgs(2n, 8n, stageAddr);
      const [min, max] = await sensor.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([2n, 8n]);

      await stopImpersonatingAccount(stageAddr);
    });
  });

  describe("Child independence", function () {
    it("keeps Tank and LevelSensor state separate", async function () {
      const { tank, sensor } = await loadFixture(deployFixture);
      await tank.setLevel(99);
      const [min, max] = await sensor.getWaterLevelThresholds();
      expect([min, max]).to.deep.equal([1n, 5n]);
      expect(await tank.getLevel()).to.equal(99n);
    });
  });
});
