import Roboflow from "roboflow";

const rf = new Roboflow({
  apiKey: process.env.ROBOFLOW_API_KEY,
});

// ⚠️ PALITAN MO ITO
const workspace = "YOUR_WORKSPACE";       // hal. "manieylene"
const projectName = "paw-id-project-name"; // exact project name
const versionNumber = 1;

const model = rf
  .workspace(workspace)
  .project(projectName)
  .version(versionNumber)
  .model;

/**
 * Predict top 3 pet breeds
 * @param {string} imageUrl - PUBLIC image URL
 */
export async function predictImage(imageUrl) {
  const result = await model.predict(imageUrl, {
    confidence: 0.01,
  });

  const sorted = result.predictions.sort(
    (a, b) => b.confidence - a.confidence
  );

  return sorted.slice(0, 3).map(p => ({
    breed: p.class,
    confidence: (p.confidence * 100).toFixed(1) + "%",
  }));
}
