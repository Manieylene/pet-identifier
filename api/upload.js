export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const API_KEY = process.env.ROBOFLOW_API_KEY;
    const MODEL_ID = process.env.ROBOFLOW_MODEL_ID; // g5-paw-id/1

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({ error: "Missing Roboflow env vars" });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

    const endpoint =
      `https://detect.roboflow.com/${MODEL_ID}?api_key=${API_KEY}`;

    const rfRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cleanBase64
    });

    if (!rfRes.ok) throw new Error("Roboflow failed");

    const data = await rfRes.json();

    const predictions = (data.predictions || [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(p => ({
        class: p.class,
        confidence: p.confidence
      }));

    return res.status(200).json({ success: true, predictions });

  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
