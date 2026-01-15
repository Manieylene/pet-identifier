export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const API_KEY = process.env.fBSyrKCgiIIGPwkaYvlR;
    const MODEL_ID = process.env.g5-paw-id/1 ; 

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({ error: "Missing Roboflow env variables" });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

    const endpoint = `https://classify.roboflow.com/${MODEL_ID}?api_key=${API_KEY}`;

    const rfRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: cleanBase64
    });

    if (!rfRes.ok) {
      throw new Error("Roboflow request failed");
    }

    const data = await rfRes.json();

    const predictions = (data.predictions || [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(p => ({
        class: p.class,
        confidence: p.confidence
      }));

    return res.status(200).json({
      success: true,
      predictions
    });

  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
