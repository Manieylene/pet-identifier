document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js loaded");

  const uploadBtn = document.getElementById("uploadBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const analyzeBtn = document.getElementById("analyzeImageBtn");

  let currentFile = null;

  uploadBtn.addEventListener("click", () => imageInput.click());

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    currentFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      previewPlaceholder.style.display = "none";
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  analyzeBtn.addEventListener("click", async () => {
    console.log("✅ Analyze clicked");

    const card = document.getElementById("result-card");
    const mainBreed = document.getElementById("main-breed");
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    card.classList.remove("hidden");
    list.innerHTML = "";
    mainBreed.textContent = "Working...";
    badge.textContent = "PROCESSING";
    badge.className = "badge mixed";
    explanation.textContent = "Reading file...";

    if (!currentFile) {
      mainBreed.textContent = "No file";
      badge.textContent = "ERROR";
      explanation.textContent = "Please choose a file first.";
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    const reader = new FileReader();

    reader.onerror = () => {
      mainBreed.textContent = "Error";
      badge.textContent = "FAILED";
      explanation.textContent = "Failed to read file.";
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
    };

    reader.onload = async () => {
      try {
        explanation.textContent = "wait a minute...";

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: reader.result })
        });

        const rawText = await res.text();
        console.log("✅ API status:", res.status);
        console.log("✅ API raw:", rawText);

        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("API did not return JSON (maybe 404 HTML). Raw: " + rawText.slice(0, 80));
        }

        if (!res.ok) {
          throw new Error(data?.error || "API request failed");
        }

        renderResult(data);
      } catch (err) {
        console.error("❌ Analyze error:", err);

        mainBreed.textContent = "Error";
        badge.textContent = "FAILED";
        badge.className = "badge mixed";
        explanation.textContent = err?.message || "Analysis failed";
        list.innerHTML = "";
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
      }
    };

    reader.readAsDataURL(currentFile);
  });

  function renderResult(data) {
    const mainBreed = document.getElementById("main-breed");
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    list.innerHTML = "";

    // ✅ NOT DOG
    if (data.isDog === false && data.isUnknown === false) {
      mainBreed.textContent = "Not a Dog";
      badge.textContent = "NOT DOG";
      badge.className = "badge mixed";
      explanation.textContent = "No dog detected in the image.";
      return;
    }

    // ✅ UNKNOWN / UNCLEAR
    if (data.isUnknown) {
      mainBreed.textContent = "Unknown / Unclear";
      badge.textContent = "UNCLEAR";
      badge.className = "badge mixed";
      explanation.textContent = "Upload a clearer dog photo (face or full body).";
      return;
    }

    const preds = data.predictions || [];

    if (!preds.length) {
      mainBreed.textContent = "Unknown";
      badge.textContent = "NO DATA";
      badge.className = "badge mixed";
      explanation.textContent = "No breed detected.";
      return;
    }

    const top = preds[0];
    mainBreed.textContent = top.class;

    const isMixed = !!data.possibleMix;
    badge.textContent = isMixed ? "POSSIBLE MIX" : "TOP MATCH";
    badge.className = isMixed ? "badge mixed" : "badge pure";

    explanation.textContent = "Top matches (confidence):";

    preds.forEach((p, idx) => {
      const percent = (p.confidence * 100).toFixed(1);
      const row = document.createElement("div");
      row.className = "breed-row";
      row.style.setProperty("--row-index", idx);

      row.innerHTML = `
        <strong>${p.class} (${percent}%)</strong>
        <div class="progress">
          <div class="progress-bar" style="width:${percent}%"></div>
        </div>
      `;
      list.appendChild(row);
    });
  }
});