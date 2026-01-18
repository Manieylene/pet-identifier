document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js loaded");

  const uploadBtn = document.getElementById("uploadBtn");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const analyzeBtn = document.getElementById("analyzeImageBtn");
  const demoImages = document.querySelectorAll('.demo-image');

  // New DOM elements for the dual-panel layout
  const loading = document.getElementById("loading");
  const resultContent = document.getElementById("result-content");
  const dogImage = document.getElementById("dog-image");
  const defaultImage = document.getElementById("default-image");
  const breedResult = document.getElementById("breed-result");
  const breedInfo = document.getElementById("breed-info");
  const breedDetails = document.getElementById("breed-details");
  const breedDescription = document.getElementById("breed-description");

  // Original result card elements
  const resultCard = document.getElementById("result-card");
  const mainBreed = document.getElementById("main-breed");
  const badge = document.getElementById("badge");
  const explanation = document.getElementById("explanation");
  const confidenceList = document.getElementById("confidence-list");

  let currentFile = null;

  // Event Listeners
  uploadBtn.addEventListener("click", () => imageInput.click());

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    currentFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      // Update preview in upload card
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      previewPlaceholder.style.display = "none";
      analyzeBtn.disabled = false;
      
      // Also update the result section image
      dogImage.src = e.target.result;
      dogImage.classList.remove("hidden");
      defaultImage.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  });

  // Demo image click handlers
  demoImages.forEach(image => {
    image.addEventListener('click', () => {
      const breed = image.getAttribute('data-breed');
      const imgSrc = image.querySelector('img').src;
      
      // Update preview
      imagePreview.src = imgSrc;
      imagePreview.style.display = "block";
      previewPlaceholder.style.display = "none";
      analyzeBtn.disabled = false;
      
      // Update result section image
      dogImage.src = imgSrc;
      dogImage.classList.remove("hidden");
      defaultImage.classList.add("hidden");
      
      // Set current file to null since we're using a demo image
      currentFile = null;
      
      // For demo images, we'll show demo breed data
      showDemoBreedData(breed);
    });
  });

  // Drag and drop functionality
  const uploadArea = document.querySelector('.image-preview-area');
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
      const file = e.dataTransfer.files[0];
      currentFile = file;
      
      const reader = new FileReader();
      reader.onload = e => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
        previewPlaceholder.style.display = "none";
        analyzeBtn.disabled = false;
        
        // Also update the result section image
        dogImage.src = e.target.result;
        dogImage.classList.remove("hidden");
        defaultImage.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    }
  });

  // Analyze button click handler
  analyzeBtn.addEventListener("click", async () => {
    console.log("✅ Analyze clicked");

    if (!currentFile) {
      // If no file but we have a demo image preview
      if (imagePreview.style.display !== "none") {
        // Try to analyze the demo image
        const demoImage = document.querySelector('.demo-image img[src="' + imagePreview.src + '"]');
        if (demoImage) {
          const breed = demoImage.closest('.demo-image').getAttribute('data-breed');
          showDemoBreedData(breed);
        } else {
          // Show error in both result sections
          breedResult.innerHTML = `<p class="error">Please choose a file first.</p>`;
          breedInfo.classList.add("hidden");
          
          mainBreed.textContent = "No file";
          badge.textContent = "ERROR";
          explanation.textContent = "Please choose a file first.";
        }
      } else {
        // Show error in both result sections
        breedResult.innerHTML = `<p class="error">Please choose a file first.</p>`;
        breedInfo.classList.add("hidden");
        
        mainBreed.textContent = "No file";
        badge.textContent = "ERROR";
        explanation.textContent = "Please choose a file first.";
      }
      return;
    }

    // Show loading state in both sections
    showLoading();
    resultCard.classList.remove("hidden");
    
    // Show processing state in original card
    list.innerHTML = "";
    mainBreed.textContent = "Working...";
    badge.textContent = "PROCESSING";
    badge.className = "badge mixed";
    explanation.textContent = "Reading file...";

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyzing...';

    const reader = new FileReader();

    reader.onerror = () => {
      hideLoading();
      mainBreed.textContent = "Error";
      badge.textContent = "FAILED";
      explanation.textContent = "Failed to read file.";
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
      
      // Also update new result section
      breedResult.innerHTML = `<h2 class="breed-name">Error</h2><div class="confidence">Failed to read file</div>`;
      breedInfo.classList.add("hidden");
    };

    reader.onload = async () => {
      try {
        explanation.textContent = "Analyzing image...";

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

        // Render results in both sections
        renderResultInBothSections(data);
      } catch (err) {
        console.error("❌ Analyze error:", err);

        // Update both result sections with error
        hideLoading();
        mainBreed.textContent = "Error";
        badge.textContent = "FAILED";
        badge.className = "badge mixed";
        explanation.textContent = err?.message || "Analysis failed";
        confidenceList.innerHTML = "";
        
        breedResult.innerHTML = `<h2 class="breed-name">Error</h2><div class="confidence">${err?.message || "Analysis failed"}</div>`;
        breedInfo.classList.add("hidden");
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
      }
    };

    reader.readAsDataURL(currentFile);
  });

  // Show loading animation
  function showLoading() {
    loading.style.display = "block";
    resultContent.style.display = "none";
  }

  // Hide loading animation
  function hideLoading() {
    loading.style.display = "none";
    resultContent.style.display = "block";
  }

  // Render results in both the new result section and original card
  function renderResultInBothSections(data) {
    // Hide loading
    hideLoading();
    
    // Update original result card
    renderOriginalResultCard(data);
    
    // Update new result section
    renderNewResultSection(data);
  }

  function renderOriginalResultCard(data) {
    confidenceList.innerHTML = "";

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
      confidenceList.appendChild(row);
    });
  }

  function renderNewResultSection(data) {
    // ✅ NOT DOG
    if (data.isDog === false && data.isUnknown === false) {
      breedResult.innerHTML = `
        <h2 class="breed-name">Not a Dog</h2>
        <div class="confidence">No dog detected</div>
      `;
      breedInfo.classList.add("hidden");
      return;
    }

    // ✅ UNKNOWN / UNCLEAR
    if (data.isUnknown) {
      breedResult.innerHTML = `
        <h2 class="breed-name">Unknown / Unclear</h2>
        <div class="confidence">Upload clearer photo</div>
      `;
      breedInfo.classList.add("hidden");
      return;
    }

    const preds = data.predictions || [];

    if (!preds.length) {
      breedResult.innerHTML = `
        <h2 class="breed-name">Unknown</h2>
        <div class="confidence">No breed detected</div>
      `;
      breedInfo.classList.add("hidden");
      return;
    }

    const top = preds[0];
    const confidencePercent = (top.confidence * 100).toFixed(1);
    
    // For the new layout, we'll use the demo database for breed details
    // since the API doesn't provide detailed breed info
    const breedKey = getBreedKeyFromName(top.class);
    const breedDetailsFromDB = getBreedDetails(breedKey, confidencePercent);
    
    // Update breed result
    breedResult.innerHTML = `
      <h2 class="breed-name animate-in">${top.class}</h2>
      <div class="confidence animate-in" style="animation-delay: 0.1s">Confidence: ${confidencePercent}%</div>
    `;
    
    // Update breed info
    breedDetails.innerHTML = breedDetailsFromDB.detailsHTML;
    breedDescription.textContent = breedDetailsFromDB.description;
    
    // Show breed info
    breedInfo.classList.remove("hidden");
    breedInfo.classList.add("animate-in");
    breedInfo.style.animationDelay = "0.1s";
  }

  // Helper function to get breed key from name
  function getBreedKeyFromName(breedName) {
    // Convert breed name to a key format (lowercase, hyphenated)
    const key = breedName.toLowerCase().replace(/\s+/g, '-');
    
    // Check if we have this breed in our demo database
    const breedDatabase = {
      'golden-retriever': {
        name: 'Golden Retriever',
        size: 'Medium to Large',
        weight: '55-75 lbs',
        lifeExpectancy: '10-12 years',
        temperament: 'Friendly, Intelligent, Devoted',
        origin: 'Scotland, United Kingdom',
        description: 'The Golden Retriever is a medium-large gun dog known for its dense, lustrous golden coat. They are friendly, reliable, and trustworthy, making them excellent family pets and service dogs.'
      },
      'german-shepherd': {
        name: 'German Shepherd',
        size: 'Large',
        weight: '50-90 lbs',
        lifeExpectancy: '9-13 years',
        temperament: 'Confident, Courageous, Smart',
        origin: 'Germany',
        description: 'German Shepherds are working dogs known for their intelligence and versatility. They are often employed as police, guard, and search and rescue dogs due to their strength and trainability.'
      },
      'bulldog': {
        name: 'Bulldog',
        size: 'Medium',
        weight: '40-50 lbs',
        lifeExpectancy: '8-10 years',
        temperament: 'Friendly, Courageous, Calm',
        origin: 'England',
        description: 'The Bulldog is a muscular, hefty dog with a wrinkled face and a distinctive pushed-in nose. Despite their fierce appearance, they are gentle, affectionate, and excellent with children.'
      }
    };
    
    return breedDatabase[key] ? key : 'unknown';
  }

  // Get breed details from demo database
  function getBreedDetails(breedKey, confidence) {
    const breedDatabase = {
      'golden-retriever': {
        name: 'Golden Retriever',
        size: 'Medium to Large',
        weight: '55-75 lbs',
        lifeExpectancy: '10-12 years',
        temperament: 'Friendly, Intelligent, Devoted',
        origin: 'Scotland, United Kingdom',
        description: 'The Golden Retriever is a medium-large gun dog known for its dense, lustrous golden coat. They are friendly, reliable, and trustworthy, making them excellent family pets and service dogs.'
      },
      'german-shepherd': {
        name: 'German Shepherd',
        size: 'Large',
        weight: '50-90 lbs',
        lifeExpectancy: '9-13 years',
        temperament: 'Confident, Courageous, Smart',
        origin: 'Germany',
        description: 'German Shepherds are working dogs known for their intelligence and versatility. They are often employed as police, guard, and search and rescue dogs due to their strength and trainability.'
      },
      'bulldog': {
        name: 'Bulldog',
        size: 'Medium',
        weight: '40-50 lbs',
        lifeExpectancy: '8-10 years',
        temperament: 'Friendly, Courageous, Calm',
        origin: 'England',
        description: 'The Bulldog is a muscular, hefty dog with a wrinkled face and a distinctive pushed-in nose. Despite their fierce appearance, they are gentle, affectionate, and excellent with children.'
      },
      'unknown': {
        name: 'Unknown Breed',
        size: 'Varies',
        weight: 'Varies',
        lifeExpectancy: '10-15 years',
        temperament: 'Varies by breed',
        origin: 'Various',
        description: 'This breed could not be identified with high confidence. Try uploading a clearer image of the dog facing the camera.'
      }
    };
    
    const breed = breedDatabase[breedKey] || breedDatabase['unknown'];
    
    return {
      detailsHTML: `
        <div class="detail-item animate-in" style="animation-delay: 0.2s">
          <span class="detail-label">Size:</span>
          <span class="detail-value">${breed.size}</span>
        </div>
        <div class="detail-item animate-in" style="animation-delay: 0.3s">
          <span class="detail-label">Weight:</span>
          <span class="detail-value">${breed.weight}</span>
        </div>
        <div class="detail-item animate-in" style="animation-delay: 0.4s">
          <span class="detail-label">Life Expectancy:</span>
          <span class="detail-value">${breed.lifeExpectancy}</span>
        </div>
        <div class="detail-item animate-in" style="animation-delay: 0.5s">
          <span class="detail-label">Temperament:</span>
          <span class="detail-value">${breed.temperament}</span>
        </div>
        <div class="detail-item animate-in" style="animation-delay: 0.6s">
          <span class="detail-label">Origin:</span>
          <span class="detail-value">${breed.origin}</span>
        </div>
      `,
      description: breed.description
    };
  }

  // Show demo breed data (for demo images)
  function showDemoBreedData(breedKey) {
    const breedDetails = getBreedDetails(breedKey, '95%');
    
    // Update new result section
    breedResult.innerHTML = `
      <h2 class="breed-name animate-in">${breedDetailsFromDB.name || breedKey.replace('-', ' ').toUpperCase()}</h2>
      <div class="confidence animate-in" style="animation-delay: 0.1s">Demo Data: 95% Confidence</div>
    `;
    
    breedDetails.innerHTML = breedDetails.detailsHTML;
    breedDescription.textContent = breedDetails.description;
    
    breedInfo.classList.remove("hidden");
    breedInfo.classList.add("animate-in");
    breedInfo.style.animationDelay = "0.1s";
    
    // Also update original result card with demo data
    mainBreed.textContent = breedDetailsFromDB.name || breedKey.replace('-', ' ').toUpperCase();
    badge.textContent = "DEMO";
    badge.className = "badge pure";
    explanation.textContent = "Demo data from sample image. Upload your own photo for real analysis.";
    
    // Create demo confidence list
    confidenceList.innerHTML = '';
    const breeds = ['golden-retriever', 'german-shepherd', 'bulldog'];
    breeds.forEach((b, idx) => {
      const confidence = b === breedKey ? 95 : Math.floor(Math.random() * 30) + 50;
      const breedName = b.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const row = document.createElement("div");
      row.className = "breed-row";
      row.style.setProperty("--row-index", idx);
      
      row.innerHTML = `
        <strong>${breedName} (${confidence}%)</strong>
        <div class="progress">
          <div class="progress-bar" style="width:${confidence}%"></div>
        </div>
      `;
      confidenceList.appendChild(row);
    });
    
    resultCard.classList.remove("hidden");
  }

  // Initialize with a demo breed on page load
  setTimeout(() => {
    const breeds = ['golden-retriever', 'german-shepherd', 'bulldog'];
    const randomBreed = breeds[Math.floor(Math.random() * breeds.length)];
    
    // Use the image from the demo for the selected breed
    const demoImage = document.querySelector(`.demo-image[data-breed="${randomBreed}"]`);
    if (demoImage) {
      const imgSrc = demoImage.querySelector('img').src;
      
      // Update result section image
      dogImage.src = imgSrc;
      dogImage.classList.remove("hidden");
      defaultImage.classList.add("hidden");
      
      // Show demo breed data
      showDemoBreedData(randomBreed);
    }
  }, 1000);
});