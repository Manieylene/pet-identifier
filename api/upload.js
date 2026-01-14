import Roboflow from "roboflow";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const rf = new Roboflow({
      apiKey: process.env.ROBOFLOW_API_KEY,
    });

    const project = rf
      .workspace("polytechnic-university-of-the-philippines-fiuei")
      .project("g5-paw-id");

    const model = project.version(1);

    const prediction = await model.classify({ image });

    return res.status(200).json(prediction);

  } catch (error) {
    console.error("ROBOFLOW ERROR:", error);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
