// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewSection = document.getElementById('previewSection');
const originalImage = document.getElementById('originalImage');
const processedImage = document.getElementById('processedImage');
const downloadBtn = document.getElementById('downloadBtn');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');

let processedImageUrl = null;

// Upload button click event
uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.click();
});

// Drop Zone
const dropZone = document.getElementById('dropZone');

// Click on drop zone
dropZone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn) {
        imageInput.click();
    }
});

// Prevent files from opening in the browser
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlighting drop zone
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropZone.classList.add('drag-over');
}

function unhighlight() {
    dropZone.classList.remove('drag-over');
}

// Management drop
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];

        // Check file type
        if (!file.type.startsWith('image/')) {
            showError('Please select an image file.');
            return;
        }

        // Simulate file selection
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;

        // Show original photo
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Photo processing
        removeBackground(file);
    }
}

// File selection event
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file.');
        return;
    }

    // Show original photo
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Photo processing
    await removeBackground(file);

});

// Background removal function
async function removeBackground(file) {
    hideError();
    showLoading();
    previewSection.style.display = 'none';

    // Hide upload section
    document.querySelector('.upload-section').style.display = 'none';

    try {
        await removeBackgroundAdvanced(file);
        previewSection.style.display = 'block';
    } catch (error) {
        showError(error.message);
        // Redisplay upload section on error
        document.querySelector('.upload-section').style.display = 'block';
    } finally {
        hideLoading();
    }
}

// Automatic background removal with optimized algorithm
async function removeBackgroundAdvanced(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;

            // Drawing a picture
            ctx.drawImage(img, 0, 0);

            // Getting pixel data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Automatic background color detection
            const bgColor = detectBackgroundColor(data, canvas.width, canvas.height);

            // Calculating the optimal threshold based on the image
            const optimalThreshold = calculateOptimalThreshold(data, bgColor, canvas.width, canvas.height);

            // Remove Background
            removeBackgroundPixels(data, bgColor, optimalThreshold, canvas.width, canvas.height);

            // Automatic edge smoothing
            smoothEdges(data, canvas.width, canvas.height, 2);

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((blob) => {
                if (processedImageUrl) {
                    URL.revokeObjectURL(processedImageUrl);
                }
                processedImageUrl = URL.createObjectURL(blob);
                processedImage.src = processedImageUrl;
                resolve();
            }, 'image/png');
        };

        img.onerror = () => {
            reject(new Error('Error loading image'));
        };

        reader.readAsDataURL(file);
    });
}

// Calculating the optimal threshold
function calculateOptimalThreshold(data, bgColor, width, height) {
    const distances = [];

    // Sampling pixels
    for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
            Math.pow(r - bgColor[0], 2) +
            Math.pow(g - bgColor[1], 2) +
            Math.pow(b - bgColor[2], 2)
        );

        distances.push(distance);
    }

    // Sorting distances
    distances.sort((a, b) => a - b);

    // Select threshold at 25th percentile (to completely remove background)
    const percentile = Math.floor(distances.length * 0.25);
    return Math.max(30, Math.min(80, distances[percentile]));
}

// Detecting the dominant background color
function detectBackgroundColor(data, width, height) {
    const samples = [];
    const sampleSize = 10;

    // Sampling the corners of the image
    for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
            // Top left corner
            let idx = (y * width + x) * 4;
            samples.push([data[idx], data[idx + 1], data[idx + 2]]);

            // Top right corner
            idx = (y * width + (width - 1 - x)) * 4;
            samples.push([data[idx], data[idx + 1], data[idx + 2]]);

            // Lower left corner
            idx = ((height - 1 - y) * width + x) * 4;
            samples.push([data[idx], data[idx + 1], data[idx + 2]]);

            // Bottom right corner
            idx = ((height - 1 - y) * width + (width - 1 - x)) * 4;
            samples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
    }

    // Calculating the average color
    let r = 0, g = 0, b = 0;
    samples.forEach(sample => {
        r += sample[0];
        g += sample[1];
        b += sample[2];
    });

    const count = samples.length;
    return [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count)
    ];
}

// Remove background pixels
function removeBackgroundPixels(data, bgColor, threshold, width, height) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculating color distance with background
        const distance = Math.sqrt(
            Math.pow(r - bgColor[0], 2) +
            Math.pow(g - bgColor[1], 2) +
            Math.pow(b - bgColor[2], 2)
        );

        // If the distance is less than the threshold, make the pixel transparent.
        if (distance < threshold) {
            // Gradual transparency based on distance
            const alpha = Math.min(255, (distance / threshold) * 255);
            data[i + 3] = alpha;
        }
    }
}

// Soften the edges
function smoothEdges(data, width, height, radius) {
    const tempData = new Uint8ClampedArray(data);

    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const idx = (y * width + x) * 4;

            // If the pixel is transparent or translucent
            if (data[idx + 3] < 255) {
                let sumAlpha = 0;
                let count = 0;

                // Averaging of surrounding pixels
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        sumAlpha += data[nIdx + 3];
                        count++;
                    }
                }

                tempData[idx + 3] = Math.round(sumAlpha / count);
            }
        }
    }

    // Copy softened data
    for (let i = 3; i < data.length; i += 4) {
        data[i] = tempData[i];
    }
}

// Download Photo
downloadBtn.addEventListener('click', () => {
    if (!processedImageUrl) return;

    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = 'trimbg.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Auxiliary functions
function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
}

// Button Photo new
const resetBtn = document.getElementById('resetBtn');

resetBtn.addEventListener('click', () => {
    imageInput.value = '';
    previewSection.style.display = 'none';
    hideError();

    // Show again upload section
    document.querySelector('.upload-section').style.display = 'block';

    if (processedImageUrl) {
        URL.revokeObjectURL(processedImageUrl);
        processedImageUrl = null;
    }
});
