document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const imageInput = document.getElementById("imageInput");
  const cameraInput = document.getElementById("cameraInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const analyzeBtn = document.getElementById("analyzeImageBtn");

  let currentFile = null;

  // Upload button triggers hidden file input
  uploadBtn.addEventListener("click", () => imageInput.click());
  cameraBtn.addEventListener("click", () => cameraInput.click());

  function handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      previewPlaceholder.style.display = "none";
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  imageInput.addEventListener("change", () => handleFile(imageInput));
  cameraInput.addEventListener("change", () => handleFile(cameraInput));

  // Analyze Image
  analyzeBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerText = "Analyzing...";

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image })
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        renderResult(data);
      };
      reader.readAsDataURL(currentFile);

    } catch (err) {
      alert("Analysis failed");
      console.error(err);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
    }
  });

  // Render Result
  function renderResult(data) {
    const card = document.getElementById("result-card");
    const mainBreed = document.getElementById("main-breed");
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    card.classList.remove("hidden");
    list.innerHTML = "";

    const preds = data.predictions || [];

    if (!preds.length) {
      mainBreed.textContent = "Unknown";
      badge.textContent = "NO DATA";
      explanation.textContent = "No breed detected.";
      return;
    }

    const top = preds[0];
    mainBreed.textContent = top.class;
    badge.textContent = preds.length > 1 ? "MIXED BREED" : "PURE";
    badge.className = preds.length > 1 ? "badge mixed" : "badge pure";

    explanation.textContent = "Detected breed confidence levels:";

    preds.forEach(p => {
      const percent = (p.confidence * 100).toFixed(1);
      const row = document.createElement("div");
      row.className = "breed-row";
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
