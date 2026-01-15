export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "No image provided" });
    }

    const API_KEY = process.env.ROBOFLOW_API_KEY;
    const MODEL_ID = process.env.ROBOFLOW_MODEL_ID; // example: "g5-paw-id/1"

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({ error: "Missing Roboflow env vars" });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const endpoint = `https://classify.roboflow.com/${MODEL_ID}?api_key=${API_KEY}`;

    const rfRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cleanBase64
    });

    const text = await rfRes.text();
    if (!rfRes.ok) {
      return res.status(502).json({
        error: "Roboflow failed",
        details: text.slice(0, 300)
      });
    }

    const data = JSON.parse(text);

    // Roboflow classification usually returns: { predictions: {breed: prob, ...} }
    const predsObj = data.predictions || {};

    const predictions = Object.entries(predsObj)
      .map(([breed, confidence]) => ({
        class: breed,
        confidence: Number(confidence) || 0
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // top 5 look-alikes

    return res.status(200).json({ success: true, predictions });
  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
