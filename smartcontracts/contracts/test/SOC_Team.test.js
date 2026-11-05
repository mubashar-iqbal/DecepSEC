const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("SOC_Team", function () {
  const ERR_ONLY_OWNER = "Unauthorized: Only owner can perform this action";
  const ERR_ALREADY = "Analyst is already authorized";
  const ERR_NOT_AUTH = "Analyst is not authorized";

  async function deployFixture() {
    const [owner, analyst1, analyst2, outsider] = await ethers.getSigners();
    const SOC = await ethers.getContractFactory("SOC_Team");
    const soc = await SOC.deploy();
    await soc.waitForDeployment();
    return { soc, owner, analyst1, analyst2, outsider };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { soc, owner } = await loadFixture(deployFixture);
      expect(await soc.owner()).to.equal(owner.address);
    });

    it("does not register the owner as an analyst by default", async function () {
      const { soc, owner } = await loadFixture(deployFixture);
      expect(await soc.isSOCAnalyst(owner.address)).to.equal(false);
    });

    it("reports no analysts for arbitrary addresses initially", async function () {
      const { soc, analyst1, outsider } = await loadFixture(deployFixture);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
      expect(await soc.isSOCAnalyst(outsider.address)).to.equal(false);
      expect(await soc.isSOCAnalyst(ethers.ZeroAddress)).to.equal(false);
    });

    it("uses the deployer as owner when deployed by a different account", async function () {
      const { analyst1 } = await loadFixture(deployFixture);
      const SOC = await ethers.getContractFactory("SOC_Team", analyst1);
      const soc = await SOC.deploy();
      expect(await soc.owner()).to.equal(analyst1.address);
    });

    it("exposes no ownership-transfer or renounce function", async function () {
      const { soc } = await loadFixture(deployFixture);
      expect(soc.interface.hasFunction("transferOwnership")).to.equal(false);
      expect(soc.interface.hasFunction("renounceOwnership")).to.equal(false);
    });
  });

  describe("addSOCAnalyst", function () {
    it("lets the owner add an analyst", async function () {
      const { soc, owner, analyst1 } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
    });

    it("emits SOCAnalystAdded with the analyst address", async function () {
      const { soc, owner, analyst1 } = await loadFixture(deployFixture);
      await expect(soc.connect(owner).addSOCAnalyst(analyst1.address))
        .to.emit(soc, "SOCAnalystAdded")
        .withArgs(analyst1.address);
    });

    it("reverts when called by a non-owner", async function () {
      const { soc, analyst1, outsider } = await loadFixture(deployFixture);
      await expect(
        soc.connect(outsider).addSOCAnalyst(analyst1.address)
      ).to.be.revertedWith(ERR_ONLY_OWNER);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
    });

    it("reverts when called by an existing analyst (analysts are not owners)", async function () {
      const { soc, owner, analyst1, analyst2 } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      await expect(
        soc.connect(analyst1).addSOCAnalyst(analyst2.address)
      ).to.be.revertedWith(ERR_ONLY_OWNER);
    });

    it("reverts when adding an address that is already an analyst", async function () {
      const { soc, owner, analyst1 } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      await expect(
        soc.connect(owner).addSOCAnalyst(analyst1.address)
      ).to.be.revertedWith(ERR_ALREADY);
    });

    it("does not emit an event on a failed duplicate add", async function () {
      const { soc, owner, analyst1 } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      await expect(
        soc.connect(owner).addSOCAnalyst(analyst1.address)
      ).to.not.emit(soc, "SOCAnalystAdded");
    });

    it("adds multiple analysts independently", async function () {
      const { soc, owner, analyst1, analyst2, outsider } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      await soc.connect(owner).addSOCAnalyst(analyst2.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
      expect(await soc.isSOCAnalyst(analyst2.address)).to.equal(true);
      expect(await soc.isSOCAnalyst(outsider.address)).to.equal(false);
    });

    it("allows the owner to register themselves as an analyst", async function () {
      const { soc, owner } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(owner.address);
      expect(await soc.isSOCAnalyst(owner.address)).to.equal(true);
    });

    // Documents current behaviour: there is no zero-address check.
    it("currently accepts the zero address as an analyst (no input validation)", async function () {
      const { soc, owner } = await loadFixture(deployFixture);
      await expect(soc.connect(owner).addSOCAnalyst(ethers.ZeroAddress))
        .to.emit(soc, "SOCAnalystAdded")
        .withArgs(ethers.ZeroAddress);
      expect(await soc.isSOCAnalyst(ethers.ZeroAddress)).to.equal(true);
    });
  });

  describe("removeSOCAnalyst", function () {
    async function withAnalystFixture() {
      const base = await deployFixture();
      await base.soc.connect(base.owner).addSOCAnalyst(base.analyst1.address);
      return base;
    }

    it("lets the owner remove an analyst", async function () {
      const { soc, owner, analyst1 } = await loadFixture(withAnalystFixture);
      await soc.connect(owner).removeSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
    });

    it("emits SOCAnalystRemoved with the analyst address", async function () {
      const { soc, owner, analyst1 } = await loadFixture(withAnalystFixture);
      await expect(soc.connect(owner).removeSOCAnalyst(analyst1.address))
        .to.emit(soc, "SOCAnalystRemoved")
        .withArgs(analyst1.address);
    });

    it("reverts when called by a non-owner", async function () {
      const { soc, analyst1, outsider } = await loadFixture(withAnalystFixture);
      await expect(
        soc.connect(outsider).removeSOCAnalyst(analyst1.address)
      ).to.be.revertedWith(ERR_ONLY_OWNER);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
    });

    it("prevents an analyst from removing themselves or others", async function () {
      const { soc, owner, analyst1, analyst2 } = await loadFixture(withAnalystFixture);
      await soc.connect(owner).addSOCAnalyst(analyst2.address);
      await expect(
        soc.connect(analyst1).removeSOCAnalyst(analyst1.address)
      ).to.be.revertedWith(ERR_ONLY_OWNER);
      await expect(
        soc.connect(analyst1).removeSOCAnalyst(analyst2.address)
      ).to.be.revertedWith(ERR_ONLY_OWNER);
    });

    it("reverts when removing an address that is not an analyst", async function () {
      const { soc, owner, outsider } = await loadFixture(withAnalystFixture);
      await expect(
        soc.connect(owner).removeSOCAnalyst(outsider.address)
      ).to.be.revertedWith(ERR_NOT_AUTH);
    });

    it("reverts on a second removal of the same analyst", async function () {
      const { soc, owner, analyst1 } = await loadFixture(withAnalystFixture);
      await soc.connect(owner).removeSOCAnalyst(analyst1.address);
      await expect(
        soc.connect(owner).removeSOCAnalyst(analyst1.address)
      ).to.be.revertedWith(ERR_NOT_AUTH);
    });

    it("only affects the targeted analyst", async function () {
      const { soc, owner, analyst1, analyst2 } = await loadFixture(withAnalystFixture);
      await soc.connect(owner).addSOCAnalyst(analyst2.address);
      await soc.connect(owner).removeSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
      expect(await soc.isSOCAnalyst(analyst2.address)).to.equal(true);
    });

    it("allows re-adding an analyst after removal", async function () {
      const { soc, owner, analyst1 } = await loadFixture(withAnalystFixture);
      await soc.connect(owner).removeSOCAnalyst(analyst1.address);
      await expect(soc.connect(owner).addSOCAnalyst(analyst1.address))
        .to.emit(soc, "SOCAnalystAdded")
        .withArgs(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
    });

    it("does not let the owner lose ownership by removing themselves as analyst", async function () {
      const { soc, owner } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(owner.address);
      await soc.connect(owner).removeSOCAnalyst(owner.address);
      expect(await soc.owner()).to.equal(owner.address);
      expect(await soc.isSOCAnalyst(owner.address)).to.equal(false);
    });
  });

  describe("isSOCAnalyst", function () {
    it("is callable by anyone and does not change state", async function () {
      const { soc, owner, analyst1, outsider } = await loadFixture(deployFixture);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      expect(await soc.connect(outsider).isSOCAnalyst(analyst1.address)).to.equal(true);
      expect(await soc.connect(outsider).isSOCAnalyst(outsider.address)).to.equal(false);
    });

    it("reflects the full add -> remove -> add lifecycle", async function () {
      const { soc, owner, analyst1 } = await loadFixture(deployFixture);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
      await soc.connect(owner).removeSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(false);
      await soc.connect(owner).addSOCAnalyst(analyst1.address);
      expect(await soc.isSOCAnalyst(analyst1.address)).to.equal(true);
    });
  });
});
