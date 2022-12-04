import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { MockErc20, MockErc20__factory } from "../typechain";
import contractAddress from "../contract-address.json";
import * as readline from "readline";

let mockErc20: MockErc20;
let owner: SignerWithAddress;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  [owner] = await ethers.getSigners();

  const MockErc20 = (await ethers.getContractFactory(
    "MockErc20"
  )) as MockErc20__factory;
  mockErc20 = MockErc20.attach(contractAddress.nRyu);

  rl.question(
    "How much token do you want to approve for breeding factory ? ",
    async (response: string) => {
      rl.close();
      let tx = await mockErc20
        .connect(owner)
        .approve(
          contractAddress.breedingFactory,
          ethers.utils.parseEther(response)
        );
      let receipt = await tx.wait();

      if (!receipt.status || receipt.status !== 1)
        console.error("An error occured during the transaction");

      tx = await mockErc20
        .connect(owner)
        .approve(contractAddress.labs, ethers.utils.parseEther(response));

      receipt = await tx.wait();

      if (receipt.status && receipt.status === 1) {
        console.log(
          "Successfully approved breeding factory && labs to use",
          response,
          "token"
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
