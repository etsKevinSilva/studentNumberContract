import Web3 from "web3";
import type { AbiItem } from "web3-utils";
import path from "path";

// Helper to log balances
async function logEth(web3: Web3, label: string, addrs: string[]) {
  console.log(`\n=== Balances after ${label} ===`);
  for (const a of addrs) {
    const bal = await web3.eth.getBalance(a);
    console.log(`  ${a}: ${web3.utils.fromWei(bal, "ether")} ETH`);
  }
}

async function main(): Promise<void> {
  // 1) Connect to Ganache RPC
  const web3 = new Web3("ws://127.0.0.1:7545");

  // 2) Load the compiled artifact
  const artifact = require(path.resolve(
    __dirname,
    "..",
    "build",
    "contracts",
    "PubSubContract.json"
  )) as {
    abi: AbiItem[];
    networks: Record<string, { address: string }>;
  };

  // 3) Get the active network ID
  const networkId = await web3.eth.net.getId();
  const netConfig = artifact.networks[networkId.toString()];
  if (!netConfig) {
    throw new Error(`PubSubContract not deployed on network ${networkId}`);
  }
  const contractAddress = netConfig.address;

  // 4) Instantiate the contract
  const pubsub = new web3.eth.Contract(artifact.abi as any, contractAddress);

  // 5) Pick accounts
  const accounts = await web3.eth.getAccounts();
  const [deployer, publisher, subscriber] = accounts;

  console.log("Accounts:");
  console.log("Broker/Deployer: ", deployer);
  console.log("Publisher:       ", publisher);
  console.log("Subscriber:      ", subscriber);
  console.log("Contract address:", contractAddress, "\n");

  // 6) Advertise the topic
  const topic = "BlockchainTopic";
  console.log(`Publisher advertises topic "${topic}"`);
  await pubsub.methods.advertise(topic).send({
    from: publisher,
    gas: (200_000).toString(),
    gasPrice: web3.utils.toWei("20", "gwei"),
  });

  // 7) Subscriber subscribes with 0.5 ETH deposit
  console.log(`Subscriber subscribes to "${topic}" (0.5 ETH)`);
  await pubsub.methods.subscribe(topic).send({
    from: subscriber,
    value: web3.utils.toWei("0.5", "ether"),
    gas: (200_000).toString(),
    gasPrice: web3.utils.toWei("20", "gwei"),
  });

  await logEth(web3, "subscription", [publisher, subscriber]);

  // 8) Set up event listener for MessageReceived
  const sub = pubsub.events.MessageReceived();
  sub.on("data", (evt) => {
    const { topic, message, subscriber: subAddr } = evt.returnValues;
    console.log(`\n[Event] ${subAddr} got message on "${topic}": "${message}"`);
  });
  sub.on("error", (err) => {
    console.error("Event error:", err);
  });

  // 9) Publisher sends a message
  console.log(`\nPublisher publishes "Hello, world!" to "${topic}"`);
  await pubsub.methods.publish(topic, "Hello, world!").send({
    from: publisher,
    gas: (300_000).toString(),
    gasPrice: web3.utils.toWei("20", "gwei"),
  });

  await new Promise((r) => setTimeout(r, 1000));

  // 10) Query subscriber’s remaining balance in the contract
  const remaining = await pubsub.methods
    .getSubscriberBalance(topic, subscriber)
    .call();
  console.log(
    `\nSubscriber’s on‐chain balance for "${topic}": ${web3.utils.fromWei(
      remaining as unknown as string,
      "ether"
    )} ETH`
  );

  // 11) Subscriber unsubscribes (refund remaining deposit)
  console.log(`\nSubscriber unsubscribes from "${topic}"`);
  await pubsub.methods.unsubscribe(topic).send({
    from: subscriber,
    gas: (150_000).toString(),
    gasPrice: web3.utils.toWei("20", "gwei"),
  });

  await logEth(web3, "unsubscription", [publisher, subscriber]);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
