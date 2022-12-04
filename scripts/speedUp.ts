import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
  BreedingFactory,
  BreedingFactory__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import contractAddress from "../contract-address.json";
import * as readline from "readline";

let breedingFactory: BreedingFactory;
let owner: SignerWithAddress;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  [owner] = await ethers.getSigners();

  const BreedingFactory = (await ethers.getContractFactory(
    "BreedingFactory"
  )) as BreedingFactory__factory;
  breedingFactory = BreedingFactory.attach(contractAddress.breedingFactory);

  rl.question(
    "Wich token do u want to speed up ? ",
    async (firstToken: string) => {
      rl.close();
      const tx = await breedingFactory
        .connect(owner)
        .speedUp(parseInt(firstToken));
      const receipt = await tx.wait();

      if (receipt.status && receipt.status === 1) {
        console.log("Successfully speeded-up token", firstToken);
      } else {
        console.error("An error occured during the transaction");
      }
    }
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
