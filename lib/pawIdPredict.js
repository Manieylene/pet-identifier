import Roboflow from "@roboflow/js";

// 🔑 PALITAN ng Roboflow API key mo
const rf = new Roboflow({
  apiKey: "YOUR_ROBOFLOW_API_KEY"
});

// 📌 PALITAN ayon sa Roboflow project mo
const project = rf.project("paw-id-project-name");
const model = project.version(1).model;

/**
 * Predict top 3 dog breeds (mixed breed style)
 * @param {string} imagePath - local image path
 */
export async function predictImage(imagePath) {
  try {
    const prediction = await model.predict(imagePath, {
      confidence: 0.01
    });

    const sorted = prediction.predictions.sort(
      (a, b) => b.confidence - a.confidence
    );

    return sorted.slice(0, 3).map(p => ({
      breed: p.class,
      confidence: (p.confidence * 100).toFixed(1) + "%"
    }));
  } catch (error) {
    console.error("Paw-ID prediction failed:", error);
    return [];
  }
}
