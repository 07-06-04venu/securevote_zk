import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  description: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  voteCount: { type: Number, default: 0 },
}, { timestamps: true });

const CandidateModel = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    return res.status(500).json({ error: "MONGODB_URI not configured" });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }

    const candidates = await CandidateModel.find({}).sort({ id: 1 }).lean();
    return res.status(200).json(candidates.map((c: any) => ({ 
      id: c.id, 
      name: c.name, 
      party: c.party, 
      description: c.description, 
      avatarUrl: c.avatarUrl, 
      voteCount: c.voteCount || 0 
    })));
  } catch (e: any) {
    console.error("Error fetching tally:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
