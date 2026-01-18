document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const analyzeBtn = document.getElementById("analyzeImageBtn");

  let currentFile = null;

  uploadBtn.addEventListener("click", () => imageInput.click());

  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      previewPlaceholder.style.display = "none";
      analyzeBtn.disabled = false;
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
      currentFile = null;
      analyzeBtn.disabled = true;
    };
    reader.readAsDataURL(file);
  });

  analyzeBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
      // ✅ Convert file -> base64 (awaitable)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(currentFile);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 })
      });

      // ✅ robust parse (handles HTML error pages, etc.)
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }

      if (!res.ok) throw new Error(data?.error || "API request failed");

      renderResult(data);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Analysis failed");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
    }
  });

  function renderResult(data) {
    const card = document.getElementById("result-card");
    const mainTitle = document.getElementById("main-breed"); // reuse this element
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    if (!card || !mainTitle || !badge || !explanation || !list) {
      console.warn("Missing result DOM elements. Check your HTML IDs.");
      alert("Result UI elements not found (check HTML IDs).");
      return;
    }

    card.classList.remove("hidden");
    list.innerHTML = "";

    // Expected API response:
    // { success:true, type:"dog"|"not-dog", confidence, scores:{dog,notDog}, top5:[...] }

    const type = String(data?.type || "").toLowerCase();
    const conf = Number(data?.confidence) || 0;
    const percent = (conf * 100).toFixed(1);

    if (type === "dog") {
      mainTitle.textContent = "Dog Detected";
      badge.textContent = "DOG";
      badge.className = "badge pure";
      explanation.textContent = `Confidence: ${percent}%`;
    } else {
      mainTitle.textContent = "Not a Dog";
      badge.textContent = "NOT-DOG";
      badge.className = "badge mixed";
      explanation.textContent = `Confidence: ${percent}%`;
    }

    // Optional debug scores + top5
    const scores = data?.scores || {};
    const dogScore = Number(scores.dog || 0);
    const notDogScore = Number(scores.notDog || scores.not_dog || 0);

    const debug = document.createElement("div");
    debug.className = "breed-row";
    debug.innerHTML = `
      <strong>Scores</strong>
      <div style="margin-top:6px; font-size: 14px;">
        Dog: ${(dogScore * 100).toFixed(1)}%<br/>
        Not-Dog: ${(notDogScore * 100).toFixed(1)}%
      </div>
    `;
    list.appendChild(debug);

    const top5 = Array.isArray(data?.top5) ? data.top5 : [];
    if (top5.length) {
      const header = document.createElement("div");
      header.className = "breed-row";
      header.innerHTML = `<strong>Top predictions</strong>`;
      list.appendChild(header);

      top5.slice(0, 5).forEach((p, idx) => {
        const label = p.class ?? p.label ?? p.name ?? "unknown";
        const c = Number(p.confidence) || 0;
        const pct = (c * 100).toFixed(1);

        const row = document.createElement("div");
        row.className = "breed-row";
        row.style.setProperty("--row-index", idx);
        row.innerHTML = `
          <strong>${label} (${pct}%)</strong>
          <div class="progress">
            <div class="progress-bar" style="width:${pct}%"></div>
          </div>
        `;
        list.appendChild(row);
      });
    }
  }
});
