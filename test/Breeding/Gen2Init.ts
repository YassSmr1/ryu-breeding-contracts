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

describe("Gen 2 Init", function () {
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

  it("Only breeding factory can use gen2 speedUp endpoint", async function () {
    await expect(
      gen2.connect(owner).speedUpIncubationTime(1)
    ).to.be.revertedWith("Not Breeding Factory");
  });

  it("Only breeding factory can use gen2 mint endpoint", async function () {
    await expect(
      gen2.connect(owner).mint(owner.address, 168000, 1, 1, 2)
    ).to.be.revertedWith("Not Breeding Factory");
  });
});
