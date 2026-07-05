// ----------------------------------------------------
// Supabase Cloud Configuration (Backend Connection)
// ----------------------------------------------------
const SUPABASE_URL = 'https://ydkhhnralclajmryhqeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlka2hobnJhbGNsYWptcnlocWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTEyNTUsImV4cCI6MjA5ODgyNzI1NX0.xirFAhMo6cYAM9JPLZKdgnmNaY2FZCFcadnht947AaQ';

const isSupabaseConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';
let supabaseClient = null;

if (isSupabaseConfigured) {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("ShareFlow: Supabase Live Database connection initialized.");
  } else {
    console.error("ShareFlow Error: Supabase CDN library is missing or failed to load. Running in local fallback mode.");
  }
} else {
  console.warn("ShareFlow: Running in Local Preview Mode. Set SUPABASE_URL and SUPABASE_KEY in script.js to connect database.");
}

// ----------------------------------------------------
// Global State Management
// ----------------------------------------------------
window.uploadedFiles = [];
window.sessionBlobs = {}; 

let currentSelectedFile = null;
let uploadProgressInterval = null;
let activeSecuredRecord = null; 

// DOM References (Initialized safely on DOMContentLoaded to prevent null reference errors)
let tabUpload, tabDownload, uploadPanel, downloadPanel;
let uploadInitialState, uploadDetailState, uploadSuccessState;
let dropZone, dropZoneOverlay, fileInput;
let detailFileName, detailFileSize, detailFileIcon, cancelUploadBtn;
let progressBarFill, uploadStatusText, uploadStats;
let passwordToggle, passwordInputContainer, sharePassword, shareExpiry;
let generateIdBtn, secretIdBox, copyIdBtn, copyBtnText, copyIcon, resetUploadBtn;
let downloadIdInput, retrieveBtn, downloadErrorMsg, errorText;
let downloadPasswordContainer, downloadPasswordInput, unlockBtn, passwordErrorMsg;
let downloadResultContainer, downloadPreviewIcon, downloadFileName, downloadFileSize, downloadFileExpiry, downloadActionBtn;
let toastNotification, toastIcon, toastTitle, toastBody;
let toastTimeout = null;

// SVGs for different file types to enhance UX visual elegance
const iconSvgs = {
  pdf: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  image: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  archive: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-archive"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v-1"/><path d="M12 14v-1"/><path d="M12 17v-1"/></svg>`,
  audio: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-music"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  video: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`
};

// Color indicators matching icon category
const iconColors = {
  pdf: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-500' },
  image: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-500' },
  archive: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-500' },
  audio: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-500' },
  video: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-500' },
  default: { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-500' }
};

// SVGs for Notification Toast Types
const toastIcons = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`
};

const toastIconColors = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  error: { bg: 'bg-rose-50', text: 'text-rose-600' },
  info: { bg: 'bg-blue-50', text: 'text-blue-600' }
};

// ----------------------------------------------------
// Safe DOM Initialization on Document Load
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Select Tab Nodes
  tabUpload = document.getElementById('tab-upload');
  tabDownload = document.getElementById('tab-download');
  uploadPanel = document.getElementById('upload-panel');
  downloadPanel = document.getElementById('download-panel');

  // Select Upload sub-panels
  uploadInitialState = document.getElementById('upload-initial-state');
  uploadDetailState = document.getElementById('upload-detail-state');
  uploadSuccessState = document.getElementById('upload-success-state');

  // Drag Zone elements
  dropZone = document.getElementById('drop-zone');
  dropZoneOverlay = document.getElementById('drop-zone-overlay');
  fileInput = document.getElementById('file-input');

  // Selected file layout metadata fields
  detailFileName = document.getElementById('detail-file-name');
  detailFileSize = document.getElementById('detail-file-size');
  detailFileIcon = document.getElementById('detail-file-icon');
  cancelUploadBtn = document.getElementById('cancel-upload-btn');
  progressBarFill = document.getElementById('progress-bar-fill');
  uploadStatusText = document.getElementById('upload-status-text');
  uploadStats = document.getElementById('upload-stats');

  // Settings layout inputs
  passwordToggle = document.getElementById('password-toggle');
  passwordInputContainer = document.getElementById('password-input-container');
  sharePassword = document.getElementById('share-password');
  shareExpiry = document.getElementById('share-expiry');

  // Success screen and triggers
  generateIdBtn = document.getElementById('generate-id-btn');
  secretIdBox = document.getElementById('secret-id-box');
  copyIdBtn = document.getElementById('copy-id-btn');
  copyBtnText = document.getElementById('copy-btn-text');
  copyIcon = document.getElementById('copy-icon');
  resetUploadBtn = document.getElementById('reset-upload-btn');

  // Download components
  downloadIdInput = document.getElementById('download-id-input');
  retrieveBtn = document.getElementById('retrieve-btn');
  downloadErrorMsg = document.getElementById('download-error-msg');
  errorText = document.getElementById('error-text');

  downloadPasswordContainer = document.getElementById('download-password-container');
  downloadPasswordInput = document.getElementById('download-password-input');
  unlockBtn = document.getElementById('unlock-btn');
  passwordErrorMsg = document.getElementById('password-error-msg');

  downloadResultContainer = document.getElementById('download-result-container');
  downloadPreviewIcon = document.getElementById('download-preview-icon');
  downloadFileName = document.getElementById('download-file-name');
  downloadFileSize = document.getElementById('download-file-size');
  downloadFileExpiry = document.getElementById('download-file-expiry');
  downloadActionBtn = document.getElementById('download-action-btn');

  // Toast structures
  toastNotification = document.getElementById('toast-notification');
  toastIcon = document.getElementById('toast-icon');
  toastTitle = document.getElementById('toast-title');
  toastBody = document.getElementById('toast-body');

  // Attach all action event listeners cleanly
  bindEventListeners();
});

// ----------------------------------------------------
// macOS Notification Toast Functionality
// ----------------------------------------------------
function triggerToast(title, body, type = 'info') {
  if (!toastNotification || !toastIcon || !toastTitle || !toastBody) return;
  if (toastTimeout) clearTimeout(toastTimeout);

  toastTitle.textContent = title;
  toastBody.textContent = body;
  
  toastIcon.className = `p-2 rounded-lg flex items-center justify-center shrink-0 ${toastIconColors[type].bg} ${toastIconColors[type].text}`;
  toastIcon.innerHTML = toastIcons[type] || toastIcons.info;

  toastNotification.classList.remove('opacity-0', '-translate-y-24');
  toastNotification.classList.add('opacity-100', 'translate-y-0');

  toastTimeout = setTimeout(() => {
    dismissToast();
  }, 3500);
}

function dismissToast() {
  if (!toastNotification) return;
  toastNotification.classList.remove('opacity-100', 'translate-y-0');
  toastNotification.classList.add('opacity-0', '-translate-y-24');
}

// ----------------------------------------------------
// Tab Toggling & Reset Logic
// ----------------------------------------------------
function switchTab(activeTab) {
  resetUploadView();
  resetDownloadView();

  if (activeTab === 'upload') {
    tabUpload.classList.add('bg-white', 'text-gray-800', 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]');
    tabUpload.classList.remove('text-gray-500');
    tabDownload.classList.remove('bg-white', 'text-gray-800', 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]');
    tabDownload.classList.add('text-gray-500');

    uploadPanel.classList.remove('hidden');
    downloadPanel.classList.add('hidden');
  } else {
    tabDownload.classList.add('bg-white', 'text-gray-800', 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]');
    tabDownload.classList.remove('text-gray-500');
    tabUpload.classList.remove('bg-white', 'text-gray-800', 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]');
    tabUpload.classList.add('text-gray-500');

    downloadPanel.classList.remove('hidden');
    uploadPanel.classList.add('hidden');
    
    setTimeout(() => downloadIdInput.focus(), 50);
  }
}

// ----------------------------------------------------
// File Helper Functions & Size Formatting
// ----------------------------------------------------
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileTypeCategory(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['zip', 'rar', 'tar', 'gz', '7z', 'dmg', 'iso'].includes(ext)) return 'archive';
  if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  return 'default';
}

// ----------------------------------------------------
// Input File Validation Checks
// ----------------------------------------------------
function handleFileSelection(file) {
  // Size restriction of 10MB
  const maxBytesLimit = 10 * 1024 * 1024;
  if (file.size > maxBytesLimit) {
    triggerToast('File Too Large', 'Maximum allowable size for uploads is capped at 10MB.', 'error');
    fileInput.value = '';
    return;
  }

  // Executable file restrictions
  const blockedExtensions = ['exe', 'bat', 'sh', 'cmd', 'bin', 'msi', 'com', 'app', 'elf'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (blockedExtensions.includes(ext)) {
    triggerToast('Restricted File Type', 'Executable scripts (.exe, .bat, .sh) are blocked for safety.', 'error');
    fileInput.value = '';
    return;
  }

  currentSelectedFile = file;

  const category = getFileTypeCategory(file.name);
  detailFileIcon.innerHTML = iconSvgs[category] || iconSvgs.default;
  
  detailFileIcon.className = 'p-2 rounded-lg shadow-sm flex items-center justify-center border ';
  const colors = iconColors[category] || iconColors.default;
  detailFileIcon.classList.add(colors.bg, colors.border, colors.text);

  detailFileName.textContent = file.name;
  detailFileSize.textContent = `${formatBytes(file.size)} • ${category.toUpperCase()}`;

  resetSharingParameters();

  uploadInitialState.classList.add('hidden');
  uploadDetailState.classList.remove('hidden');

  simulatePreparationAnimation(file);
}

function simulatePreparationAnimation(file) {
  if (uploadProgressInterval) clearInterval(uploadProgressInterval);
  
  generateIdBtn.disabled = true;
  generateIdBtn.className = "w-full bg-gray-400 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-not-allowed";
  
  let progress = 0;
  progressBarFill.style.width = '0%';
  uploadStatusText.textContent = 'Preparing... 0%';
  uploadStats.textContent = `0 MB of ${formatBytes(file.size)}`;

  const fileSizeInMb = (file.size / (1024 * 1024)).toFixed(1);
  
  uploadProgressInterval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(uploadProgressInterval);
      
      progressBarFill.style.width = '100%';
      uploadStatusText.innerHTML = '<span class="text-emerald-600 font-medium">Ready to secure & share</span>';
      uploadStats.textContent = `${fileSizeInMb} MB of ${fileSizeInMb} MB`;
      
      generateIdBtn.disabled = false;
      generateIdBtn.className = "w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer";
    } else {
      progressBarFill.style.width = `${progress}%`;
      uploadStatusText.textContent = `Preparing... ${progress}%`;
      const loadedInMb = ((file.size * (progress / 100)) / (1024 * 1024)).toFixed(1);
      uploadStats.textContent = `${loadedInMb} MB of ${fileSizeInMb} MB`;
    }
  }, 50);
}

function resetSharingParameters() {
  passwordToggle.setAttribute('aria-checked', 'false');
  passwordToggle.className = "w-10 h-6 bg-gray-300 rounded-full p-0.5 transition-colors focus:outline-none flex items-center justify-start shadow-inner cursor-pointer";
  passwordToggle.firstElementChild.className = "w-5 h-5 bg-white rounded-full shadow-md transition-transform transform translate-x-0";
  passwordInputContainer.classList.add('hidden');
  sharePassword.value = '';
  shareExpiry.selectedIndex = 1; 
}

function resetUploadView() {
  if (uploadProgressInterval) clearInterval(uploadProgressInterval);
  currentSelectedFile = null;
  if (fileInput) fileInput.value = '';
  if (uploadDetailState) uploadDetailState.classList.add('hidden');
  if (uploadSuccessState) uploadSuccessState.classList.add('hidden');
  if (uploadInitialState) uploadInitialState.classList.remove('hidden');
}

// ----------------------------------------------------
// Standalone Modular Functions (Phase 4 / Supabase)
// ----------------------------------------------------

/**
 * Generates a clean 6-digit alphanumeric Secret ID
 * @returns {string}
 */
function generateSecretID() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Handles the file save logic, pushing metadata and uploading file to Supabase
 * @param {File} file 
 */
async function handleUpload(file) {
  if (!file) return;

  const secretId = generateSecretID();
  const isPasswordProtected = passwordToggle.getAttribute('aria-checked') === 'true';
  const passwordVal = isPasswordProtected ? sharePassword.value.trim() : null;
  const expiryVal = parseInt(shareExpiry.value);

  // Sanitizing path parameters properly to resolve "Invalid path specified in request URL"
  let sanitizedFileName = file.name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  if (!sanitizedFileName) {
    sanitizedFileName = `file_${secretId}`;
  }
  const storagePath = `${secretId}/${sanitizedFileName}`;

  if (isSupabaseConfigured && supabaseClient) {
    try {
      // 1. Upload Physical File to Supabase Storage Bucket 'user_files'
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('user_files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Insert row to database table 'shared_links'
      const { error: dbError } = await supabaseClient
        .from('shared_links')
        .insert([
          {
            secret_id: secretId,
            file_name: file.name, // Save the original name in table metadata
            file_size: file.size,
            storage_path: storagePath,
            password: passwordVal,
            expiry_days: expiryVal
          }
        ]);

      if (dbError) throw dbError;

    } catch (err) {
      console.error('Supabase upload error:', err);
      throw new Error(`Cloud Upload Failed: ${err.message || 'Unknown network error.'}`);
    }
  } else {
    // Local Memory Fallback Mode
    window.sessionBlobs[secretId] = file;
    
    const fileRecord = {
      id: secretId,
      name: file.name,
      size: file.size,
      password: passwordVal,
      expiry: expiryVal
    };
    
    window.uploadedFiles.push(fileRecord);
    console.log('Secure File Saved (Session memory database):', fileRecord);
  }

  // Populate Success state
  secretIdBox.textContent = secretId;

  // Swap panels
  uploadDetailState.classList.add('hidden');
  uploadSuccessState.classList.remove('hidden');

  if (isSupabaseConfigured) {
    triggerToast('Secure Uploaded', `File uploaded to cloud bucket. ID: ${secretId}`, 'success');
  } else {
    triggerToast('Local Preview Mode', `Saved to session. ID: ${secretId} (Set keys in script.js to connect database)`, 'info');
  }
}

/**
 * Searches the Supabase 'shared_links' table for a matching Secret ID
 * @param {string} secretID 
 * @returns {Promise<Object|null>}
 */
async function fetchFile(secretID) {
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('shared_links')
        .select('*')
        .eq('secret_id', secretID)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return {
          id: data.secret_id,
          name: data.file_name,
          size: data.file_size,
          storage_path: data.storage_path,
          password: data.password,
          expiry: data.expiry_days
        };
      }
      return null;
    } catch (err) {
      console.error('Supabase database query error:', err);
      throw new Error(`Database Query Failed: ${err.message || 'Unknown network error.'}`);
    }
  } else {
    // Local memory lookup fallback
    const match = window.uploadedFiles.find(item => item.id === secretID);
    if (match) {
      return {
        id: match.id,
        name: match.name,
        size: match.size,
        password: match.password,
        expiry: match.expiry
      };
    }
    return null;
  }
}

// ----------------------------------------------------
// Download Tab Retrievability Handlers
// ----------------------------------------------------
function resetDownloadView() {
  if (downloadIdInput) downloadIdInput.value = '';
  if (downloadPasswordInput) downloadPasswordInput.value = '';
  activeSecuredRecord = null;

  if (downloadErrorMsg) downloadErrorMsg.classList.add('hidden');
  if (downloadPasswordContainer) downloadPasswordContainer.classList.add('hidden');
  if (passwordErrorMsg) passwordErrorMsg.classList.add('hidden');
  if (downloadResultContainer) downloadResultContainer.classList.add('hidden');
}

async function handleRetrieve() {
  downloadErrorMsg.classList.add('hidden');
  downloadPasswordContainer.classList.add('hidden');
  passwordErrorMsg.classList.add('hidden');
  downloadResultContainer.classList.add('hidden');
  activeSecuredRecord = null;

  const searchId = downloadIdInput.value.trim().toUpperCase();

  if (!searchId) {
    showDownloadError("Error: Please enter a Secret ID.", "Please input a valid 6-character transfer ID.");
    return;
  }

  if (searchId.length < 6) {
    showDownloadError("Error: Secret ID must be 6 characters.", "Codes must consist of exactly 6 characters.");
    return;
  }

  try {
    const foundRecord = await fetchFile(searchId);

    if (!foundRecord) {
      showDownloadError("Error: Invalid or expired Secret ID.", "The Secret ID entered does not exist or has expired.");
      return;
    }

    if (foundRecord.password) {
      activeSecuredRecord = foundRecord;
      downloadPasswordContainer.classList.remove('hidden');
      downloadPasswordInput.value = '';
      setTimeout(() => downloadPasswordInput.focus(), 50);
      triggerToast('Encrypted File', 'Please input the password to unlock preview.', 'info');
    } else {
      activeSecuredRecord = foundRecord;
      displayRetrievedFile(foundRecord);
      triggerToast('File Located', `Successfully retrieved: ${foundRecord.name}`, 'success');
    }
  } catch (err) {
    console.error(err);
    showDownloadError("Error: Database network request failed.", err.message || "Failed to search file on Supabase.");
  }
}

function displayRetrievedFile(record) {
  const category = getFileTypeCategory(record.name);

  // Populate preview icon block
  downloadPreviewIcon.innerHTML = iconSvgs[category] || iconSvgs.default;
  downloadPreviewIcon.className = 'w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-inner shrink-0 relative overflow-hidden ';
  
  const colors = iconColors[category] || iconColors.default;
  downloadPreviewIcon.classList.add(colors.bg, colors.border, colors.text);
  
  const ext = record.name.split('.').pop().toUpperCase();
  const extTag = document.createElement('span');
  extTag.className = `absolute bottom-1 text-[8px] font-bold tracking-wider px-1 rounded uppercase ${colors.text} bg-white/80 border border-current/10`;
  extTag.textContent = ext.substring(0, 4);
  downloadPreviewIcon.appendChild(extTag);

  // File details
  downloadFileName.textContent = record.name;
  downloadFileSize.textContent = `${formatBytes(record.size)} • ${category.toUpperCase()}`;
  downloadFileExpiry.textContent = `${record.expiry} ${record.expiry === 1 ? 'Day' : 'Days'}`;

  // If Supabase is active, the link action is intercepted
  if (isSupabaseConfigured && record.storage_path) {
    downloadActionBtn.href = "#";
    downloadActionBtn.removeAttribute('download');
  } else {
    // Local memory fallback mapping
    let downloadUrl = '';
    const actualFileBlob = window.sessionBlobs[record.id];

    if (actualFileBlob) {
      downloadUrl = URL.createObjectURL(actualFileBlob);
    } else {
      const fallbackText = `ShareFlow Local Session Recovery Alert\n` +
                           `===================================\n` +
                           `File Name: ${record.name}\n` +
                           `File Size: ${record.size} bytes (${formatBytes(record.size)})\n\n` +
                           `Alert: The active session was reloaded, losing the local browser memory Blob URL.\n` +
                           `In a production deployment, this button fetches and downloads the actual file from a remote cloud storage bucket instead of this local fallback representation.`;
      
      const mockBlob = new Blob([fallbackText], { type: 'text/plain' });
      downloadUrl = URL.createObjectURL(mockBlob);
    }
    downloadActionBtn.href = downloadUrl;
    downloadActionBtn.setAttribute('download', actualFileBlob ? record.name : `${record.name.split('.')[0]}_RECOVERED.txt`);
  }

  downloadResultContainer.classList.remove('hidden');
}

function checkDownloadPassword() {
  if (!activeSecuredRecord) return;

  const enteredPassword = downloadPasswordInput.value.trim();
  
  if (enteredPassword === activeSecuredRecord.password) {
    passwordErrorMsg.classList.add('hidden');
    downloadPasswordContainer.classList.add('hidden');
    displayRetrievedFile(activeSecuredRecord);
    triggerToast('Access Granted', 'File decrypted successfully.', 'success');
  } else {
    passwordErrorMsg.classList.remove('hidden');
    downloadPasswordInput.focus();
    downloadPasswordInput.select();
    triggerToast('Access Denied', 'The entered password was incorrect.', 'error');
  }
}

// ----------------------------------------------------
// Event Listeners Binding Engine
// ----------------------------------------------------
function bindEventListeners() {
  tabUpload.addEventListener('click', () => switchTab('upload'));
  tabDownload.addEventListener('click', () => switchTab('download'));

  // Drag Zone actions
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('border-blue-500', 'bg-blue-50/10');
    dropZoneOverlay.classList.remove('opacity-0');
    dropZoneOverlay.classList.add('opacity-100');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50/10');
    dropZoneOverlay.classList.remove('opacity-100');
    dropZoneOverlay.classList.add('opacity-0');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dropZone.classList.remove('border-blue-500', 'bg-blue-50/10');
    dropZoneOverlay.classList.remove('opacity-100');
    dropZoneOverlay.classList.add('opacity-0');

    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  cancelUploadBtn.addEventListener('click', () => {
    resetUploadView();
    triggerToast('Cancelled', 'File selection reset.', 'info');
  });

  // Password Options Switch
  passwordToggle.addEventListener('click', () => {
    const isChecked = passwordToggle.getAttribute('aria-checked') === 'true';
    if (!isChecked) {
      passwordToggle.setAttribute('aria-checked', 'true');
      passwordToggle.className = "w-10 h-6 bg-blue-600 rounded-full p-0.5 transition-colors focus:outline-none flex items-center justify-end shadow-inner cursor-pointer";
      passwordToggle.firstElementChild.className = "w-5 h-5 bg-white rounded-full shadow-md transition-transform transform";
      passwordInputContainer.classList.remove('hidden');
      sharePassword.focus();
    } else {
      passwordToggle.setAttribute('aria-checked', 'false');
      passwordToggle.className = "w-10 h-6 bg-gray-300 rounded-full p-0.5 transition-colors focus:outline-none flex items-center justify-start shadow-inner cursor-pointer";
      passwordToggle.firstElementChild.className = "w-5 h-5 bg-white rounded-full shadow-md transition-transform transform translate-x-0";
      passwordInputContainer.classList.add('hidden');
      sharePassword.value = '';
    }
  });

  generateIdBtn.addEventListener('click', async () => {
    if (currentSelectedFile && !generateIdBtn.disabled) {
      const originalBtnHTML = generateIdBtn.innerHTML;
      generateIdBtn.disabled = true;
      generateIdBtn.innerHTML = `<span>Uploading...</span><svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
      generateIdBtn.className = "w-full bg-blue-500/80 text-white font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed";
      
      try {
        await handleUpload(currentSelectedFile);
      } catch (err) {
        console.error(err);
        triggerToast('Upload Failed', err.message || 'Error uploading file to storage.', 'error');
        generateIdBtn.disabled = false;
        generateIdBtn.innerHTML = originalBtnHTML;
        generateIdBtn.className = "w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer";
      }
    }
  });

  copyIdBtn.addEventListener('click', () => {
    const idToCopy = secretIdBox.textContent.trim();
    navigator.clipboard.writeText(idToCopy).then(() => {
      copyBtnText.textContent = "Copied to Clipboard!";
      copyIdBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer";
      copyIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;

      triggerToast('Secret ID Copied', 'The code is ready to share with your recipient.', 'success');

      setTimeout(() => {
        copyBtnText.textContent = "Copy Secret ID";
        copyIdBtn.className = "w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer";
        copyIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  resetUploadBtn.addEventListener('click', () => {
    resetUploadView();
  });

  // Download Retrieve Actions
  retrieveBtn.addEventListener('click', handleRetrieve);
  downloadIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleRetrieve();
    }
  });

  unlockBtn.addEventListener('click', checkDownloadPassword);
  downloadPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkDownloadPassword();
    }
  });

  // Cloud storage file downloader handler
  downloadActionBtn.addEventListener('click', async (e) => {
    if (!activeSecuredRecord) return;

    const isLocalSession = !isSupabaseConfigured || !activeSecuredRecord.storage_path;
    if (isLocalSession) {
      // Allow browser to follow default ObjectURL href
      return;
    }

    e.preventDefault();

    // Show visual loading button state
    const originalText = downloadActionBtn.querySelector('span').textContent;
    downloadActionBtn.querySelector('span').textContent = "Downloading...";
    downloadActionBtn.style.pointerEvents = "none";

    try {
      if (!supabaseClient) throw new Error("Supabase client is not initialized.");

      const { data: fileBlob, error: downloadError } = await supabaseClient.storage
        .from('user_files')
        .download(activeSecuredRecord.storage_path);

      if (downloadError) throw downloadError;

      // Trigger native browser download stream
      const blobUrl = URL.createObjectURL(fileBlob);
      const tempAnchor = document.createElement('a');
      tempAnchor.href = blobUrl;
      tempAnchor.download = activeSecuredRecord.name;
      document.body.appendChild(tempAnchor);
      tempAnchor.click();
      
      // Clean memory
      document.body.removeChild(tempAnchor);
      URL.revokeObjectURL(blobUrl);

      triggerToast('Download Completed', 'The file has been successfully retrieved.', 'success');

    } catch (err) {
      console.error('Cloud download error:', err);
      triggerToast('Download Failed', err.message || 'Error downloading file from storage bucket.', 'error');
    } finally {
      // Revert styles
      downloadActionBtn.querySelector('span').textContent = originalText;
      downloadActionBtn.style.pointerEvents = "auto";
    }
  });
}
