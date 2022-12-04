import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  BreedingFactory,
  MockErc20,
  MockGen1,
  RyuGen2,
  Labs,
  MockErc20__factory,
  MockGen1__factory,
  RyuGen2__factory,
  BreedingFactory__factory,
  Labs__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain";

describe("Labs: Strip Down Potions", function () {
  let breedingFactory: BreedingFactory,
    labs: Labs,
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
      mockErc20.address,
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
      .approve(labs.address, ethers.constants.MaxUint256);
    await mockErc20
      .connect(user1)
      .approve(labs.address, ethers.constants.MaxUint256);

    await mockErc20
      .connect(owner)
      .transfer(user1.address, ethers.utils.parseEther("200000"));

    nftOwner = [1, 2];
    nftUser1 = [3, 4, 5, 6, 7];

    await breedingFactory.connect(owner).breed(nftOwner[0], nftOwner[1]);
    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);
    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);
    await breedingFactory.connect(user1).breed(nftUser1[1], nftUser1[2]);
    await breedingFactory.connect(user1).breed(nftUser1[2], nftUser1[3]);
    await ethers.provider.send("evm_increaseTime", [33 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await breedingFactory.connect(user1).breed(nftUser1[1], nftUser1[3]);

    gen2tokenUser1 = (await gen2.walletOfOwner(user1.address)).map(
      (elem) => elem.id
    );
    gen2tokenOwner = (await gen2.walletOfOwner(owner.address)).map(
      (elem) => elem.id
    );
  });

  it("User 1 should pay 5000 $nryu for stripdown function", async function () {
    const cost = ethers.utils.parseEther("5000");
    const balanceBefore = await mockErc20.balanceOf(user1.address);

    await labs.connect(user1).stripDown(gen2tokenUser1[0]);

    const balanceAfter = await mockErc20.balanceOf(user1.address);
    expect(balanceAfter).to.be.equal(balanceBefore.sub(cost));
  });

  it("Should burn 3000 $nryu for stripdown function usage", async function () {
    const burnedAmount = ethers.utils.parseEther("3000");
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const balanceBefore = await mockErc20.balanceOf(burnAddress);

    await labs.connect(user1).stripDown(gen2tokenUser1[0]);

    const balanceAfter = await mockErc20.balanceOf(burnAddress);
    expect(balanceAfter).to.be.equal(balanceBefore.add(burnedAmount));
  });

  it("Should send 2000 $nryu for function usage to treasury wallet", async function () {
    const expected = ethers.utils.parseEther("2000");
    const balanceBefore = await mockErc20.balanceOf(treasury.address);

    await labs.connect(user1).stripDown(gen2tokenUser1[0]);

    const balanceAfter = await mockErc20.balanceOf(treasury.address);
    expect(balanceAfter).to.be.equal(balanceBefore.add(expected));
  });

  it("Should be not allowed to use stripdown on an nft that i dont own", async function () {
    await expect(
      labs.connect(user1).stripDown(gen2tokenOwner[0])
    ).to.be.revertedWith("Owner only endpoint");
  });

  it("Should be not allowed to use stripdown potions twice on an nft with same parents", async function () {
    await labs.connect(user1).stripDown(gen2tokenUser1[0]);
    await expect(
      labs.connect(user1).stripDown(gen2tokenUser1[1])
    ).to.be.revertedWith("Already used on these parents");
  });

  it("Should correctly display strip down as non usuable", async function () {
    await labs.connect(user1).stripDown(gen2tokenUser1[0]);
    const usages = await labs.getPotionsUsageForToken(gen2tokenUser1[0]);
    expect(usages[1]).to.equal(false);
  });

  it("Should be not allowed to use stripdown twice on the same nft", async function () {
    await labs.connect(user1).stripDown(gen2tokenUser1[0]);
    await expect(
      labs.connect(user1).stripDown(gen2tokenUser1[0])
    ).to.be.revertedWith("Already used on these parents");
  });

  it("Should be used only on hacthed eggs", async function () {
    await expect(
      labs.connect(user1).stripDown(gen2tokenUser1[gen2tokenUser1.length - 1])
    ).to.be.revertedWith("Only on hatched eggs");
  });

  it("Should emit an event with StripDown(user1.address, tokenIdGen2)", async function () {
    await expect(labs.connect(user1).stripDown(gen2tokenUser1[0]))
      .to.emit(labs, "StripDown")
      .withArgs(user1.address, gen2tokenUser1[0]);
  });
});
