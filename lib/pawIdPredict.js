/**
 * Roboflow prediction via REST API
 * NO SDK – stable on Vercel + Node 24
 */

const API_KEY = process.env.ROBOFLOW_API_KEY;

// PALITAN NG TUNAY MONG DETAILS
const WORKSPACE = "YOUR_WORKSPACE";
const PROJECT = "YOUR_PROJECT_NAME";
const VERSION = 1;

export async function predictImage(imageUrl) {
  const endpoint = `https://detect.roboflow.com/${PROJECT}/${VERSION}?api_key=${API_KEY}&image=${encodeURIComponent(imageUrl)}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("Roboflow request failed");
  }

  const data = await response.json();

  if (!data.predictions) {
    return [];
  }

  return data.predictions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map(p => ({
      breed: p.class,
      confidence: (p.confidence * 100).toFixed(1) + "%"
    }));
}
