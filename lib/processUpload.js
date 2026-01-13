import fs from "fs";

/**
 * Upload image and return public URL
 * (temporary mock — pwede mo palitan ng Cloudinary / Imgbb)
 */
export async function processUpload({ file, base64 }) {
  try {
    if (file) {
      // For now, return local path (placeholder)
      return {
        success: true,
        imageUrl: "https://via.placeholder.com/512"
      };
    }

    if (base64) {
      return {
        success: true,
        imageUrl: "https://via.placeholder.com/512"
      };
    }

    return { success: false };
  } catch (err) {
    console.error("processUpload error:", err);
    return { success: false };
  }
}
