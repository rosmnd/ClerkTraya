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
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    if (window.matchMedia('(min-width: 1025px)').matches) return;
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
  });
  document.getElementById('sidebarToggleDesktop').addEventListener('click', () => {
    if (window.matchMedia('(min-width: 1025px)').matches) {
      AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
      document.body.classList.toggle('sidebar-collapsed', AppState.sidebarCollapsed);
      savePreference('sagiprekord-sidebar-collapsed', String(AppState.sidebarCollapsed));
      syncSidebarControls();
      return;
    }
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 1025px)').matches) setSidebarOpen(false);
    syncSidebarControls();
  });
}

function initializeWizard() {
  const documentInput = document.getElementById('documentInput');
  const dropZone = document.getElementById('dropZone');

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
      showToast(data.mode === 'demo_fallback'
        ? 'Demo OCR text loaded. Review it before saving.'
        : 'Document text extracted. Review it before saving.', 'success');
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
    ['recordId', 'originalOcrStore', 'residentName', 'referenceNo', 'amountOrDate', 'purokAddress', 'verifiedOcrText', 'verifiedAiAdvice', 'correctionNote', 'customQuestion'].forEach(id => {
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

document.addEventListener('DOMContentLoaded', () => {
  initializeSidebar();
  document.getElementById('sessionDisplayName').textContent = SessionModule.getContext().displayName;
  document.querySelectorAll('.language-option').forEach(button => {
    button.addEventListener('click', () => I18n.setLanguage(button.dataset.language));
  });
  I18n.setLanguage(AppState.currentLanguage);
  initializeWizard();
  initializePrintSlip();
  initializeVault();
  AiChatAndChecklistModule.renderChecklist();
  WizardModule.syncStickyContext();
  NavigationModule.switchModule('dashboard');
  syncSidebarControls();
  updateDashboardMetrics();
  initializeRecords();
});
