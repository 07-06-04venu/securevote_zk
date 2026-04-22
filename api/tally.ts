export const config = {
  maxDuration: 60,
};

const candidates = [
  { id: "c1", name: "Avinash", party: "Bharatiya Janata Party (BJP)", description: "Focusing on national development.", avatarUrl: "https://picsum.photos/seed/bjp/200", voteCount: 0 },
  { id: "c2", name: "Venu", party: "Indian National Congress (INC)", description: "Advocating for social justice.", avatarUrl: "https://picsum.photos/seed/inc/200", voteCount: 0 },
  { id: "c3", name: "Gopal", party: "Aam Aadmi Party (AAP)", description: "Committed to transparent governance.", avatarUrl: "https://picsum.photos/seed/aap/200", voteCount: 0 },
  { id: "c4", name: "Krishna", party: "Bahujan Samaj Party (BSP)", description: "Empowering marginalized communities.", avatarUrl: "https://picsum.photos/seed/bspl/200", voteCount: 0 },
];

export default async function handler(req: any, res: any) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { candidateId } = req.body || {};
    if (candidateId) {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.voteCount++;
      }
    }
  }

  return res.status(200).json(candidates);
}