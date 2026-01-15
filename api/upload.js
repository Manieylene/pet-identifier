export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // linisin ang base64 prefix
    const cleanBase64 = image.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    const endpoint = `https://detect.roboflow.com/g5-paw-id/1?api_key=${process.env.ROBOFLOW_API_KEY}`;

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

    return res.status(200).json(data);

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
