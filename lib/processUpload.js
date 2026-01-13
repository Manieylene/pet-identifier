import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function processUpload({ file, base64 }) {
  let savedImagePath = null;

  try {
    console.log(
      "🔍 Loaded API KEY:",
      process.env.ROBOFLOW_API_KEY ? "OK" : "MISSING"
    );

    if (!file && !base64) {
      throw new Error("No image received! Provide a file OR base64.");
    }

    let imageBase64;
    let imageBuffer;

    // ================================
    // 📁 HANDLE FILE (FORMIDABLE)
    // ================================
    if (file) {
      console.log("📁 Processing uploaded file...");

      if (!fs.existsSync(file.path)) {
        throw new Error("Uploaded file not found.");
      }

      imageBuffer = fs.readFileSync(file.path);
      imageBase64 = imageBuffer.toString("base64");
    }

    // ================================
    // 🖼 HANDLE BASE64
    // ================================
    if (base64) {
      console.log("🖼 Using Base64 string...");
      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
      imageBase64 = cleanBase64;
      imageBuffer = Buffer.from(cleanBase64, "base64");
    }

    if (!imageBase64 || !imageBuffer) {
      throw new Error("Failed to process image.");
    }

    // ================================
    // 💾 SAVE IMAGE (FOR DISPLAY)
    // ================================
    const uploadsDir = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-pawid.jpg`;
    savedImagePath = path.join(uploadsDir, filename);

    fs.writeFileSync(savedImagePath, imageBuffer);
    console.log("💾 Image saved at:", savedImagePath);

    // ================================
    // 🚀 ROBOFLOW REST API CALL
    // ================================
    const response = await axios({
      method: "POST",
      url: `${process.env.ROBOFLOW_API_URL}/${process.env.ROBOFLOW_MODEL_ID}`,
      params: {
        api_key: process.env.ROBOFLOW_API_KEY,
      },
      data: imageBase64,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const result = response.data;
    console.log("📌 ROBOFLOW RAW RESPONSE:", result);

    // ================================
    // 🐕 MIXED BREED LOGIC
    // ================================
    const predictions = result.predictions || [];

    const sorted = predictions.sort(
      (a, b) => b.confidence - a.confidence
    );

    const top3 = sorted.slice(0, 3).map(p => ({
      breed: p.class || "Unknown Breed",
      confidence: (p.confidence * 100).toFixed(1) + "%"
    }));

    const mainBreed = top3[0]?.breed || "Unknown Breed";

    // ================================
    // ✅ FINAL RESPONSE
    // ================================
    return {
      success: true,
      imagePath: `uploads/${filename}`,
      mainBreed,
      mixedBreeds: top3
    };

  } catch (err) {
    console.error("❌ processUpload ERROR:", err.message);

    return {
      success: false,
      error: err.message,
    };

  } finally {
    // ================================
    // 🗑 DELETE TEMP FILE
    // ================================
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log("🗑 Deleted temp file:", file.path);
    }
  }
}
