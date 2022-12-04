import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import {
  BreedingFactory,
  MockErc20,
  MockGen1,
  RyuGen2,
  Labs,
  Labs__factory,
  MockErc20__factory,
  MockGen1__factory,
  RyuGen2__factory,
  BreedingFactory__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import fs from "fs";

let breedingFactory: BreedingFactory,
  mockErc20: MockErc20,
  mockGen1: MockGen1,
  labs: Labs,
  gen2: RyuGen2;
let owner: SignerWithAddress;
const treasury = "0xa99FDc265b180FAED22C9219e65f0D1D79A570B5";
let receipt;

async function main() {
  [owner] = await ethers.getSigners();

  const MockErc20 = (await ethers.getContractFactory(
    "MockErc20"
  )) as MockErc20__factory;
  mockErc20 = (await MockErc20.deploy()) as MockErc20;
  await mockErc20.deployed();
  console.log("mockErc20: contract deployed :", mockErc20.address);

  const MockGen1 = (await ethers.getContractFactory(
    "MockGen1"
  )) as MockGen1__factory;
  mockGen1 = (await MockGen1.deploy()) as MockGen1;
  await mockGen1.deployed();
  console.log("mockGen1: contract deployed :", mockGen1.address);

  const Gen2 = (await ethers.getContractFactory("RyuGen2")) as RyuGen2__factory;
  gen2 = (await upgrades.deployProxy(Gen2)) as RyuGen2;
  await gen2.deployed();
  console.log("gen2: contract deployed :", gen2.address);

  const BreedingFactory = (await ethers.getContractFactory(
    "BreedingFactory"
  )) as BreedingFactory__factory;
  breedingFactory = (await upgrades.deployProxy(BreedingFactory, [
    mockErc20.address,
    mockGen1.address,
    gen2.address,
    treasury,
  ])) as BreedingFactory;
  await breedingFactory.deployed();
  console.log("breedingFactory: contract deployed :", breedingFactory.address);

  const Labs = (await ethers.getContractFactory("Labs")) as Labs__factory;
  labs = (await upgrades.deployProxy(Labs, [
    mockErc20.address,
    gen2.address,
    treasury,
  ])) as Labs;
  await labs.deployed();
  console.log("labs: contract deployed :", labs.address);

  receipt = await gen2
    .connect(owner)
    .setBreedingFactory(breedingFactory.address);
  receipt.wait();
  console.log("gen2: breedingMasterIsSet :", breedingFactory.address);

  receipt = await gen2.connect(owner).setLabs(labs.address);
  receipt.wait();
  console.log("gen2: labsIsSet :", labs.address);

  fs.writeFileSync(
    "./contract-address.json",
    JSON.stringify(
      {
        nRyu: mockErc20.address,
        mockGen1: mockGen1.address,
        gen2: gen2.address,
        breedingFactory: breedingFactory.address,
        labs: labs.address,
      },
      null,
      2
    )
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
