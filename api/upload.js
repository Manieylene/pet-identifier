// pages/api/upload.js
// ✅ Roboflow Classification (DOG vs NOT-DOG) — single model only
// Uses: ROBOFLOW_API_KEY + ROBOFLOW_GATE_MODEL_ID (e.g. not-dogs-dcagu/1)

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

    // ============================
    // 🔑 REQUIRED ENV VARS
    // ============================
    // 👉 Put your Roboflow API key here (Vercel env var / .env)
    const API_KEY = process.env.ROBOFLOW_API_KEY="fBSyrKCgiIIGPwkaYvlR";

    // 👉 Put your model id here (Vercel env var / .env)
    // Example: "not-dogs-dcagu/1"
    const MODEL_ID = process.env.not-dogs-dcagu/1;

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({
        error: "Missing Roboflow env vars",
        missing: {
          ROBOFLOW_API_KEY: !API_KEY,
          ROBOFLOW_GATE_MODEL_ID: !MODEL_ID
        }
      });
    }

    // ============================
    // 🖼 BASE64 CLEANUP
    // ============================
    // Removes prefixes like: data:image/jpeg;base64,
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    // ============================
    // 🔄 Normalize Roboflow outputs
    // ============================
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
      // B) predictions is OBJECT: { "label": 0.62, ... }
      else if (data?.predictions && typeof data.predictions === "object") {
        preds = Object.entries(data.predictions).map(([label, conf]) => ({
          class: label,
          confidence: Number(conf) || 0
        }));
      }
      // C) top-only format: { top, confidence }
      else if (data?.top) {
        preds = [{ class: data.top, confidence: Number(data.confidence) || 0 }];
      }

      return preds.sort((a, b) => b.confidence - a.confidence);
    }

    // ============================
    // 🌐 Call Roboflow
    // ============================
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
    const preds = normalizePredictions(data);

    // ============================
    // 🎚 Decision logic (tune here)
    // ============================
    // 👉 Increase this if people/objects still get predicted as dog
    const DOG_MIN = 0.65;

    // Look up confidences by label (case-insensitive)
    const dogConf =
      preds.find(p => String(p.class).toLowerCase() === "dog")?.confidence ?? 0;

    const notDogConf =
      preds.find(p => String(p.class).toLowerCase() === "not-dog")?.confidence ??
      preds.find(p => String(p.class).toLowerCase() === "notdog")?.confidence ??
      preds.find(p => String(p.class).toLowerCase() === "not_dog")?.confidence ??
      0;

    // If dog is confidently higher than not-dog, treat as dog
    const isDog = dogConf >= DOG_MIN && dogConf > notDogConf;

    // ============================
    // ✅ Response (dog / not-dog only)
    // ============================
    return res.status(200).json({
      success: true,
      type: isDog ? "dog" : "not-dog",
      confidence: isDog ? dogConf : notDogConf,

      // Optional debug fields (safe to keep while tuning; remove later)
      scores: { dog: dogConf, notDog: notDogConf },
      top5: preds.slice(0, 5)
    });
  } catch (err) {
    console.error("❌ PAW-ID ERROR:", err);
    return res.status(500).json({
      error: "Analysis failed",
      details: String(err?.message || err)
    });
  }
}
