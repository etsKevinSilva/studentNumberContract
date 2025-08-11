import Web3 from "web3";
import type { AbiItem } from "web3-utils";
import path from "path";

async function main(): Promise<void> {
  // 1) Connect to Ganache RPC
  const web3 = new Web3("http://127.0.0.1:7545");

  // 2) Load the compiled artifact
  const artifact = require(path.resolve(
    __dirname,
    "..",
    "build",
    "contracts",
    "StudentContract.json"
  )) as { abi: AbiItem[]; networks: Record<string, { address: string }> };

  // 3) Get the active network ID
  const networkId = await web3.eth.net.getId();
  const netConfig = artifact.networks[networkId.toString()];
  if (!netConfig) {
    throw new Error(`Contract not deployed on network ID ${networkId}`);
  }
  const deployedAddress = netConfig.address;

  console.log("Using account:", (await web3.eth.getAccounts())[0]);
  console.log("StudentContract address:", deployedAddress);

  // 4) Instantiate the contract
  const student = new web3.eth.Contract(artifact.abi as any, deployedAddress);

  // 5) Pick accounts
  const [deployer] = await web3.eth.getAccounts();

  // 6) Write student number via setter
  const receipt = await student.methods.setStudentNumber(123456).send({
    from: deployer,
    value: web3.utils.toWei("0.0054", "ether"),
    gas: (100_000).toString(),
    gasPrice: web3.utils.toWei("20", "gwei"),
  });
  console.log("setStudentNumber tx hash:", receipt.transactionHash);

  // 7) Read back via getter
  const stored = await student.methods.studentNumber().call();
  console.log("Stored student number is:", stored);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
