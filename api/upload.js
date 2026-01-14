import Roboflow from "roboflow";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const rf = new Roboflow({
      apiKey: process.env.ROBOFLOW_API_KEY
    });

    const project = rf
      .workspace("polytechnic-university-of-the-philippines-fiuei")
      .project("g5-paw-id");

    const model = project.version(1);

    const prediction = await model.classify({
      image: image
    });

    return res.status(200).json(prediction);

  } catch (err) {
    console.error("ROBOFLOW ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
