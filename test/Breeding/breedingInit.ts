import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  BreedingFactory,
  MockErc20,
  MockGen1,
  RyuGen2,
  MockErc20__factory,
  MockGen1__factory,
  RyuGen2__factory,
  BreedingFactory__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain";

describe("BreedingFactory Initialization", function () {
  let breedingFactory: BreedingFactory,
    mockErc20: MockErc20,
    mockGen1: MockGen1,
    gen2: RyuGen2;
  let owner: SignerWithAddress, treasury: SignerWithAddress;

  beforeEach(async () => {
    [owner, treasury] = await ethers.getSigners();

    const MockErc20 = (await ethers.getContractFactory(
      "MockErc20"
    )) as MockErc20__factory;
    mockErc20 = (await MockErc20.deploy()) as MockErc20;
    await mockErc20.deployed();

    const MockGen1 = (await ethers.getContractFactory(
      "MockGen1"
    )) as MockGen1__factory;
    mockGen1 = (await MockGen1.deploy()) as MockGen1;
    await mockGen1.deployed();

    const Gen2 = (await ethers.getContractFactory(
      "RyuGen2"
    )) as RyuGen2__factory;
    gen2 = (await upgrades.deployProxy(Gen2)) as RyuGen2;
    await gen2.deployed();

    const BreedingFactory = (await ethers.getContractFactory(
      "BreedingFactory"
    )) as BreedingFactory__factory;
    breedingFactory = (await upgrades.deployProxy(BreedingFactory, [
      mockErc20.address,
      mockGen1.address,
      gen2.address,
      treasury.address,
    ])) as BreedingFactory;
    await breedingFactory.deployed();

    await gen2.connect(owner).addBreedingFactory(breedingFactory.address);
  });

  it("Should have breeding cost at 2000 $nRyu burned", async function () {
    expect(await breedingFactory.breedingCost()).to.equal(
      ethers.utils.parseEther("2000")
    );
  });

  it("Should have % of breeding cost burned at 90% $nRyu", async function () {
    expect(await breedingFactory.bpBreedingCostBurned()).to.equal(9000);
  });

  it("Should have first speed up cost at 3300 $nRyu", async function () {
    expect(await breedingFactory.speedUpCost()).to.equal(
      ethers.utils.parseEther("3300")
    );
  });

  it("Should have second speed up cost at 5500 $nRyu", async function () {
    expect(await breedingFactory.secondSpeedUpCost()).to.equal(
      ethers.utils.parseEther("5500")
    );
  });

  it("Should have stamina cost for normal dragons at 10", async function () {
    expect(await breedingFactory.breedingStaminaCostBase()).to.equal(10);
  });

  it("Should have stamina cost for legendary dragons at 20", async function () {
    expect(await breedingFactory.breedingStaminaCostLegendary()).to.equal(20);
  });

  it("Should have incubation time at 33 days", async function () {
    expect(await breedingFactory.incubationTime()).to.equal(33 * 24 * 60 * 60);
  });
});
