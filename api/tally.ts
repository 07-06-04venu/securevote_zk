export const config = {
  maxDuration: 60,
};

const defaultCandidates = [
  { id: "c1", name: "Avinash", party: "Bharatiya Janata Party (BJP)", description: "Focusing on national development.", avatarUrl: "https://picsum.photos/seed/bjp/200", voteCount: 0 },
  { id: "c2", name: "Venu", party: "Indian National Congress (INC)", description: "Advocating for social justice.", avatarUrl: "https://picsum.photos/seed/inc/200", voteCount: 0 },
  { id: "c3", name: "Gopal", party: "Aam Aadmi Party (AAP)", description: "Committed to transparent governance.", avatarUrl: "https://picsum.photos/seed/aap/200", voteCount: 0 },
  { id: "c4", name: "Krishna", party: "Bahujan Samaj Party (BSP)", description: "Empowering marginalized communities.", avatarUrl: "https://picsum.photos/seed/bspl/200", voteCount: 0 },
];

export default async function handler(req: any, res: any) {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    return res.status(200).json(defaultCandidates);
  }
  
  try {
    const mongoose = await import("mongoose");
    if (mongoose.default.connection.readyState !== 1) {
      await mongoose.default.connect(mongoUri);
    }

    const CandidateModel = mongoose.default.models.Candidate || mongoose.default.model("Candidate", new mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      party: { type: String, required: true },
      description: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      voteCount: { type: Number, default: 0 },
    }));

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
    return res.status(200).json(defaultCandidates);
  }
}
