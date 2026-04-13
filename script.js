/* ============================================
   VidQR — Script
   ============================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode/+esm'

(function () {
    'use strict';

    // ---------- Supabase Config ----------
    // IMPORTANT: Replace these with your actual Supabase project credentials
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    
    let supabase = null;
    let isSupabaseConfigured = false;

    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        try {
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isSupabaseConfigured = true;
        } catch (e) {
            console.error('Failed to initialize Supabase:', e);
        }
    }

    // ---------- Constants ----------
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
    const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/avi'];
    const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    // ---------- DOM Elements ----------
    const tabLink = document.getElementById('tab-link');
    const tabUpload = document.getElementById('tab-upload');
    const tabIndicator = document.getElementById('tab-indicator');
    const panelLink = document.getElementById('panel-link');
    const panelUpload = document.getElementById('panel-upload');

    const videoUrlInput = document.getElementById('video-url');
    const btnGenerateLink = document.getElementById('btn-generate-link');

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const browseLink = document.getElementById('browse-link');
    const dropzoneContent = document.getElementById('dropzone-content');
    const fileInfo = document.getElementById('file-info');
    const videoPreview = document.getElementById('video-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const btnRemove = document.getElementById('btn-remove');
    const btnGenerateUpload = document.getElementById('btn-generate-upload');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');

    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    const resultCard = document.getElementById('result-card');
    const resultUrl = document.getElementById('result-url');
    const qrCanvas = document.getElementById('qr-canvas');
    const btnDownload = document.getElementById('btn-download');
    const btnCopy = document.getElementById('btn-copy');
    const btnNew = document.getElementById('btn-new');

    // ---------- State ----------
    let currentMode = 'link';
    let selectedFile = null;
    let blobUrl = null;

    // ---------- Tab Switching ----------
    function switchMode(mode) {
        currentMode = mode;
        hideError();

        // Update tabs
        tabLink.classList.toggle('active', mode === 'link');
        tabUpload.classList.toggle('active', mode === 'upload');
        tabIndicator.classList.toggle('right', mode === 'upload');

        // Update panels
        panelLink.classList.toggle('active', mode === 'link');
        panelUpload.classList.toggle('active', mode === 'upload');

        // Re-trigger animation
        const activePanel = mode === 'link' ? panelLink : panelUpload;
        activePanel.style.animation = 'none';
        activePanel.offsetHeight; // force reflow
        activePanel.style.animation = '';
    }

    tabLink.addEventListener('click', () => switchMode('link'));
    tabUpload.addEventListener('click', () => switchMode('upload'));

    // ---------- Link Mode ----------
    videoUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            generateFromLink();
        }
    });

    btnGenerateLink.addEventListener('click', generateFromLink);

    function generateFromLink() {
        hideError();
        const url = videoUrlInput.value.trim();

        if (!url) {
            showError('Please enter a video URL.');
            return;
        }

        if (!isValidUrl(url)) {
            showError('Please enter a valid URL (starting with http:// or https://).');
            return;
        }

        generateQR(url);
    }

    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    // ---------- Upload Mode: Drag & Drop ----------
    browseLink.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener('click', (e) => {
        if (!selectedFile && e.target !== btnRemove && !btnRemove.contains(e.target)) {
            fileInput.click();
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        hideError();

        // Validate type
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
            showError('Unsupported file format. Please use MP4, MOV, AVI, MKV, or WEBM.');
            return;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            showError(`File is too large (${formatFileSize(file.size)}). Maximum size is 500 MB.`);
            return;
        }

        selectedFile = file;

        // Show file info
        dropzoneContent.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        // Video preview
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
        }
        blobUrl = URL.createObjectURL(file);
        videoPreview.src = blobUrl;
        videoPreview.load();
        videoPreview.currentTime = 1; // seek to 1s for thumbnail

        // Enable generate button
        btnGenerateUpload.disabled = false;

        // Update dropzone style
        dropzone.style.borderStyle = 'solid';
        dropzone.style.borderColor = 'rgba(124, 92, 252, 0.3)';
        dropzone.style.cursor = 'default';
    }

    btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile();
    });

    function removeFile() {
        selectedFile = null;
        fileInput.value = '';

        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
        }

        videoPreview.src = '';
        dropzoneContent.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        btnGenerateUpload.disabled = true;

        dropzone.style.borderStyle = '';
        dropzone.style.borderColor = '';
        dropzone.style.cursor = '';

        hideError();
    }

    btnGenerateUpload.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('Please select a video file first.');
            return;
        }
        hideError();

        if (!isSupabaseConfigured) {
            showError('Please configure your Supabase URL and Key in script.js first.');
            return;
        }

        // Show loading/progress state
        btnGenerateUpload.classList.add('loading');
        btnGenerateUpload.disabled = true;
        uploadProgress.classList.remove('hidden');
        progressBarFill.style.width = '0%';
        progressText.textContent = 'Preparing upload...';

        try {
            const fileName = `video-${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = `videos/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('vidqr-videos') // Assumes a bucket named 'vidqr-videos' exists
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get Public URL
            progressText.textContent = 'Generating permanent link...';
            const { data: { publicUrl } } = supabase.storage
                .from('vidqr-videos')
                .getPublicUrl(filePath);

            generateQR(publicUrl);
            
            // Hide progress after success
            setTimeout(() => {
                uploadProgress.classList.add('hidden');
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            showError('Failed to upload video to cloud. ' + (error.message || 'Check your connection.'));
            btnGenerateUpload.classList.remove('loading');
            btnGenerateUpload.disabled = false;
        }
    });

    // Dummy progress simulator (Supabase JS SDK upload doesn't have native progress callback in basic upload)
    // To implement real progress, we'd use XHR or a specialized library, but for simplicity:
    function simulateProgress() {
        let p = 0;
        const interval = setInterval(() => {
            if (p >= 90) {
                clearInterval(interval);
                return;
            }
            p += Math.random() * 5;
            progressBarFill.style.width = `${Math.min(p, 90)}%`;
            progressText.textContent = `Uploading to cloud (${Math.round(p)}%)`;
        }, 300);
        return interval;
    }

    // ---------- QR Code Generation ----------
    function generateQR(url) {
        // Show loading state on the active button
        const btn = currentMode === 'link' ? btnGenerateLink : btnGenerateUpload;
        btn.classList.add('loading');
        btn.disabled = true;

        // Clear previous QR
        const ctx = qrCanvas.getContext('2d');
        ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);

        // Generate QR code
        QRCode.toCanvas(qrCanvas, url, {
            width: 200,
            margin: 2,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        }, function (error) {
            // Remove loading state
            btn.classList.remove('loading');
            btn.disabled = (currentMode === 'upload' && !selectedFile);

            if (error) {
                showError('Failed to generate QR code. The URL might be too long.');
                console.error('QR generation error:', error);
                return;
            }

            // Show result
            const displayUrl = url.startsWith('blob:') ? `Local Video: ${selectedFile?.name || 'video'}` : url;
            resultUrl.textContent = displayUrl.length > 80 ? displayUrl.substring(0, 80) + '...' : displayUrl;
            resultCard.classList.remove('hidden');

            // Scroll to result smoothly
            setTimeout(() => {
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        });
    }

    // ---------- Result Actions ----------
    btnDownload.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'vidqr-code.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    });

    btnCopy.addEventListener('click', async () => {
        try {
            const blob = await new Promise((resolve) => {
                qrCanvas.toBlob(resolve, 'image/png');
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            btnCopy.classList.add('copied');
            const originalHTML = btnCopy.innerHTML;
            btnCopy.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `;

            setTimeout(() => {
                btnCopy.classList.remove('copied');
                btnCopy.innerHTML = originalHTML;
            }, 2000);
        } catch {
            showError('Unable to copy image. Try downloading instead.');
        }
    });

    btnNew.addEventListener('click', () => {
        resultCard.classList.add('hidden');
        videoUrlInput.value = '';
        removeFile();

        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ---------- Helpers ----------
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');

        // Re-trigger shake animation
        errorMessage.style.animation = 'none';
        errorMessage.offsetHeight;
        errorMessage.style.animation = '';
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // ---------- Keyboard Accessibility ----------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideError();
        }
    });

})();
