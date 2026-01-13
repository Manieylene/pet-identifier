import { IncomingForm } from "formidable";
import { processUpload } from "../lib/processUpload.js";
import { predictImage } from "../lib/pawIdPredict.js";

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    uploadDir: "/tmp",
    filename: (name, ext, part) =>
      `${Date.now()}-${part.originalFilename}`,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "Form parsing failed." });
    }

    try {
      const file = files?.image;
      const base64 = fields?.image;

      if (!file && !base64) {
        return res.status(400).json({
          error: "Missing image or base64"
        });
      }

      // ✅ Save image (existing logic mo)
      const uploadResult = await processUpload({ file, base64 });

      // ✅ Paw-ID prediction
      let pawIdResult = [];

      if (uploadResult?.imagePath) {
        pawIdResult = await predictImage(uploadResult.imagePath);
      }

      // ✅ Final response
      res.json({
        success: true,
        upload: uploadResult,
        pawId: pawIdResult
      });

    } catch (error) {
      console.error("Upload API error:", error);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  });
}
