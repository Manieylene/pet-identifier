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

    const API_KEY = process.env.fBSyrKCgiIIGPwkaYvlR;
    const DOG_MODEL_ID = process.env.g5-pet-breed-identifier/1;
    const CAT_MODEL_ID = process.env.g5-pet-breed-identifier-cat/1;

    if (!API_KEY || !DOG_MODEL_ID || !CAT_MODEL_ID) {
      return res.status(500).json({
        error: "Missing Roboflow env vars",
        missing: {
          ROBOFLOW_API_KEY: !API_KEY,
          ROBOFLOW_DOG_MODEL_ID: !DOG_MODEL_ID,
          ROBOFLOW_CAT_MODEL_ID: !CAT_MODEL_ID
        }
      });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    function normalizePredictions(data) {
      let preds = [];

      // A) predictions is ARRAY: [{class, confidence}, ...]
      if (Array.isArray(data?.predictions)) {
        preds = data.predictions
          .map(p => ({
            class: p.class ?? p.label ?? p.name,
            confidence: Number(p.confidence ?? p.probability ?? p.score) || 0
          }))
          .filter(p => p.class);
      }
      // B) predictions is OBJECT: { "breed": 0.62, ... }
      else if (data?.predictions && typeof data.predictions === "object") {
        preds = Object.entries(data.predictions).map(([breed, conf]) => ({
          class: breed,
          confidence: Number(conf) || 0
        }));
      }
      // C) top-only format
      else if (data?.top) {
        preds = [{ class: data.top, confidence: Number(data.confidence) || 0 }];
      }

      return preds.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
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
        return {
          ok: false,
          error: text.slice(0, 300),
          predictions: [],
          topConfidence: 0,
          rawKeys: []
        };
      }

      const data = JSON.parse(text);
      const predictions = normalizePredictions(data);
      const topConfidence = predictions[0]?.confidence || 0;

      return {
        ok: true,
        predictions,
        topConfidence,
        rawKeys: Object.keys(data || {})
      };
    }

    // call both models
    const [dogRes, catRes] = await Promise.all([
      classify(DOG_MODEL_ID),
      classify(CAT_MODEL_ID)
    ]);

    // pick winner by confidence
    const type = dogRes.topConfidence >= catRes.topConfidence ? "dog" : "cat";
    const finalPreds = type === "dog" ? dogRes.predictions : catRes.predictions;

    // Mixed-looking rule (optional): 2+ breeds >= 20%
    const strong = finalPreds.filter(p => p.confidence >= 0.20);
    const possibleMix = strong.length > 1;

    return res.status(200).json({
      success: true,
      type,              // "dog" or "cat"
      possibleMix,       // true/false
      predictions: finalPreds
      // If you want debug back, tell me and I'll add it again
    });
  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
