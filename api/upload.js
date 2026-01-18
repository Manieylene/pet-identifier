export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK /api/upload is reachable");
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "No image provided" });
    }

    const API_KEY = process.env.ROBOFLOW_API_KEY;
    const MODEL_ID = process.env.ROBOFLOW_MODEL_ID; // not-dogs-dcagu/1

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({ error: "Missing Roboflow env vars" });
    }

    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    function normalizePredictions(data) {
      let preds = [];

      if (Array.isArray(data?.predictions)) {
        preds = data.predictions
          .map(p => ({
            class: p.class ?? p.label ?? p.name,
            confidence: Number(p.confidence ?? p.probability ?? p.score) || 0
          }))
          .filter(p => p.class);
      } else if (data?.predictions && typeof data.predictions === "object") {
        preds = Object.entries(data.predictions).map(([cls, conf]) => ({
          class: cls,
          confidence: Number(conf) || 0
        }));
      } else if (data?.top) {
        preds = [{ class: data.top, confidence: Number(data.confidence) || 0 }];
      }

      return preds.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
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
    const predictions = normalizePredictions(data);

    const top = predictions[0] || { class: "", confidence: 0 };
    const topLabel = String(top.class).toLowerCase();

    // ✅ Only these labels are "NOT DOG"
    // IMPORTANT: adjust to your exact non-dog class names in Roboflow
    const NOT_DOG_LABELS = new Set([
      "not dog",
      "not-dog",
      "not_dog",
      "notdogs",
      "not dogs",
      "person",
      "human",
      "vehicle",
      "car",
      "background",
      "object"
    ]);

    // Thresholds
    const NOT_DOG_MIN = 0.60;  // top class must be confidently not-dog
    const DOG_MIN = 0.35;      // if it's a breed label, allow lower threshold

    // ✅ NOT DOG if top label is in NOT_DOG_LABELS and confident
    if (NOT_DOG_LABELS.has(topLabel) && top.confidence >= NOT_DOG_MIN) {
      return res.status(200).json({
        success: true,
        isDog: false,
        isUnknown: false,
        predictions: []
      });
    }

    // ✅ DOG if top label is NOT in NOT_DOG_LABELS and reasonably confident
    // (breeds count as dog)
    if (!NOT_DOG_LABELS.has(topLabel) && top.confidence >= DOG_MIN) {
      const filtered = predictions.filter(p => {
        const cls = String(p.class).toLowerCase();
        return !NOT_DOG_LABELS.has(cls); // keep breeds
      });

      const strong = filtered.filter(p => p.confidence >= 0.2);
      const possibleMix = strong.length > 1;

      return res.status(200).json({
        success: true,
        isDog: true,
        isUnknown: false,
        possibleMix,
        predictions: filtered
      });
    }

    // ✅ Otherwise unclear
    return res.status(200).json({
      success: true,
      isDog: false,
      isUnknown: true,
      predictions: []
    });
  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
