// api/upload.js
// ✅ Roboflow Classification (DOG vs NOT-DOG) — single model only
// ENV:
// - ROBOFLOW_API_KEY
// - ROBOFLOW_GATE_MODEL_ID (e.g. "not-dogs-dcagu/1")

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

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

    // ✅ READ env vars correctly
    const API_KEY = process.env.ROBOFLOW_API_KEY;
    const MODEL_ID = process.env.ROBOFLOW_GATE_MODEL_ID;

    if (!API_KEY || !MODEL_ID) {
      return res.status(500).json({
        error: "Missing Roboflow env vars",
        missing: {
          ROBOFLOW_API_KEY: !API_KEY,
          ROBOFLOW_GATE_MODEL_ID: !MODEL_ID
        }
      });
    }

    // ✅ Remove data URL prefix (data:image/...;base64,)
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    function normalizePredictions(data) {
      let preds = [];

      if (Array.isArray(data?.predictions)) {
        preds = data.predictions
          .map((p) => ({
            class: p.class ?? p.label ?? p.name,
            confidence: Number(p.confidence ?? p.probability ?? p.score) || 0
          }))
          .filter((p) => p.class);
      } else if (data?.predictions && typeof data.predictions === "object") {
        preds = Object.entries(data.predictions).map(([label, conf]) => ({
          class: label,
          confidence: Number(conf) || 0
        }));
      } else if (data?.top) {
        preds = [{ class: data.top, confidence: Number(data.confidence) || 0 }];
      }

      return preds.sort((a, b) => b.confidence - a.confidence);
    }

    const endpoint = `https://classify.roboflow.com/${MODEL_ID}?api_key=${API_KEY}`;

    const rfRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cleanBase64
    });

    const rfText = await rfRes.text();

    if (!rfRes.ok) {
      return res.status(502).json({
        error: "Roboflow failed",
        status: rfRes.status,
        details: rfText.slice(0, 500)
      });
    }

    let rfData;
    try {
      rfData = JSON.parse(rfText);
    } catch {
      return res.status(502).json({
        error: "Roboflow returned non-JSON response",
        details: rfText.slice(0, 500)
      });
    }

    const preds = normalizePredictions(rfData);

    const DOG_MIN = 0.65;

    const dogConf =
      preds.find((p) => String(p.class).toLowerCase() === "dog")?.confidence ?? 0;

    const notDogConf =
      preds.find((p) =>
        ["not-dog", "notdog", "not_dog"].includes(String(p.class).toLowerCase())
      )?.confidence ?? 0;

    const isDog = dogConf >= DOG_MIN && dogConf > notDogConf;

    return res.status(200).json({
      success: true,
      type: isDog ? "dog" : "not-dog",
      confidence: isDog ? dogConf : notDogConf,
      scores: { dog: dogConf, notDog: notDogConf },
      top5: preds.slice(0, 5)
    });
  } catch (err) {
    console.error("❌ API ERROR:", err);
    return res.status(500).json({
      error: "Analysis failed",
      details: String(err?.message || err)
    });
  }
}
