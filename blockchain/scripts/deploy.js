import fs from 'fs';
import { ethers } from 'ethers';

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    // Hardhat's first default account
    const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

    const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/Election.sol/Election.json", "utf8"));

    // The contract is already deployed, let's just use the address from previous run if possible, 
    // or just redeploy (resetting the node is also an option but easier to just fix the script).
    // For simplicity, I'll just redeploy to make it clean.

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    console.log("Deploying Election contract...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("Election deployed to:", address);

    // Initialize with some candidates
    console.log("Initializing candidates...");
    const candidates = [
        ["c1", "Avinash", "Bharatiya Janata Party (BJP)", "Focusing on national development and economic growth.", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSz8ZAHLINeWvDiaY9TysPtYcTt50gPM6-3mQ&s"],
        ["c2", "Venu", "Indian National Congress (INC)", "Advocating for social justice and inclusive progress.", "https://upload.wikimedia.org/wikipedia/commons/3/3e/Indian_National_Congress_hand_symbol.png"],
        ["c3", "Gopal", "Aam Aadmi Party (AAP)", "Committed to transparent governance and public welfare.", "https://m.media-amazon.com/images/I/51YCqhDhqIS.jpg"],
        ["c4", "Krishna", "Bahujan Samaj Party (BSP)", "Empowering marginalized communities and social equality.", "https://upload.wikimedia.org/wikipedia/commons/8/8e/Bahujan_Samaj_Party_symbol_Elephant.svg"]
    ];

    // Manually manage nonce to be safe
    let nonce = await signer.getNonce();

    for (const c of candidates) {
        console.log(`Adding candidate: ${c[1]} (Nonce: ${nonce})`);
        const tx = await contract.addCandidate(c[0], c[1], c[2], c[3], c[4], { nonce: nonce++ });
        await tx.wait();
    }
    console.log("Candidates initialized.");

    // Write the address to a file for the backend to read
    fs.writeFileSync("../contract_address.txt", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
