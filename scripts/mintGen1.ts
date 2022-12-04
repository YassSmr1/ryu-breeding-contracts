import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import {
  MockGen1,
  MockGen1__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import contractAddress from "../contract-address.json";
import * as readline from "readline";

let mockGen1: MockGen1;
let owner: SignerWithAddress;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  [owner] = await ethers.getSigners();

  const MockGen1 = (await ethers.getContractFactory(
    "MockGen1"
  )) as MockGen1__factory;
  mockGen1 = MockGen1.attach(contractAddress.mockGen1);

  rl.question(
    "How many tokens do you want to mint ? ",
    async (amount: string) => {
      rl.close();
      const tx = await mockGen1.connect(owner).mint(parseInt(amount));
      const receipt = await tx.wait();

      if (receipt.status && receipt.status === 1) {
        console.log("Successfully minted", amount, "token(s) to owner");
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
