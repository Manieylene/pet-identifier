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

    if (!API_KEY || !DOG_MODEL_ID) {
      return res.status(500).json({
        error: "Missing Roboflow env vars",
        missing: {
          ROBOFLOW_API_KEY: !API_KEY,
          ROBOFLOW_DOG_MODEL_ID: !DOG_MODEL_ID
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

    const endpoint = `https://classify.roboflow.com/${DOG_MODEL_ID}?api_key=${API_KEY}`;

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
    const predictions = normalizePredictions(data);

    // ✅ OPTION A: Unknown / Not-a-Dog decision using thresholds
    // Tune these if needed:
    const TOP_MIN = 0.35; // if top < 35% => likely not a dog / unclear image
    const GAP_MIN = 0.12; // if top-second < 12% => ambiguous

    const top = predictions[0] || { confidence: 0 };
    const second = predictions[1] || { confidence: 0 };

    const isUnknown =
      top.confidence < TOP_MIN ||
      (top.confidence - second.confidence) < GAP_MIN;

    if (isUnknown) {
      return res.status(200).json({
        success: true,
        type: "dog",
        isUnknown: true,
        possibleMix: false,
        predictions: []
      });
    }

    // Mixed-looking rule: 2+ breeds >= 20%
    const strong = predictions.filter(p => p.confidence >= 0.20);
    const possibleMix = strong.length > 1;

    return res.status(200).json({
      success: true,
      type: "dog",
      isUnknown: false,
      possibleMix,
      predictions
    });
  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
