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
    const DOG_MODEL_ID = process.env.ROBOFLOW_DOG_MODEL_ID; // g5-pet-breed-identifier/1
    const CAT_MODEL_ID = process.env.ROBOFLOW_CAT_MODEL_ID; // g5-pet-breed-identifier-cat/1

    if (!API_KEY || !DOG_MODEL_ID || !CAT_MODEL_ID) {
      return res.status(500).json({ error: "Missing Roboflow env vars" });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    async function classify(modelId) {
      const endpoint = `https://classify.roboflow.com/${modelId}?api_key=${API_KEY}`;

      const rfRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: cleanBase64
      });

      const text = await rfRes.text();
      if (!rfRes.ok) {
        throw new Error(text.slice(0, 300));
      }

      const data = JSON.parse(text);

      // Roboflow classification commonly returns:
      // { predictions: { "breedA": 0.62, "breedB": 0.21, ... } }
      const predsObj = (data && data.predictions && typeof data.predictions === "object")
        ? data.predictions
        : {};

      const predictions = Object.entries(predsObj)
        .map(([breed, confidence]) => ({
          class: breed,
          confidence: Number(confidence) || 0
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      const topConfidence = predictions[0]?.confidence || 0;

      return { predictions, topConfidence };
    }

    // Run both models (dog + cat)
    const [dog, cat] = await Promise.all([
      classify(DOG_MODEL_ID),
      classify(CAT_MODEL_ID)
    ]);

    // Pick the better match
    const type = dog.topConfidence >= cat.topConfidence ? "dog" : "cat";
    const finalPreds = type === "dog" ? dog.predictions : cat.predictions;

    return res.status(200).json({
      success: true,
      type, // "dog" | "cat"
      predictions: finalPreds
    });

  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
