const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
let previewObjectUrl = null;

function updateRecords(records) {
  if (!Array.isArray(records)) throw new Error('The server returned an invalid records list.');
  AppState.recordsCache = records;
  VaultModule.renderVault();
  updateDashboardMetrics(records);
}

function setSidebarOpen(open) {
  const sidebar = document.getElementById('appSidebar');
  const focusWasInside = sidebar.contains(document.activeElement);
  document.body.classList.toggle('sidebar-open', open);
  syncSidebarControls();
  if (open) sidebar.querySelector('.sidebar-link')?.focus();
  else if (focusWasInside) document.getElementById('sidebarToggle')?.focus();
}

function resetVerificationForEdit() {
  AppState.step2Verified = false;
  AppState.step3Complete = false;
  document.getElementById('step2Check').classList.add('hidden');
  document.getElementById('step3Check').classList.add('hidden');
  document.getElementById('verifiedAiAdvice').value = '';
  document.getElementById('aiStatusText').textContent = 'Ready';
  AppState.currentChecklist = [];
  AiChatAndChecklistModule.renderChecklist();
}

function setDocumentText(text, title) {
  const cleanText = String(text || '').trim();
  if (!cleanText) throw new Error('No readable text was returned. Try another document or use a demo paper.');

  resetVerificationForEdit();
  document.getElementById('recordId').value = '';
  document.getElementById('residentAccountEmail').value = '';
  document.getElementById('docType').selectedIndex = 0;
  document.getElementById('priorityLevel').selectedIndex = 0;
  document.getElementById('originalOcrStore').value = cleanText;
  document.getElementById('rawOcrComparison').textContent = cleanText;
  document.getElementById('verifiedOcrText').value = cleanText;
  document.getElementById('fileNameDisplay').textContent = title;
  OcrAndVerifyModule.autoExtractMetadata(cleanText);
  OcrAndVerifyModule.updateDiffAudit();
  document.getElementById('step1Check').classList.remove('hidden');
  NavigationModule.switchModule('wizard');
  WizardModule.goToStep(2);
}

function renderFilePreview(file) {
  const previewBox = document.getElementById('previewBox');
  document.getElementById('fileNameDisplay').textContent = file.name;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);

  if (file.type.startsWith('image/')) {
    previewObjectUrl = URL.createObjectURL(file);
    const image = document.createElement('img');
    image.src = previewObjectUrl;
    image.alt = `Preview of ${file.name}`;
    image.className = 'max-h-36 object-contain rounded-lg shadow-xs';
    previewBox.replaceChildren(image);
  } else {
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-file-pdf text-3xl text-indigo-600 mb-1';
    const name = document.createElement('span');
    name.className = 'text-xs font-bold text-slate-600';
    name.textContent = file.name;
    previewBox.replaceChildren(icon, name);
  }
}

// Keep capture sources behind the same validation and OCR flow; camera capture can
// be added at documentInput without requesting device permissions during page load.
function validateUpload(file) {
  if (!file) {
    showToast('Choose an image or PDF before starting the scan.', 'warning');
    return false;
  }
  if (!ACCEPTED_FILE_TYPES.has(file.type)) {
    showToast('Use a JPEG, PNG, WebP image, or PDF document.', 'warning');
    return false;
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    showToast('Documents must be smaller than 10 MB.', 'warning');
    return false;
  }
  return true;
}

function initializeSidebar() {
  document.body.classList.toggle('sidebar-collapsed', AppState.sidebarCollapsed);
  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1025px)').matches) {
      AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
      document.body.classList.toggle('sidebar-collapsed', AppState.sidebarCollapsed);
      savePreference('sagiprekord-sidebar-collapsed', String(AppState.sidebarCollapsed));
      syncSidebarControls();
      return;
    }
    if (window.matchMedia('(min-width: 701px)').matches) {
      document.body.classList.toggle('sidebar-expanded');
      syncSidebarControls();
      return;
    }
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
  };
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    if (!window.matchMedia('(min-width: 1025px)').matches) toggleSidebar();
  });
  document.getElementById('sidebarToggleDesktop').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 700px)').matches) setSidebarOpen(false);
    if (!window.matchMedia('(min-width: 701px) and (max-width: 1024px)').matches) {
      document.body.classList.remove('sidebar-expanded');
    }
    syncSidebarControls();
  });
}

function initializeCamera(documentInput) {
  const modal = document.getElementById('cameraModal');
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const openButton = document.getElementById('openCameraBtn');
  if (!modal || !video || !canvas || !openButton) return;

  const status = document.getElementById('cameraStatus');
  const captureButton = document.getElementById('capturePhotoBtn');
  const retakeButton = document.getElementById('retakePhotoBtn');
  const useButton = document.getElementById('usePhotoBtn');
  const closeButton = document.getElementById('closeCameraModal');
  let stream = null;
  let capturedPhoto = null;
  let requestId = 0;

  function stopCamera() {
    requestId++;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    capturedPhoto = null;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    openButton.focus();
  }

  openButton.addEventListener('click', async () => {
    stopCamera();
    const currentRequest = ++requestId;
    capturedPhoto = null;
    video.classList.remove('hidden');
    canvas.classList.add('hidden');
    captureButton.disabled = true;
    captureButton.classList.remove('hidden');
    retakeButton.classList.add('hidden');
    useButton.classList.add('hidden');
    status.textContent = 'Starting camera…';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    closeButton.focus();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      status.textContent = 'Camera access is not available. Use HTTPS or localhost, or upload a photo instead.';
      showToast('Camera access is unavailable. Use HTTPS or localhost, or upload a photo.', 'error');
      return;
    }

    try {
      const activeStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
      });
      if (currentRequest !== requestId) {
        activeStream.getTracks().forEach(track => track.stop());
        return;
      }

      stream = activeStream;
      video.srcObject = activeStream;
      await video.play();
      if (currentRequest === requestId) {
        captureButton.disabled = false;
        status.textContent = 'Camera ready. Center the document and capture when it is clear.';
        captureButton.focus();
      }
    } catch (error) {
      if (currentRequest !== requestId) return;
      stopCamera();
      const message = error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow access in browser settings, or upload a photo instead.'
        : 'Could not start the camera. Check that a camera is connected and try again, or upload a photo.';
      status.textContent = message;
      showToast(message, 'error');
    }
  });

  captureButton.addEventListener('click', () => {
    if (!video.videoWidth || !video.videoHeight) {
      showToast('The camera is not ready yet. Please wait a moment and try again.', 'warning');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      showToast('Could not capture the photo. Please try again.', 'error');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        showToast('Could not capture the photo. Please try again.', 'error');
        return;
      }
      capturedPhoto = new File([blob], `sagiprekord-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      video.classList.add('hidden');
      canvas.classList.remove('hidden');
      status.textContent = 'Photo captured. Retake it or use it to scan your document.';
      captureButton.classList.add('hidden');
      retakeButton.classList.remove('hidden');
      useButton.classList.remove('hidden');
      retakeButton.focus();
    }, 'image/jpeg', 0.92);
  });

  retakeButton.addEventListener('click', () => {
    capturedPhoto = null;
    video.classList.remove('hidden');
    canvas.classList.add('hidden');
    status.textContent = 'Camera ready. Center the document and capture when it is clear.';
    captureButton.classList.remove('hidden');
    retakeButton.classList.add('hidden');
    useButton.classList.add('hidden');
    captureButton.focus();
  });

  useButton.addEventListener('click', () => {
    if (!capturedPhoto) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(capturedPhoto);
      documentInput.files = transfer.files;
      documentInput.dispatchEvent(new Event('change', { bubbles: true }));
      closeCamera();
      showToast('Photo added. Select “Read document” to continue.', 'success');
    } catch {
      showToast('This browser could not attach the photo. Please upload it from your device instead.', 'error');
    }
  });

  closeButton.addEventListener('click', closeCamera);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeCamera();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeCamera();
  });
  window.addEventListener('pagehide', stopCamera, { once: true });
}

function initializeWizard() {
  const documentInput = document.getElementById('documentInput');
  const dropZone = document.getElementById('dropZone');
  initializeCamera(documentInput);

  documentInput.addEventListener('change', () => {
    const file = documentInput.files?.[0];
    if (!file) return;
    if (!validateUpload(file)) {
      documentInput.value = '';
      return;
    }
    renderFilePreview(file);
  });

  dropZone.addEventListener('dragover', event => {
    event.preventDefault();
    dropZone.classList.add('drag-active');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
  dropZone.addEventListener('drop', event => {
    event.preventDefault();
    dropZone.classList.remove('drag-active');
    const file = event.dataTransfer?.files[0];
    if (!file || !validateUpload(file)) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      documentInput.files = transfer.files;
      renderFilePreview(file);
    } catch {
      showToast('This browser could not attach the dropped file. Please use the file picker.', 'warning');
    }
  });

  document.getElementById('ocrForm').addEventListener('submit', async event => {
    event.preventDefault();
    const file = documentInput.files?.[0];
    if (!validateUpload(file)) return;

    const button = document.getElementById('ocrBtn');
    const formData = new FormData();
    formData.append('document', file);
    setButtonLoading(button, true, 'Reading document...');
    try {
      const data = await requestApi('ocr', { method: 'POST', body: formData });
      setDocumentText(data.raw_text, file.name);
      showToast('Document text extracted. Review it before saving.', 'success');
    } catch (error) {
      showToast(error.message || 'The document could not be scanned.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });

  document.getElementById('verifiedOcrText').addEventListener('input', () => {
    OcrAndVerifyModule.updateDiffAudit();
    resetVerificationForEdit();
  });
  ['docType', 'residentName', 'referenceNo', 'priorityLevel', 'amountOrDate', 'purokAddress'].forEach(id => {
    const field = document.getElementById(id);
    ['input', 'change'].forEach(eventName => field.addEventListener(eventName, () => {
      WizardModule.syncStickyContext();
      if (AppState.currentStep >= 2 && AppState.currentStep < 3) resetVerificationForEdit();
    }));
  });

  document.getElementById('toggleDiffBtn').addEventListener('click', () => {
    const drawer = document.getElementById('diffDrawer');
    const isOpen = drawer.classList.toggle('hidden') === false;
    document.getElementById('ocrComparisonGrid').classList.toggle('md:grid-cols-2', isOpen);
    document.getElementById('toggleDiffBtn').setAttribute('aria-expanded', String(isOpen));
  });
  document.getElementById('restoreOriginalBtn').addEventListener('click', () => {
    const original = document.getElementById('originalOcrStore').value;
    if (!original) return;
    document.getElementById('verifiedOcrText').value = original;
    OcrAndVerifyModule.updateDiffAudit();
    resetVerificationForEdit();
    showToast('Restored the original extracted text.', 'info');
  });
  document.getElementById('proceedToStep3Btn').addEventListener('click', () => {
    if (!WizardModule.validateMetadata()) return;
    AppState.step2Verified = true;
    document.getElementById('step2Check').classList.remove('hidden');
    if (!WizardModule.goToStep(3)) return;
    if (!document.getElementById('verifiedAiAdvice').value.trim()) {
      AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
    }
  });
  document.getElementById('explainBtn').addEventListener('click', () => {
    AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
  });
  document.getElementById('askCustomBtn').addEventListener('click', () => {
    const input = document.getElementById('customQuestion');
    if (!input.value.trim()) {
      input.focus();
      showToast('Enter a question for the document assistant.', 'warning');
      return;
    }
    AiChatAndChecklistModule.runLumenChat(input.value.trim());
  });
  document.getElementById('customQuestion').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('askCustomBtn').click();
  });
  document.querySelectorAll('.prompt-pill').forEach(button => {
    button.addEventListener('click', () => AiChatAndChecklistModule.runLumenChat(button.dataset.prompt || ''));
  });
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    if (!text) {
      input.focus();
      showToast('Enter an action step before adding it.', 'warning');
      return;
    }
    if (text.length > 1000 || AppState.currentChecklist.length >= 100) {
      showToast('Checklist text must be under 1,000 characters and the list is limited to 100 steps.', 'warning');
      return;
    }
    AppState.currentChecklist.push({ text, done: false });
    input.value = '';
    AiChatAndChecklistModule.renderChecklist();
  });
  document.getElementById('checklistContainer').addEventListener('change', event => {
    const index = event.target.dataset.checklistIndex;
    if (index !== undefined) AiChatAndChecklistModule.toggleItem(Number(index));
  });
  document.getElementById('checklistContainer').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-checklist-index]');
    if (button) AiChatAndChecklistModule.removeItem(Number(button.dataset.removeChecklistIndex));
  });

  document.getElementById('saveRecordBtn').addEventListener('click', async event => {
    if (!WizardModule.validateMetadata()) return;
    const verifiedText = document.getElementById('verifiedOcrText').value.trim();
    if (!verifiedText) {
      showToast('There is no verified document text to save.', 'warning');
      return;
    }
    if (!document.getElementById('verifiedAiAdvice').value.trim()) {
      showToast('Generate or enter document guidance before saving the verified record.', 'warning');
      document.getElementById('explainBtn').focus();
      return;
    }
    const payload = {
      id: document.getElementById('recordId').value,
      doc_type: document.getElementById('docType').value,
      priority_level: document.getElementById('priorityLevel').value,
      resident_name: document.getElementById('residentName').value.trim(),
      owner_email: document.getElementById('residentAccountEmail').value.trim(),
      reference_no: document.getElementById('referenceNo').value.trim(),
      amount_or_date: document.getElementById('amountOrDate').value.trim(),
      purok_address: document.getElementById('purokAddress').value.trim(),
      original_ocr: document.getElementById('originalOcrStore').value || verifiedText,
      verified_ocr: verifiedText,
      verified_advice: document.getElementById('verifiedAiAdvice').value,
      checklist: AppState.currentChecklist,
      correction_note: document.getElementById('correctionNote').value || 'Checked and verified by user',
      edit_count: AppState.currentEditDistance
    };
    const button = event.currentTarget;
    setButtonLoading(button, true, 'Saving record...');
    try {
      const data = await requestApi('save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      document.getElementById('recordId').value = data.record.id;
      updateRecords(data.records);
      showToast(`Saved verified record ${data.record.id}.`, 'success');
      NavigationModule.switchModule('vault');
    } catch (error) {
      showToast(error.message || 'The record could not be saved.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });

  document.getElementById('clearFormBtn').addEventListener('click', () => {
    ['recordId', 'originalOcrStore', 'residentName', 'residentAccountEmail', 'referenceNo', 'amountOrDate', 'purokAddress', 'verifiedOcrText', 'verifiedAiAdvice', 'correctionNote', 'customQuestion'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('docType').selectedIndex = 0;
    document.getElementById('priorityLevel').selectedIndex = 0;
    document.getElementById('rawOcrComparison').textContent = '';
    document.getElementById('fileNameDisplay').textContent = 'Drag & Drop Image or PDF Document Here';
    document.getElementById('previewBox').innerHTML = '<i class="fa-regular fa-file-lines text-3xl text-slate-300 mb-2"></i><p class="text-xs font-bold text-slate-500">No Document Loaded Yet</p><p class="text-[11px] text-slate-400 mt-0.5">Upload a file or pick a Demo Paper in Step 1</p>';
    documentInput.value = '';
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    ['step1Check', 'step2Check', 'step3Check'].forEach(id => document.getElementById(id).classList.add('hidden'));
    AppState.step2Verified = false;
    AppState.step3Complete = false;
    AppState.currentChecklist = [];
    AppState.currentEditDistance = 0;
    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    WizardModule.syncStickyContext();
    WizardModule.goToStep(1);
    showToast('The document wizard is ready for a new scan.', 'info');
  });
}

function initializePrintSlip() {
  const modal = document.getElementById('slipModal');
  document.getElementById('previewSlipBtn').addEventListener('click', () => {
    const body = document.getElementById('slipModalBody');
    const fields = [
      ['Resident / Name:', document.getElementById('residentName').value || 'N/A'],
      ['Reference / Stub #:', document.getElementById('referenceNo').value || 'N/A'],
      ['Category:', document.getElementById('docType').value],
      ['Amount / Date:', document.getElementById('amountOrDate').value || 'N/A']
    ];
    body.replaceChildren();
    const summary = document.createElement('div');
    summary.className = 'grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200';
    fields.forEach(([label, value]) => {
      const field = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = label;
      field.append(strong, document.createTextNode(` ${value}`));
      summary.appendChild(field);
    });
    const textSection = document.createElement('div');
    const textLabel = document.createElement('strong');
    textLabel.className = 'block mb-1 text-slate-700';
    textLabel.textContent = `Human-Verified Document Text (${AppState.currentEditDistance} edits):`;
    const pre = document.createElement('pre');
    pre.className = 'bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono whitespace-pre-wrap text-[11px]';
    pre.textContent = document.getElementById('verifiedOcrText').value;
    textSection.append(textLabel, pre);

    const adviceSection = document.createElement('div');
    const adviceLabel = document.createElement('strong');
    adviceLabel.className = 'block mb-1 text-slate-700';
    adviceLabel.textContent = 'Document guidance:';
    const advice = document.createElement('p');
    advice.className = 'bg-purple-50 p-2.5 rounded-xl border border-purple-200 whitespace-pre-wrap';
    advice.textContent = document.getElementById('verifiedAiAdvice').value || 'N/A';
    adviceSection.append(adviceLabel, advice);

    const listSection = document.createElement('div');
    const listLabel = document.createElement('strong');
    listLabel.className = 'block mb-1 text-slate-700';
    listLabel.textContent = 'Action checklist:';
    const list = document.createElement('ul');
    list.className = 'space-y-1 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200';
    AppState.currentChecklist.forEach(task => {
      const item = document.createElement('li');
      item.textContent = `${task.done ? '[x] ' : '[ ] '}${task.text}`;
      list.appendChild(item);
    });
    if (!AppState.currentChecklist.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No checklist items added yet.';
      list.appendChild(empty);
    }
    listSection.append(listLabel, list);
    body.append(summary, textSection, adviceSection, listSection);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('closeSlipModal').focus();
  });

  ['closeSlipModal', 'closeSlipBtn2'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  });
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });
}

function initializeVault() {
  ['vaultSearch', 'vaultFilter', 'vaultPriorityFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => VaultModule.renderVault());
  });
  document.getElementById('vaultList').addEventListener('click', event => {
    const editButton = event.target.closest('[data-open-record]');
    if (editButton) {
      VaultModule.openRecord(editButton.dataset.openRecord);
      return;
    }
    const deleteButton = event.target.closest('[data-delete-record]');
    if (deleteButton) VaultModule.deleteRecord(deleteButton.dataset.deleteRecord);
  });
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (!AppState.recordsCache.length) {
      showToast('There are no records to export.', 'warning');
      return;
    }
    const headers = ['Record ID', 'Category', 'Resident Name', 'Reference No', 'Amount/Date', 'Address', 'Priority', 'Human Edits', 'Verification Note', 'Updated At'];
    const csvCell = value => {
      let text = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = AppState.recordsCache.map(record => [
      record.id, record.doc_type, record.resident_name, record.reference_no, record.amount_or_date,
      record.purok_address, record.priority_level, record.edit_count, record.correction_note, record.updated_at
    ].map(csvCell).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SagipRekord_Vault_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Exported the records vault to CSV.', 'success');
  });
}

async function initializeRecords() {
  // Offline persistence can be introduced here without changing the vault renderer.
  try {
    const data = await requestApi('list');
    updateRecords(data.records);
  } catch (error) {
    showToast(error.message || 'Could not load saved records from the backend.', 'error');
  }
}

function roleLabel(role) {
  return ({ resident: 'Resident', worker: 'Barangay / Health Worker', admin: 'Administrator' })[role] || 'User';
}

function initializeRoleUI(user) {
  document.getElementById('sessionDisplayName').textContent = user.name;
  document.getElementById('sessionRole').textContent = roleLabel(user.role);
  document.getElementById('sessionAvatar').textContent = user.name.trim().charAt(0).toUpperCase() || 'U';
  document.querySelectorAll('.worker-admin-only').forEach(element => {
    element.hidden = !['worker', 'admin'].includes(user.role);
  });

  document.querySelectorAll('.sidebar-link[data-module]').forEach(link => {
    link.hidden = !AuthModule.hasPermission(link.dataset.module)
      || !document.getElementById(`module-${link.dataset.module}`);
  });
  const welcomeTitle = document.querySelector('[data-i18n="welcomeTitle"]');
  if (welcomeTitle) welcomeTitle.textContent = user.role === 'resident'
    ? `Welcome, ${user.name}.`
    : user.role === 'worker' ? 'Barangay service workspace.' : 'Administrator workspace.';
  if (user.role === 'resident') {
    document.querySelector('.heading-muted').textContent = 'Your personal records, within reach.';
    document.querySelector('.welcome-copy').textContent = 'Upload your documents, get clear guidance, and keep track of your own records.';
  } else if (user.role === 'worker') {
    document.querySelector('.heading-muted').textContent = 'Community records, handled with care.';
    document.querySelector('.welcome-copy').textContent = 'Review resident documents, verify details, and keep community records organized.';
  } else {
    document.querySelector('.heading-muted').textContent = 'Your system overview, all in one place.';
    document.querySelector('.welcome-copy').textContent = 'Manage accounts, review system activity, and access community records.';
  }
}

function initializeAdmin() {
  const form = document.getElementById('adminUserForm');
  if (!form) return;
  const userMessage = document.getElementById('adminUserMessage');

  const setUserMessage = (text, type = 'error') => {
    userMessage.textContent = text;
    userMessage.className = text ? `auth-message auth-message--${type}` : 'auth-message';
    if (text) userMessage.setAttribute('role', type === 'error' ? 'alert' : 'status');
  };

  const resetForm = () => {
    form.reset();
    document.getElementById('adminUserId').value = '';
    document.getElementById('adminUserActive').checked = true;
    document.getElementById('adminFormTitle').textContent = 'Create account';
    document.getElementById('adminUserPassword').required = true;
    document.getElementById('adminPasswordHint').textContent = '(required, at least 8 characters)';
    setUserMessage('');
  };

  async function loadAdminData() {
    const [usersData, auditData] = await Promise.all([
      requestApi('admin_users'),
      requestApi('admin_audit'),
    ]);
    document.getElementById('adminUsersList').innerHTML = usersData.users.map(user => `
      <article class="admin-user-row">
        <div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)} · ${escapeHtml(roleLabel(user.role))}${user.active ? '' : ' · Inactive'}</span></div>
        <div class="admin-user-actions">
          <button type="button" class="secondary-button" data-edit-user="${escapeHtml(user.id)}">Edit</button>
          <button type="button" class="secondary-button" data-toggle-user="${escapeHtml(user.id)}" ${user.id === AuthModule.currentUser.id ? 'disabled' : ''}>${user.active ? 'Deactivate' : 'Activate'}</button>
        </div>
      </article>
    `).join('') || '<p class="admin-empty">No accounts found.</p>';
    document.getElementById('adminAuditList').innerHTML = auditData.events.map(event => `
      <article class="admin-audit-row">
        <strong>${escapeHtml(event.event)}</strong>
        <span>${escapeHtml(event.actor_name)} · ${escapeHtml(event.actor_role)} · ${escapeHtml(event.timestamp)}</span>
        ${event.details?.record_id ? `<span>Record: ${escapeHtml(event.details.record_id)}</span>` : ''}
        ${event.details?.user_id ? `<span>Account: ${escapeHtml(event.details.user_id)}</span>` : ''}
      </article>
    `).join('') || '<p class="admin-empty">No activity recorded yet.</p>';
  }

  document.getElementById('adminResetUser').addEventListener('click', resetForm);
  document.getElementById('adminUsersList').addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-user]');
    const toggleButton = event.target.closest('[data-toggle-user]');
    try {
      if (editButton) {
        const { users } = await requestApi('admin_users');
        const user = users.find(item => item.id === editButton.dataset.editUser);
        if (!user) throw new Error('The account could not be found.');
        document.getElementById('adminUserId').value = user.id;
        document.getElementById('adminUserName').value = user.name;
        document.getElementById('adminUserEmail').value = user.email;
        document.getElementById('adminUserRole').value = user.role;
        document.getElementById('adminUserActive').checked = user.active;
        document.getElementById('adminUserPassword').value = '';
        document.getElementById('adminUserPassword').required = false;
        document.getElementById('adminPasswordHint').textContent = '(leave blank to keep current password)';
        document.getElementById('adminFormTitle').textContent = 'Edit account';
        setUserMessage('');
        document.getElementById('adminUserName').focus();
      } else if (toggleButton) {
        const { users } = await requestApi('admin_users');
        const user = users.find(item => item.id === toggleButton.dataset.toggleUser);
        if (!user) throw new Error('The account could not be found.');
        const result = await requestApi('admin_users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'update',
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: !user.active,
            password: ''
          })
        });
        if (result.user.id === AuthModule.currentUser.id) AuthModule.currentUser = result.user;
        await loadAdminData();
        showToast(`Account ${result.user.active ? 'activated' : 'deactivated'}.`, 'success');
      }
    } catch (error) {
      showToast(error.message || 'Could not update the account.', 'error');
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const id = document.getElementById('adminUserId').value;
    const payload = {
      operation: id ? 'update' : 'create',
      id,
      name: document.getElementById('adminUserName').value.trim(),
      email: document.getElementById('adminUserEmail').value.trim(),
      role: document.getElementById('adminUserRole').value,
      active: document.getElementById('adminUserActive').checked,
      password: document.getElementById('adminUserPassword').value
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await requestApi('admin_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      resetForm();
      await loadAdminData();
      showToast('Account saved.', 'success');
    } catch (error) {
      setUserMessage(error.message || 'Could not save this account.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('adminReloadData').addEventListener('click', async () => {
    try {
      await loadAdminData();
      await loadSystemConfig();
    } catch (error) {
      showToast(error.message || 'Could not load administration data.', 'error');
    }
  });

  async function loadSystemConfig() {
    const data = await requestApi('admin_config');
    document.getElementById('adminSystemConfig').innerHTML = `
      <div class="admin-config-item"><strong>Environment</strong><span>${data.demo_mode ? 'Demo mode forced' : data.lumen_credentials_available ? 'Lumen credentials available' : 'Demo fallback active'}</span></div>
      <div class="admin-config-item"><strong>OCR service</strong><span>${data.ocr_configured ? 'Configured' : 'Demo fallback'}</span></div>
      <div class="admin-config-item"><strong>AI chat</strong><span>${data.chat_configured ? 'Configured' : 'Demo fallback'}</span></div>
      <div class="admin-config-item"><strong>Database</strong><span>${data.database_connected ? 'Connected' : 'Unavailable'}</span></div>
    `;
  }

  loadAdminData().then(loadSystemConfig).catch(error => {
    showToast(error.message || 'Could not load administration data.', 'error');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthModule.requireAuth();
  if (!user) return;
  initializeSidebar();
  document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
      await AuthModule.logout();
    } catch (error) {
      showToast(error.message || 'Could not sign out.', 'error');
    }
  });
  document.querySelectorAll('.language-option').forEach(button => {
    button.addEventListener('click', () => I18n.setLanguage(button.dataset.language));
  });
  I18n.setLanguage(AppState.currentLanguage);
  initializeRoleUI(user);
  if (user.role === 'admin') initializeAdmin();
  initializeWizard();
  initializePrintSlip();
  initializeVault();
  AiChatAndChecklistModule.renderChecklist();
  WizardModule.syncStickyContext();
  const requestedModule = new URLSearchParams(window.location.search).get('view') || AuthModule.defaultModule();
  if (AuthModule.hasPermission(requestedModule)) {
    NavigationModule.switchModule(
      document.getElementById(`module-${requestedModule}`) ? requestedModule : AuthModule.defaultModule()
    );
  } else {
    NavigationModule.switchModule('dashboard');
    showToast('You do not have permission to access this page.', 'error');
  }
  syncSidebarControls();
  updateDashboardMetrics();
  initializeRecords();
});
