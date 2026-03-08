<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15PFitrC5TeDNfv9NrShyubWtg_kxp2G7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## MongoDB Atlas + Vercel Setup

1. In MongoDB Atlas, open **Network Access** and add:
- Your current public IP (for local testing), and
- `0.0.0.0/0` for Vercel serverless access (recommended for thesis/demo deployments).

2. In Atlas **Database Access**, create a dedicated app user with read/write on your app DB.

3. Use a DB-specific URI (include database name), for example:
`mongodb+srv://<user>:<password>@<cluster-host>/securevote?retryWrites=true&w=majority`

4. In Vercel Project Settings -> Environment Variables, set:
- `MONGODB_URI`
- `MONGODB_DB_NAME=securevote`
- `GEMINI_API_KEY`
- `RPC_URL`
- `CONTRACT_ADDRESS`
- `VOTE_RELAYER_PRIVATE_KEY`

5. This server now enforces MongoDB in production:
- If Atlas is unreachable on Vercel, startup fails instead of silently writing to local files.

6. Local check:
- Open `http://127.0.0.1:3000/api/health`
- Expect `"mongo":"connected"` when Atlas works.

