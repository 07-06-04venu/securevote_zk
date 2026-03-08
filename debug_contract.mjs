// Quick debug script to test if ethers can call the contract
import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const artifactPath = "./blockchain/artifacts/contracts/Election.sol/Election.json";
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);

async function main() {
    try {
        console.log("Testing getAllCandidateIds...");
        const ids = await contract.getAllCandidateIds();
        console.log("IDs:", ids);

        if (ids.length > 0) {
            console.log("Testing getCandidate for", ids[0]);
            const candidate = await contract.getCandidate(ids[0]);
            console.log("Candidate:", candidate);
        }
    } catch (e) {
        console.error("Error:", e.message);
        console.error("Full error code:", e.code);
    }
}

main();
