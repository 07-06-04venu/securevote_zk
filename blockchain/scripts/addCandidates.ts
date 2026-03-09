import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(__dirname, "..", "artifacts/contracts/Election.sol/Election.json");
const contractArtifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
const CONTRACT_ABI = contractArtifact.abi;
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_RPC_URL = "http://127.0.0.1:8545";
const ADMIN_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const candidates = [
  { id: "cand-001", name: "Narendra Modi", party: "BJP", description: "Prime Minister of India", avatarUrl: "https://picsum.photos/seed/modi/200" },
  { id: "cand-002", name: "Rahul Gandhi", party: "INC", description: "Leader of Opposition", avatarUrl: "https://picsum.photos/seed/rahul/200" },
  { id: "cand-003", name: "Arvind Kejriwal", party: "AAP", description: "Chief Minister of Delhi", avatarUrl: "https://picsum.photos/seed/kejriwal/200" },
  { id: "cand-004", name: "Mamata Banerjee", party: "TMC", description: "Chief Minister of West Bengal", avatarUrl: "https://picsum.photos/seed/mamata/200" },
];

async function addCandidates() {
  const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
  const signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  console.log("Adding candidates to blockchain...");

  for (const cand of candidates) {
    try {
      const tx = await contract.addCandidate(cand.id, cand.name, cand.party, cand.description, cand.avatarUrl);
      await tx.wait();
      console.log(`Added: ${cand.name} (${cand.party})`);
    } catch (e: any) {
      console.log(`Error adding ${cand.name}: ${e.message}`);
    }
  }

  console.log("Done!");
}

addCandidates();
