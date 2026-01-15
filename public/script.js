document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const analyzeBtn = document.getElementById("analyzeImageBtn");

  let currentFile = null;

  // ================================
  // 📤 UPLOAD FUNCTIONALITY
  // ================================
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

  // ================================
  // 🔍 ANALYZE IMAGE - Direct to Results
  // ================================
  analyzeBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    try {
      // Get the image as base64
      const imageBase64 = await getImageBase64(currentFile);
      
      // Call your actual API endpoint
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      
      // Display the results
      renderResult(data);
      
      // Scroll to results smoothly
      document.getElementById('result-card').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
      
    } catch (error) {
      console.error("Analysis error:", error);
      
      // Fallback: If API fails, show sample results for demonstration
      // Remove this in production when your API is ready
      const fallbackData = {
        predictions: [
          { class: "Golden Retriever", confidence: 0.95 },
          { class: "Labrador Retriever", confidence: 0.82 },
          { class: "German Shepherd", confidence: 0.45 }
        ]
      };
      renderResult(fallbackData);
      
      // Optional: Show error message to user
      // alert("Unable to analyze image. Showing sample results for demonstration.");
      
    } finally {
      // Reset button state
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
    }
  });

  // ================================
  // 🖼️ CONVERT IMAGE TO BASE64
  // ================================
  function getImageBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ================================
  // 📊 RENDER RESULT
  // ================================
  function renderResult(data) {
    const card = document.getElementById("result-card");
    const mainBreed = document.getElementById("main-breed");
    const badge = document.getElementById("badge");
    const explanation = document.getElementById("explanation");
    const list = document.getElementById("confidence-list");

    // Show the result card
    card.classList.remove("hidden");
    
    // Clear previous results
    list.innerHTML = "";

    // Check if we have predictions
    const preds = data.predictions || [];

    if (!preds.length) {
      mainBreed.textContent = "Unknown Breed";
      badge.textContent = "NO DATA";
      badge.className = "badge";
      explanation.textContent = "No breed could be identified from the uploaded image.";
      return;
    }

    // Display the top breed
    const top = preds[0];
    mainBreed.textContent = top.class;
    badge.textContent = preds.length > 1 ? "MIXED BREED" : "PURE";
    badge.className = preds.length > 1 ? "badge mixed" : "badge pure";
    explanation.textContent = "Detected breed confidence levels:";

    // Create confidence bars for each prediction
    preds.forEach((prediction, index) => {
      const percent = (prediction.confidence * 100).toFixed(1);
      const row = document.createElement("div");
      row.className = "breed-row";
      row.style.setProperty("--row-index", index);
      
      row.innerHTML = `
        <strong>${prediction.class} (${percent}%)</strong>
        <div class="progress">
          <div class="progress-bar" style="width:${percent}%"></div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  // Optional: Auto-scroll to upload section on page load
  setTimeout(() => {
    const detectionSection = document.getElementById("detect");
    if (detectionSection && !currentFile) {
      detectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 1000);
});