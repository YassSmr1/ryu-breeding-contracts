import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
// import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
// import { BigNumber } from "ethers";
import {
  BreedingFactory,
  MockErc20,
  MockGen1,
  RyuGen2,
  MockErc20__factory,
  MockGen1__factory,
  RyuGen2__factory,
  BreedingFactory__factory,
  Labs,
  Labs__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain";

describe("Labs: Initialization", function () {
  let breedingFactory: BreedingFactory,
    labs: Labs,
    mockErc20: MockErc20,
    mockGen1: MockGen1,
    gen2: RyuGen2;
  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    treasury: SignerWithAddress;

  const FRATERNAL = 0;
  const STRIP_DOWN = 1;
  const IDENTICAL = 2;

  beforeEach(async () => {
    [owner, user1, treasury] = await ethers.getSigners();

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

    const Labs = (await ethers.getContractFactory("Labs")) as Labs__factory;
    labs = (await upgrades.deployProxy(Labs, [
      mockGen1.address,
      gen2.address,
      treasury.address,
    ])) as Labs;
    await labs.deployed();

    await gen2.connect(owner).addBreedingFactory(breedingFactory.address);
    await gen2.connect(owner).addLabs(labs.address);

    await mockGen1.connect(owner).mint(2);
    await mockGen1.connect(user1).mint(5);
    await mockErc20
      .connect(owner)
      .approve(breedingFactory.address, ethers.constants.MaxUint256);
    await mockErc20
      .connect(user1)
      .approve(breedingFactory.address, ethers.constants.MaxUint256);
    await mockErc20
      .connect(owner)
      .transfer(user1.address, ethers.utils.parseEther("200000"));
  });

  it("All potions should have 60% costs burned", async function () {
    const expected = 6000;
    expect(await labs.bpBurned()).to.be.equal(expected);
  });

  it("Fraternal potions : cost should be 7500 nryu", async function () {
    const expected = ethers.utils.parseEther("7500");
    expect(await labs.costs(FRATERNAL)).to.be.equal(expected);
  });

  it("Fraternal potions : max usages should be 3000", async function () {
    const expected = 3000;
    expect(await labs.maxUsages(FRATERNAL)).to.be.equal(expected);
  });

  it("StripDown potions : cost should be 5000 nryu", async function () {
    const expected = ethers.utils.parseEther("5000");
    expect(await labs.costs(STRIP_DOWN)).to.be.equal(expected);
  });

  it("StripDown potions : max usages should be 1000", async function () {
    const expected = 1000;
    expect(await labs.maxUsages(STRIP_DOWN)).to.be.equal(expected);
  });

  it("Identical potions : cost should be 15000 nryu", async function () {
    const expected = ethers.utils.parseEther("15000");
    expect(await labs.costs(IDENTICAL)).to.be.equal(expected);
  });

  it("Identical potions : max usages should be 2500", async function () {
    const expected = 2500;
    expect(await labs.maxUsages(IDENTICAL)).to.be.equal(expected);
  });
});
