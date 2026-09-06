/**
 * cloudinary.js — SwachhGrid
 * Upload files to Cloudinary using unsigned upload preset.
 * Includes automatic Base64 Data URL fallback if env vars are unconfigured.
 */

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve('https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80');
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(file, onProgress = null) {
  if (!CLOUD_NAME || !UPLOAD_PRESET || CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    console.warn('Cloudinary env vars not configured — using instant Base64 data preview fallback.');
    if (onProgress) onProgress(100);
    return await fileToDataUrl(file);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'swachh-grid');

  try {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText).secure_url);
        } else {
          reject(new Error('Cloudinary upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  } catch (err) {
    console.warn('Cloudinary upload failed — falling back to Base64 data URL:', err);
    if (onProgress) onProgress(100);
    return await fileToDataUrl(file);
  }
}

export async function uploadMultipleToCloudinary(files, onProgress = null) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToCloudinary(
      files[i],
      onProgress ? (pct) => onProgress(i, pct) : null
    );
    urls.push(url);
  }
  return urls;
}

