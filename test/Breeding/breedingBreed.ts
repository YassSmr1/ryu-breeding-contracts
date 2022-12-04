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

describe("BreedingFactory Breeding", function () {
  let breedingFactory: BreedingFactory,
    mockErc20: MockErc20,
    mockGen1: MockGen1,
    gen2: RyuGen2;
  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    treasury: SignerWithAddress;
  let nftOwner: number[], nftUser1: number[], legendaryToken: number[];

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

    await mockGen1.connect(owner).mint(1);
    await mockGen1.connect(user1).mint(6);
    await mockErc20
      .connect(owner)
      .approve(breedingFactory.address, ethers.constants.MaxUint256);
    await mockErc20
      .connect(user1)
      .approve(breedingFactory.address, ethers.constants.MaxUint256);
    await mockErc20
      .connect(owner)
      .transfer(user1.address, ethers.utils.parseEther("200000"));

    nftOwner = [1];
    legendaryToken = [2, 3];
    nftUser1 = [4, 5, 6, 7];
  });

  it("User1 should not be able to breed with non owner nft's", async function () {
    await expect(
      breedingFactory.connect(user1).breed(nftOwner[0], nftUser1[0])
    ).to.be.revertedWith("U need to own both of dragons");
  });

  it("User1 should not be able to breed with the same nft's", async function () {
    await expect(
      breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[0])
    ).to.be.revertedWith("U can't breed with same dragons");
  });

  it("User1 should pay 2000 $nryu to breed", async function () {
    const cost = ethers.utils.parseEther("2000");
    const balanceBefore = await mockErc20.balanceOf(user1.address);

    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);

    const balanceAfter = await mockErc20.balanceOf(user1.address);
    expect(balanceAfter).to.be.equal(balanceBefore.sub(cost));
  });

  it("Should emit an event with Breed(user1.address, 4, 5, 1)", async function () {
    await expect(breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]))
      .to.emit(gen2, "Breed")
      .withArgs(user1.address, nftUser1[0], nftUser1[1], 1);
  });

  it("User1 should burn 90% of 2000 $nryu to breed and 10% are sent to treasury", async function () {
    const forTreasury = ethers.utils.parseEther("200");
    const toBurn = ethers.utils.parseEther("1800");
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const treasuryBalanceBefore = await mockErc20.balanceOf(treasury.address);
    const burnAddressBalanceBefore = await mockErc20.balanceOf(burnAddress);

    await breedingFactory.connect(user1).breed(nftUser1[0], nftUser1[1]);

    const treasuryBalanceAfter = await mockErc20.balanceOf(treasury.address);
    const burnAddressBalanceAfter = await mockErc20.balanceOf(burnAddress);

    expect(treasuryBalanceAfter).to.be.equal(
      treasuryBalanceBefore.add(forTreasury)
    );
    expect(burnAddressBalanceAfter).to.be.equal(
      burnAddressBalanceBefore.add(toBurn)
    );
  });

  it("Legendary Breeding with legendary should cost 20 stamina to one and 0 to two", async function () {
    const male = legendaryToken[0];
    const female = legendaryToken[1];

    const staminaBeforeLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaBeforeToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaBeforeLegendaryToken).to.be.equal(0);
    expect(staminaBeforeToken).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const staminaAfterLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaAfterToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaAfterLegendaryToken).to.be.equal(20);
    expect(staminaAfterToken).to.be.equal(0);
  });

  it("Legendary Breeding with legendary should cost 20 stamina to one | checking with view", async function () {
    const male = legendaryToken[0];
    const female = legendaryToken[1];
    await breedingFactory.connect(user1).breed(male, female);
    const staminas = await breedingFactory.getStaminaForTokens([male]);
    expect(staminas[0]).to.be.equal(20);
  });

  it("Legendary Breeding with normal should cost 10 stamina to one and 0 to two", async function () {
    const male = legendaryToken[0];
    const female = nftUser1[1];

    const staminaBeforeLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaBeforeToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaBeforeLegendaryToken).to.be.equal(0);
    expect(staminaBeforeToken).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const staminaAfterLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaAfterToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaAfterLegendaryToken).to.be.equal(10);
    expect(staminaAfterToken).to.be.equal(0);
  });

  it("Normal Breeding with Legendary should cost 20 stamina to one and 0 to two", async function () {
    const male = nftUser1[0];
    const female = legendaryToken[0];

    const staminaBeforeLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaBeforeToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaBeforeLegendaryToken).to.be.equal(0);
    expect(staminaBeforeToken).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const staminaAfterLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaAfterToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaAfterLegendaryToken).to.be.equal(20);
    expect(staminaAfterToken).to.be.equal(0);
  });

  it("Normal Breeding with normal should cost 10 stamina to one and 0 to two", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];

    const staminaBeforeLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaBeforeToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaBeforeLegendaryToken).to.be.equal(0);
    expect(staminaBeforeToken).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const staminaAfterLegendaryToken = await breedingFactory.tokenIdToStamina(
      male
    );
    const staminaAfterToken = await breedingFactory.tokenIdToStamina(female);
    expect(staminaAfterLegendaryToken).to.be.equal(10);
    expect(staminaAfterToken).to.be.equal(0);
  });

  it("A Legendary (30P) can breed 1x with another Legendary (-20P) AND 1x with a Base (-10P)", async function () {
    const male = legendaryToken[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, legendaryToken[1]);
    await breedingFactory.connect(user1).breed(male, nftUser1[0]);

    const staminaAfter = await breedingFactory.tokenIdToStamina(male);
    expect(staminaAfter).to.be.equal(30);
  });

  it("Legendary (30P) can breed 3x with a Base (-30P)", async function () {
    const male = legendaryToken[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, nftUser1[0]);
    await breedingFactory.connect(user1).breed(male, nftUser1[1]);
    await breedingFactory.connect(user1).breed(male, nftUser1[2]);

    const staminaAfter = await breedingFactory.tokenIdToStamina(male);
    expect(staminaAfter).to.be.equal(30);
  });

  it("A Base (20P) can breed 1x with a Legendary (-20P)", async function () {
    const male = nftUser1[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, legendaryToken[0]);

    const staminaAfter = await breedingFactory.tokenIdToStamina(male);
    expect(staminaAfter).to.be.equal(20);
  });

  it("A Base (20P) can breed 2x with another Base (-20P)", async function () {
    const male = nftUser1[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, nftUser1[1]);
    await breedingFactory.connect(user1).breed(male, nftUser1[2]);

    const staminaAfter = await breedingFactory.tokenIdToStamina(male);
    expect(staminaAfter).to.be.equal(20);
  });

  it("A normal should not be able to go up 20 stamina with 1 legendary and 1 base", async function () {
    const male = nftUser1[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, legendaryToken[0]);

    await expect(
      breedingFactory.connect(user1).breed(male, nftUser1[1])
    ).to.be.revertedWith("U dont have enough stamina");
  });

  it("A normal should not be able to go up 20 stamina with 3 base breeding", async function () {
    const male = nftUser1[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, nftUser1[1]);
    await breedingFactory.connect(user1).breed(male, nftUser1[2]);

    await expect(
      breedingFactory.connect(user1).breed(male, nftUser1[3])
    ).to.be.revertedWith("U dont have enough stamina");
  });

  it("A legendary should not be able to go up 30 stamina", async function () {
    const male = legendaryToken[0];
    const staminaBefore = await breedingFactory.tokenIdToStamina(male);
    expect(staminaBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, legendaryToken[1]);
    await breedingFactory.connect(user1).breed(male, nftUser1[0]);

    await expect(
      breedingFactory.connect(user1).breed(male, nftUser1[1])
    ).to.be.revertedWith("U dont have enough stamina");
  });

  it("User 1 should receive one nft after breeding", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const balanceBefore = await gen2.balanceOf(user1.address);
    expect(balanceBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const balanceAfter = await gen2.balanceOf(user1.address);

    expect(balanceAfter).to.be.equal(1);
  });

  it("User 1 should receive one nft after breeding", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const balanceBefore = await gen2.balanceOf(user1.address);
    expect(balanceBefore).to.be.equal(0);

    await breedingFactory.connect(user1).breed(male, female);

    const balanceAfter = await gen2.balanceOf(user1.address);

    expect(balanceAfter).to.be.equal(1);
  });

  it("New token should have an incubation time of 33 days -> eggURI", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const eggURI = "https://ryupng.s3.amazonaws.com/json/egg1.json";
    await breedingFactory.connect(user1).breed(male, female);
    expect(await gen2.tokenURI(1)).to.be.equal(eggURI);
  });

  it("After 11 days the new nft should have the egg phase 2", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const eggURI = "https://ryupng.s3.amazonaws.com/json/egg2.json";
    await breedingFactory.connect(user1).breed(male, female);

    await ethers.provider.send("evm_increaseTime", [11 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await gen2.tokenURI(1)).to.be.equal(eggURI);
  });

  it("After 22 days the new nft should have the egg phase 3", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const eggURI = "https://ryupng.s3.amazonaws.com/json/egg3.json";
    await breedingFactory.connect(user1).breed(male, female);

    await ethers.provider.send("evm_increaseTime", [22 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await gen2.tokenURI(1)).to.be.equal(eggURI);
  });

  it("After 33 days the new nft should have the real uri", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    const realURI = "https://ryu-metadata.herokuapp.com/api/json/1.json";
    await breedingFactory.connect(user1).breed(male, female);

    await ethers.provider.send("evm_increaseTime", [33 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await gen2.tokenURI(1)).to.be.equal(realURI);
  });

  it("Should save the parents of new nft", async function () {
    const male = nftUser1[0];
    const female = nftUser1[1];
    await breedingFactory.connect(user1).breed(male, female);

    expect(await gen2.tokenIdToParents(1, 0)).to.be.equal(male);
    expect(await gen2.tokenIdToParents(1, 1)).to.be.equal(female);
  });
});
