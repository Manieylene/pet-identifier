// Buttons
const uploadBtn = document.getElementById("uploadBtn");
const cameraBtn = document.getElementById("cameraBtn");

// Hidden file inputs
const imageInput = document.getElementById("imageInput");
const cameraInput = document.getElementById("cameraInput");

// Trigger file dialogs
uploadBtn.addEventListener("click", () => {
  imageInput.click(); // open file picker
});

cameraBtn.addEventListener("click", () => {
  cameraInput.click(); // open camera on mobile
});

// IMAGE PREVIEW (works for both)
function handleFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const imagePreview = document.getElementById("imagePreview");
    const placeholder = document.getElementById("previewPlaceholder");

    imagePreview.src = e.target.result;
    imagePreview.style.display = "block";
    placeholder.style.display = "none";

    const analyzeBtn = document.getElementById("analyzeImageBtn");
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// Listen to file inputs
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  handleFile(file);
});

cameraInput.addEventListener("change", () => {
  const file = cameraInput.files[0];
  handleFile(file);
});
