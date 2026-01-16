document.addEventListener("DOMContentLoaded", () => {
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
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: reader.result })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "API request failed");

        renderResult(data);
      };

      reader.readAsDataURL(currentFile);
    } catch (err) {
      console.error(err);
      alert("Analysis failed");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
    }
  });

  function renderResult(data) {
    const card = document.getElementById("result-card");
    const mainBreed = document.getElementById("main-breed");
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    card.classList.remove("hidden");
    list.innerHTML = "";

    // ✅ OPTION A: Unknown / Not-a-Dog UI
    if (data.isUnknown) {
      mainBreed.textContent = "Unknown / Not a Dog";
      badge.textContent = "NO DOG DETECTED";
      badge.className = "badge mixed";
      explanation.textContent = "Please upload a clear photo of a dog (face or full body).";
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

    explanation.textContent = "Top breed look-alikes (confidence):";

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
