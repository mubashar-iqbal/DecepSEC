const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Deception_Data", function () {
  const ERR_AUTH = "Unauthorized: Only owner or SOC analysts can access deception data";
  const ERR_NOT_FOUND = "No deception data found for this ID";

  async function deployFixture() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Deception_Data");
    const c = await Factory.deploy();
    await c.addSOCAnalyst(analyst.address);
    return { c, owner, analyst, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner and starts empty", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      expect(await c.owner()).to.equal(owner.address);
      expect(await c.deceptionDataCount()).to.equal(0n);
      expect(await c.getDeceptionDataCount()).to.equal(0n);
    });
  });

  describe("storeDeceptionData", function () {
    it("lets the owner store data; first id is 1 (one-indexed)", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.connect(owner).storeDeceptionData("fake-pump-telemetry"))
        .to.emit(c, "DeceptionDataStored")
        .withArgs(1n, "fake-pump-telemetry", owner.address);
      expect(await c.deceptionDataCount()).to.equal(1n);
    });

    it("lets an SOC analyst store data", async function () {
      const { c, analyst } = await loadFixture(deployFixture);
      await expect(c.connect(analyst).storeDeceptionData("d1"))
        .to.emit(c, "DeceptionDataStored")
        .withArgs(1n, "d1", analyst.address);
    });

    it("reverts for unauthorized callers and does not change the count", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await expect(c.connect(outsider).storeDeceptionData("x")).to.be.revertedWith(ERR_AUTH);
      expect(await c.deceptionDataCount()).to.equal(0n);
    });

    it("assigns sequential ids", async function () {
      const { c, owner } = await loadFixture(deployFixture);
      await expect(c.storeDeceptionData("a")).to.emit(c, "DeceptionDataStored").withArgs(1n, "a", owner.address);
      await expect(c.storeDeceptionData("b")).to.emit(c, "DeceptionDataStored").withArgs(2n, "b", owner.address);
      await expect(c.storeDeceptionData("c")).to.emit(c, "DeceptionDataStored").withArgs(3n, "c", owner.address);
      expect(await c.getDeceptionDataCount()).to.equal(3n);
    });

    it("allows duplicate data as separate entries", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeDeceptionData("dup");
      await c.storeDeceptionData("dup");
      expect(await c.getDeceptionData(1)).to.equal("dup");
      expect(await c.getDeceptionData(2)).to.equal("dup");
    });

    // Documents current behaviour: existence is checked via non-empty string.
    it("increments the count for an empty string, but the entry is then unreadable", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeDeceptionData("");
      expect(await c.deceptionDataCount()).to.equal(1n);
      await expect(c.getDeceptionData(1)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getDeceptionData", function () {
    it("returns stored data for owner and analyst", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.storeDeceptionData("alpha");
      await c.storeDeceptionData("beta");
      expect(await c.connect(owner).getDeceptionData(1)).to.equal("alpha");
      expect(await c.connect(analyst).getDeceptionData(2)).to.equal("beta");
    });

    it("reverts for unauthorized callers", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.storeDeceptionData("alpha");
      await expect(c.connect(outsider).getDeceptionData(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("reverts for id 0 and ids beyond the count", async function () {
      const { c } = await loadFixture(deployFixture);
      await c.storeDeceptionData("alpha");
      await expect(c.getDeceptionData(0)).to.be.revertedWith(ERR_NOT_FOUND);
      await expect(c.getDeceptionData(2)).to.be.revertedWith(ERR_NOT_FOUND);
    });
  });

  describe("getDeceptionDataCount", function () {
    it("is publicly readable", async function () {
      const { c, outsider } = await loadFixture(deployFixture);
      await c.storeDeceptionData("alpha");
      expect(await c.connect(outsider).getDeceptionDataCount()).to.equal(1n);
    });
  });

  describe("Role changes (inherited from SOC_Team)", function () {
    it("revokes access when an analyst is removed", async function () {
      const { c, owner, analyst } = await loadFixture(deployFixture);
      await c.connect(analyst).storeDeceptionData("alpha");
      await c.connect(owner).removeSOCAnalyst(analyst.address);
      await expect(c.connect(analyst).storeDeceptionData("beta")).to.be.revertedWith(ERR_AUTH);
      await expect(c.connect(analyst).getDeceptionData(1)).to.be.revertedWith(ERR_AUTH);
    });

    it("grants access to a newly added analyst", async function () {
      const { c, owner, outsider } = await loadFixture(deployFixture);
      await c.connect(owner).addSOCAnalyst(outsider.address);
      await expect(c.connect(outsider).storeDeceptionData("gamma")).to.not.be.reverted;
    });
  });
});
