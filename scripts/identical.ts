import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
  Labs,
  Labs__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import contractAddress from "../contract-address.json";
import * as readline from "readline";

let labs: Labs;
let owner: SignerWithAddress;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  [owner] = await ethers.getSigners();

  const Labs = (await ethers.getContractFactory("Labs")) as Labs__factory;
  labs = Labs.attach(contractAddress.labs);

  rl.question(
    "On wich token do u want to use identitcal potions ? ",
    async (firstToken: string) => {
      rl.close();
      const tx = await labs.connect(owner).identicalTwins(parseInt(firstToken));
      const receipt = await tx.wait();

      if (receipt.status && receipt.status === 1) {
        console.log(
          "Successfully used identical potions on this token",
          firstToken
        );
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
