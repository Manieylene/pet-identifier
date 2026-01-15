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
    const MODEL_ID = process.env.ROBOFLOW_MODEL_ID; // e.g. "g5-paw-id/1"

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
      return res.status(502).json({ error: "Roboflow failed", details: text.slice(0, 300) });
    }

    const data = JSON.parse(text);

    // ---- ROBUST PARSING (handles multiple Roboflow formats) ----
    let predictions = [];

    // Format A: predictions is an array: [{ class, confidence }, ...]
    if (Array.isArray(data.predictions)) {
      predictions = data.predictions
        .map(p => ({
          class: p.class ?? p.label ?? p.name,
          confidence: Number(p.confidence ?? p.probability ?? p.score) || 0
        }))
        .filter(p => p.class);
    }

    // Format B: predictions is an object: { "breed": 0.62, "breed2": 0.21 }
    else if (data.predictions && typeof data.predictions === "object") {
      predictions = Object.entries(data.predictions)
        .map(([breed, conf]) => ({
          class: breed,
          confidence: Number(conf) || 0
        }));
    }

    // Format C: top + confidence only (single top)
    else if (data.top) {
      predictions = [{
        class: data.top,
        confidence: Number(data.confidence) || 0
      }];
    }

    // Sort + top N
    predictions = predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      predictions,
      // optional: helpful debug if empty
      debug: predictions.length ? undefined : { keys: Object.keys(data || {}) }
    });

  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
