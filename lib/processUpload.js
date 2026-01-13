import axios from "axios";

export async function processUpload({ file, base64 }) {
  try {
    let imageBase64;

    // ================================
    // 📁 FILE FROM FORMIDABLE
    // ================================
    if (file) {
      const fs = await import("fs");
      const buffer = fs.readFileSync(file.filepath);
      imageBase64 = buffer.toString("base64");
    }

    // ================================
    // 🖼 BASE64 INPUT
    // ================================
    if (base64) {
      imageBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    }

    if (!imageBase64) {
      throw new Error("No image data received");
    }

    // ================================
    // ☁️ UPLOAD TO IMAGE HOST (IMGBB)
    // ================================
    const uploadRes = await axios.post(
      "https://api.imgbb.com/1/upload",
      {
        image: imageBase64,
      },
      {
        params: {
          key: process.env.IMGBB_API_KEY,
        },
      }
    );

    const imageUrl = uploadRes.data?.data?.url;

    if (!imageUrl) {
      throw new Error("Image upload failed");
    }

    // ================================
    // ✅ RETURN PUBLIC URL ONLY
    // ================================
    return {
      success: true,
      imageUrl,
    };

  } catch (error) {
    console.error("❌ processUpload error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
