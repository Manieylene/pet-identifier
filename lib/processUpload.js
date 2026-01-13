import { IncomingForm } from "formidable";
import processUpload from "../../lib/processUpload.js";
import { predictImage } from "../../lib/pawIdPredict.js";

export const config = {
  api: {
    bodyParser: false, // important para sa file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({
    multiples: false,  // isa lang file
    keepExtensions: true,
  });

  // Wrap form.parse in a promise para await
  const parseForm = () =>
    new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

  try {
    const { fields, files } = await parseForm();

    // ⚠️ Check kung anong pangalan ng field sa frontend (halimbawa: 'image')
    const file = files?.image || null;
    const base64 = fields?.image || null;

    if (!file && !base64) {
      return res.status(400).json({ error: "Missing image or base64" });
    }

    // ================================
    // 📤 Upload to image host
    // ================================
    const uploadResult = await processUpload({ file, base64 });

    if (!uploadResult.success || !uploadResult.imageUrl) {
      return res.status(500).json({ error: "Image upload failed" });
    }

    // ================================
    // 🐾 Predict with Paw ID model
    // ================================
    const pawIdResult = await predictImage(uploadResult.imageUrl);

    return res.status(200).json({
      success: true,
      upload: uploadResult,
      pawId: pawIdResult,
    });

  } catch (error) {
    console.error("Upload API error:", error);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
