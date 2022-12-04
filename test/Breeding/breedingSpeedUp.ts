import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
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

describe("BreedingFactory Speed UP", function () {
  let breedingFactory: BreedingFactory,
    mockErc20: MockErc20,
    mockGen1: MockGen1,
    gen2: RyuGen2;
  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    treasury: SignerWithAddress;
  let nftOwner: number[],
    nftUser1: number[],
    gen2tokenUser1: BigNumber[],
    gen2tokenOwner: BigNumber[];
  let gen2time: number;

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

    await gen2.connect(owner).addBreedingFactory(breedingFactory.address);

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

    nftOwner = [1, 2];
    nftUser1 = [3, 4, 5, 6, 7];

    await breedingFactory.connect(owner).breed(nftOwner[0], nftOwner[1]);
    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);
    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);

    gen2tokenUser1 = (await gen2.walletOfOwner(user1.address)).map(
      (elem) => elem.id
    );
    gen2tokenOwner = (await gen2.walletOfOwner(owner.address)).map(
      (elem) => elem.id
    );
    gen2time = (
      await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
    ).timestamp;
  });

  it("User 1 should pay 3300 $nryu for first speed up", async function () {
    const cost = ethers.utils.parseEther("3300");
    const balanceBefore = await mockErc20.balanceOf(user1.address);

    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);

    const balanceAfter = await mockErc20.balanceOf(user1.address);
    expect(balanceAfter).to.be.equal(balanceBefore.sub(cost));
  });

  it("User 1 should pay 5500 $nryu for second speed up", async function () {
    const cost = ethers.utils.parseEther("5500");
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    const balanceBefore = await mockErc20.balanceOf(user1.address);

    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    const balanceAfter = await mockErc20.balanceOf(user1.address);
    expect(balanceAfter).to.be.equal(balanceBefore.sub(cost));
  });

  it("Should burn 3300 $nryu for first speed up", async function () {
    const burnedAmount = ethers.utils.parseEther("3300");
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const balanceBefore = await mockErc20.balanceOf(burnAddress);

    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);

    const balanceAfter = await mockErc20.balanceOf(burnAddress);
    expect(balanceAfter).to.be.equal(balanceBefore.add(burnedAmount));
  });

  it("Should burn 5500 $nryu for second speed up", async function () {
    const burnedAmount = ethers.utils.parseEther("5500");
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    const balanceBefore = await mockErc20.balanceOf(burnAddress);
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    const balanceAfter = await mockErc20.balanceOf(burnAddress);
    expect(balanceAfter).to.be.equal(balanceBefore.add(burnedAmount));
  });

  it("Time should be splited by two after the first speed up : 33 days => 16.5 days", async function () {
    const timeBefore = await gen2.tokenIdToIncubationEnd(gen2tokenUser1[0]);
    const expectedTime =
      gen2time + timeBefore.sub(gen2time).div(2).toNumber() + 1;

    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);

    const timeAfter = await gen2.tokenIdToIncubationEnd(gen2tokenUser1[0]);

    expect(timeAfter).to.be.equal(expectedTime);
  });

  it("Time should be splited by 4 after the first speed up : 16.5 days => 8.25 days", async function () {
    const timeBefore = await gen2.tokenIdToIncubationEnd(gen2tokenUser1[0]);
    const expectedTime = BigNumber.from(gen2time).add(
      timeBefore.sub(gen2time).div(4)
    );

    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);

    const timeAfter = await gen2.tokenIdToIncubationEnd(gen2tokenUser1[0]);

    expect(timeAfter).to.be.equal(expectedTime.add(2));
  });

  it("Should be not allowed to speed up 3 times", async function () {
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);
    await breedingFactory.connect(user1).speedUp(gen2tokenUser1[0]);

    await expect(
      breedingFactory.connect(user1).speedUp(gen2tokenUser1[0])
    ).to.be.revertedWith("Speed up limit reached");
  });

  it("Should be not allowed to speed up an nft that i dont own", async function () {
    await expect(
      breedingFactory.connect(user1).speedUp(gen2tokenOwner[0])
    ).to.be.revertedWith("Owner only endpoint");
  });

  it("Should be not allowed to speed up a drake already alive", async function () {
    await ethers.provider.send("evm_increaseTime", [33 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(
      breedingFactory.connect(user1).speedUp(gen2tokenUser1[0])
    ).to.be.revertedWith("Drake is already alive");
  });
});
