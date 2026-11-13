/* =========================================================
   SAGIPREKORD - MODULAR FRONTEND ARCHITECTURE (app.js)
   Structured into 5 clear modules so every team member can
   easily explain their assigned module during judging.
   ========================================================= */

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    showToast('This browser is blocking local preferences; the current choice will last for this visit.', 'warning');
  }
}

// This local context is UI scaffolding only; it is not an authenticated identity.
const AppState = {
  currentModule: 'dashboard',
  session: null,
  currentLanguage: readPreference('sagiprekord-language', 'en') === 'tl' ? 'tl' : 'en',
  sidebarCollapsed: readPreference('sagiprekord-sidebar-collapsed', 'false') === 'true',
  currentStep: 1,
  recordsCache: [],
  currentChecklist: [],
  currentEditDistance: 0,
  activeRequest: null,
  step2Verified: false,
  step3Complete: false
};

const API_BASE_URL = document.querySelector('meta[name="api-base"]')?.content.trim() || './api.php';
const originalTextNodes = new WeakMap();

function apiUrl(action) {
  const separator = API_BASE_URL.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${separator}action=${encodeURIComponent(action)}`;
}

async function requestApi(action, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let response;
  let data;
  try {
    response = await fetch(apiUrl(action), { ...options, signal: controller.signal });
    try {
      data = await response.json();
    } catch {
      throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The server returned an unreadable response')) throw error;
    if (error.name === 'AbortError') throw new Error('The request timed out. Check your connection and try again.');
    throw new Error('Could not reach the SagipRekord server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok || !data || data.success !== true) {
    throw new Error(data?.error || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}

const AuthModule = {
  currentUser: null,
  permissions: {
    resident: ['dashboard', 'wizard', 'vault'],
    worker: ['dashboard', 'wizard', 'vault', 'impact'],
    admin: ['dashboard', 'wizard', 'vault', 'impact', 'admin']
  },

  async login(email, password) {
    const data = await requestApi('auth_login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password })
    });
    this.currentUser = data.user;
    return data.user;
  },

  async logout() {
    await requestApi('auth_logout', { method: 'POST' });
    this.currentUser = null;
    AppState.session = null;
    window.location.assign('./login.html');
  },

  async getCurrentUser() {
    const data = await requestApi('auth_me');
    this.currentUser = data.user;
    AppState.session = data.user;
    return data.user;
  },

  hasPermission(requiredRole) {
    if (!this.currentUser) return false;
    if (Array.isArray(requiredRole)) return requiredRole.includes(this.currentUser.role);
    if (this.permissions[this.currentUser.role]?.includes(requiredRole)) return true;
    return this.currentUser.role === requiredRole;
  },

  requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (this.currentUser && roles.includes(this.currentUser.role)) return true;
    showToast('You do not have permission to access this page.', 'error');
    return false;
  },

  async requireAuth() {
    try {
      return await this.getCurrentUser();
    } catch (error) {
      this.currentUser = null;
      AppState.session = null;
      if (error.message === 'Please sign in to continue.' || error.message.includes('inactive')) {
        window.location.replace('./login.html');
        return null;
      }
      showToast(error.message || 'Could not verify your session.', 'error');
      window.location.replace('./login.html');
      return null;
    }
  },

  defaultModule() {
    if (this.currentUser?.role === 'admin' && document.getElementById('module-admin')) return 'admin';
    return this.currentUser?.role === 'worker' ? 'vault' : 'dashboard';
  }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function setButtonLoading(button, loading, label) {
  if (loading) {
    if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${escapeHtml(I18n.translate(label))}</span>`;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-slate-950',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white'
  };
  const toast = document.createElement('div');
  toast.className = `toast-item pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const icon = document.createElement('i');
  icon.className = `fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-triangle-exclamation' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}`;
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = String(message);
  toast.append(icon, text);
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/* =========================================================
   MODULE 1: NAVIGATION MODULE (Top-Level UI Separation)
   ========================================================= */
const NavigationModule = {
  switchModule(moduleName) {
    if (!['dashboard', 'wizard', 'vault', 'impact', 'admin'].includes(moduleName)) return;
    if (!AuthModule.hasPermission(moduleName)) {
      showToast('You do not have permission to access this page.', 'error');
      moduleName = 'dashboard';
    }
    AppState.currentModule = moduleName;
    ['dashboard', 'wizard', 'vault', 'impact', 'admin'].forEach(mod => {
      const section = document.getElementById(`module-${mod}`);
      if (section) section.classList.toggle('hidden', mod !== moduleName);
    });
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const isActive = link.dataset.module === moduleName;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.body.classList.remove('sidebar-open');
    syncSidebarControls();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

function syncSidebarControls() {
  const desktop = window.matchMedia('(min-width: 1025px)').matches;
  const tablet = window.matchMedia('(min-width: 701px) and (max-width: 1024px)').matches;
  const mobileOpen = document.body.classList.contains('sidebar-open');
  const expanded = desktop
    ? !AppState.sidebarCollapsed
    : tablet ? document.body.classList.contains('sidebar-expanded') : mobileOpen;
  document.getElementById('appSidebar')?.setAttribute('aria-hidden', String(!desktop && !tablet && !mobileOpen));
  document.querySelectorAll('#sidebarToggle, #sidebarToggleDesktop').forEach(button => {
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', I18n.translate(expanded ? 'Collapse navigation' : 'Expand navigation'));
    button.querySelector('.burger-lines')?.classList.toggle('is-open', expanded);
  });
}

const I18n = {
  translations: {
    en: {
      workspace: 'WORKSPACE',
      overview: 'Overview',
      documentWizard: 'Document wizard',
      recordsVault: 'Records vault',
      communityHub: 'Community hub',
      needHelp: 'Need a hand?',
      helpCopy: 'Your community records are organized and ready to use.',
      learnMore: 'Learn more',
      welcomeEyebrow: 'YOUR COMMUNITY WORKSPACE',
      welcomeTitle: 'Good morning, Palatiw.',
      welcomeSubtitle: 'Let’s keep what matters within reach.',
      welcomeCopy: 'Scan, verify, and organize important community documents in one calm, secure place.',
      startDocument: 'Start a document',
      savedRecords: 'Saved records',
      savedRecordsHint: 'In your community vault',
      verifiedRecords: 'Verified records',
      verifiedRecordsHint: 'Reviewed with care',
      actionSteps: 'Action steps',
      actionStepsHint: 'Across saved checklists',
      communityFirst: 'Community first',
      communityFirstHint: 'Important info, always close',
      simpleTools: 'SIMPLE TOOLS, REAL IMPACT',
      toolsTitle: 'Everything you need to move forward.',
      exploreHub: 'Explore community hub',
      featureScanTitle: 'Make paper easier',
      featureScanCopy: 'Turn forms, notices, and receipts into clear, searchable text with document scanning.',
      scanDocument: 'Scan a document',
      featureVerifyTitle: 'Keep people in the loop',
      featureVerifyCopy: 'Review extracted details and make corrections before anything is saved.',
      reviewDetails: 'Review details',
      featureOrganizeTitle: 'Find it when it counts',
      featureOrganizeCopy: 'Keep verified records, helpful guidance, and next steps together in one vault.',
      openVault: 'Open your vault',
      ctaEyebrow: 'A LITTLE MORE PEACE OF MIND',
      ctaTitle: 'Start with one important document.',
      ctaCopy: 'Your next helpful step is just a scan away.',
      getStarted: 'Get started',
      footerNote: 'Built for stronger, more prepared communities.',
      aboutUs: 'About us'
    },
    tl: {
      workspace: 'WORKSPACE',
      overview: 'Pangkalahatang-ideya',
      documentWizard: 'Gabay sa dokumento',
      recordsVault: 'Imbakan ng rekord',
      communityHub: 'Sentro ng komunidad',
      needHelp: 'Kailangan ng tulong?',
      helpCopy: 'Maayos at handa nang gamitin ang mga rekord ng inyong komunidad.',
      learnMore: 'Alamin pa',
      welcomeEyebrow: 'WORKSPACE NG INYONG KOMUNIDAD',
      welcomeTitle: 'Magandang umaga, Palatiw.',
      welcomeSubtitle: 'Laging abot-kamay ang mahahalagang bagay.',
      welcomeCopy: 'I-scan, suriin, at ayusin ang mahahalagang dokumento ng komunidad sa iisang ligtas na lugar.',
      startDocument: 'Magsimula ng dokumento',
      savedRecords: 'Mga naka-save na rekord',
      savedRecordsHint: 'Nasa imbakan ng komunidad',
      verifiedRecords: 'Mga nasuring rekord',
      verifiedRecordsHint: 'Maingat na sinuri',
      actionSteps: 'Mga susunod na hakbang',
      actionStepsHint: 'Sa lahat ng naka-save na checklist',
      communityFirst: 'Komunidad muna',
      communityFirstHint: 'Laging abot-kamay ang mahalagang impormasyon',
      simpleTools: 'MADADALING GAMITIN, MAKABULUHANG TULONG',
      toolsTitle: 'Lahat ng kailangan para makausad.',
      exploreHub: 'Tingnan ang sentro ng komunidad',
      featureScanTitle: 'Gawing mas madali ang papel',
      featureScanCopy: 'Gawing malinaw at mahahanap na teksto ang mga form, abiso, at resibo.',
      scanDocument: 'Mag-scan ng dokumento',
      featureVerifyTitle: 'May taong nagsusuri',
      featureVerifyCopy: 'Suriin at itama ang mga detalye bago i-save ang dokumento.',
      reviewDetails: 'Suriin ang mga detalye',
      featureOrganizeTitle: 'Madaling hanapin kung kailangan',
      featureOrganizeCopy: 'Pagsama-samahin ang mga rekord, gabay, at susunod na hakbang sa iisang imbakan.',
      openVault: 'Buksan ang imbakan',
      ctaEyebrow: 'KAUNTING GINHAWA SA ISIP',
      ctaTitle: 'Magsimula sa isang mahalagang dokumento.',
      ctaCopy: 'Isang scan na lang ang susunod mong hakbang.',
      getStarted: 'Magsimula na',
      footerNote: 'Para sa mas handa at matatag na komunidad.',
      aboutUs: 'Tungkol sa amin'
    }
  },

  translate(text) {
    const current = this.translations[AppState.currentLanguage];
    if (current[text]) return current[text];
    const key = Object.keys(this.translations.en).find(candidate => this.translations.en[candidate] === text);
    return key ? current[key] || text : text;
  },

  setLanguage(language) {
    AppState.currentLanguage = this.translations[language] ? language : 'en';
    savePreference('sagiprekord-language', AppState.currentLanguage);
    document.documentElement.lang = AppState.currentLanguage === 'tl' ? 'tl' : 'en';
    const strings = this.translations[AppState.currentLanguage];
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      if (!strings[key]) return;
      const textNode = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = `${strings[key]} `;
      else element.textContent = strings[key];
    });
    document.querySelectorAll('.language-option').forEach(button => {
      const selected = button.dataset.language === AppState.currentLanguage;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('option').forEach(option => {
      const englishText = option.dataset.englishText || option.textContent.trim();
      option.dataset.englishText = englishText;
      option.textContent = this.translate(englishText);
    });
  }
};

function updateDashboardMetrics(records = AppState.recordsCache) {
  const checklistCount = records.reduce((total, record) => total + (Array.isArray(record.checklist) ? record.checklist.length : 0), 0);
  const metrics = {
    dashboardRecordCount: records.length,
    dashboardVerifiedCount: records.filter(record => Boolean(record.verified_ocr?.trim())).length,
    dashboardActionCount: checklistCount
  };
  Object.entries(metrics).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

/* =========================================================
   MODULE 2: WIZARD MODULE (Step-by-Step Process Controller)
   ========================================================= */
const WizardModule = {
  goToStep(stepNumber) {
    if (![1, 2, 3].includes(stepNumber)) {
      showToast('Choose a valid document step.', 'error');
      return false;
    }

    const hasText = document.getElementById('verifiedOcrText').value.trim().length > 0;
    if (stepNumber > 1 && !hasText) {
      showToast('Please upload a document or click a Demo Paper in Step 1 first!', 'warning');
      return;
    }

    AppState.currentStep = stepNumber;
    document.getElementById('step1Check').classList.toggle('hidden', !hasText);
    document.getElementById('step2Check').classList.toggle('hidden', !AppState.step2Verified);
    document.getElementById('step3Check').classList.toggle('hidden', !AppState.step3Complete);

    [1, 2, 3].forEach(n => {
      const panel = document.getElementById(`wizardStep-${n}`);
      const btn = document.getElementById(`stepperBtn-${n}`);
      const circle = btn?.querySelector('.step-circle');

      if (panel) panel.classList.toggle('hidden', n !== stepNumber);

      btn.classList.remove('active-node', 'completed-node');
      if (n === stepNumber) {
        btn.classList.add('active-node');
        circle.className = 'step-circle w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow';
      } else if ((n === 1 && hasText) || (n === 2 && AppState.step2Verified) || (n === 3 && AppState.step3Complete)) {
        btn.classList.add('completed-node');
        circle.className = 'step-circle w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0';
      } else {
        circle.className = 'step-circle w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0';
      }
    });

    this.syncStickyContext();
    const activeHeading = document.querySelector(`#wizardStep-${stepNumber} h2`);
    if (activeHeading) activeHeading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  },

  validateMetadata() {
    const required = [
      ['docType', 'Please select a document category.'],
      ['residentName', 'Please enter the resident or household name.'],
      ['referenceNo', 'Please enter a reference number (use N/A if none is shown).']
    ];
    for (const [id, message] of required) {
      const field = document.getElementById(id);
      if (!field.value.trim()) {
        field.focus();
        showToast(message, 'warning');
        return false;
      }
    }
    return true;
  },

  syncStickyContext() {
    document.getElementById('contextCategory').textContent = document.getElementById('docType').value;
    document.getElementById('contextResident').textContent = document.getElementById('residentName').value || '—';
    document.getElementById('contextRef').textContent = document.getElementById('referenceNo').value || '—';
  },

  loadPreset(type) {
    document.getElementById('recordId').value = '';
    document.getElementById('correctionNote').value = '';
    document.getElementById('residentAccountEmail').value = '';

    const samples = {
      form: {
        cat: 'Forms (DAF-AC Relief Intake)',
        prio: 'High Priority',
        title: 'DAF-AC Relief Intake Card',
        icon: 'fa-id-card text-indigo-600',
        text: `REPUBLIC OF THE PHILIPPINES\nBARANGAY PALATIW, PASIG CITY - DRRMO\nDISASTER ASSISTANCE FAMILY ACCESS CARD (DAF-AC)\n\nControl / Stub No: PLTW-2026-0915\nHead of Household: Mend0za, Teresita L.\nAddress: Purok 4, Market Ave., Brgy. Palatiw, Pasig City\nAmount / Assistance: PHP 5,000.00 DSWD Emergency Cash Transfer\nUrgent Needs: Insulin Pen (Glargine), Senior Citizen ID lost in flood.\nDeadline: Claim on or before Nov 16, 2026 at Brgy. Palatiw Covered Court.`
      },
      notice: {
        cat: 'Notices (LGU / Barangay Advisory)',
        prio: 'Action Required',
        title: 'Barangay Public Advisory',
        icon: 'fa-bullhorn text-amber-600',
        text: `BARANGAY PALATIW DISASTER RISK REDUCTION & MANAGEMENT OFFICE\nOFFICIAL PUBLIC NOTICE\nMemo No: BRGY-PLTW-2026-118\nName: All Flood-Affected Households (Purok 1 to 5)\nLocation: Brgy. Palatiw Multi-Purpose Hall, Pasig City\nDeadline: November 15, 2026 (8:00 AM - 4:00 PM)\n\nSubject: Free Replacement of Flood-Damaged Documents & Relief Distribution\n1. Bring your verified DAF-AC Stub or SagipRekord Digital Slip.\n2. Free Notary & Affidavit of Loss desk is open for lost PhilHealth, Senior, and Voter IDs.`
      },
      bill: {
        cat: 'Bills (Utility / Disconnection Notice)',
        prio: 'Action Required',
        title: 'Meralco Billing Statement',
        icon: 'fa-bolt text-sky-600',
        text: `MERALCO ELECTRIC BILL & DISCONNECTION NOTICE\nAccount No: MRLC-7749201\nAccount Name: Villanueva, R0nald P.\nAddress: Urbano Velasco Ave., Brgy. Palatiw, Pasig City\nTotal Due: PHP 3,420.75 (Due Date: Nov 19, 2026)\n\nImportant Notice: Customers in flood-declared barangays in Pasig City may apply for a 30-day payment extension and no-disconnection relief by presenting a Barangay Calamity Certificate.`
      },
      receipt: {
        cat: 'Receipts (Pharmacy / Relief Supply)',
        prio: 'High Priority',
        title: 'Pharmacy Official Receipt',
        icon: 'fa-receipt text-emerald-600',
        text: `PASIG COMMUNITY PHARMACY - OFFICIAL RECEIPT\nOR No: OR-994821\nPatient: Bautista, L0rdes C. (Senior Citizen ID #SC-8821)\nAddress: Brgy. Palatiw, Pasig City\nTotal Paid: PHP 1,180.00 (20% Senior Discount + VAT Exempt Applied)\n\nItems Purchased:\n- Amlodipine 10mg (#30 tabs) - 1 tab daily\n- Salbutamol Nebule (#10 nebules) - Every 6 hours as needed\nNote: Keep this official receipt for DSWD AICS / Medical Reimbursement at Barangay Hall.`
      }
    };

    const chosen = samples[type];
    if (!chosen) {
      showToast('That demo document is not available.', 'error');
      return;
    }
    AppState.step2Verified = false;
    AppState.step3Complete = false;
    document.getElementById('step2Check').classList.add('hidden');
    document.getElementById('step3Check').classList.add('hidden');
    document.getElementById('verifiedAiAdvice').value = '';
    AppState.currentChecklist = [];
    documentInputClear();
    document.getElementById('fileNameDisplay').textContent = chosen.title;
    document.getElementById('docType').value = chosen.cat;
    document.getElementById('priorityLevel').value = chosen.prio;
    document.getElementById('originalOcrStore').value = chosen.text;
    document.getElementById('rawOcrComparison').textContent = chosen.text;
    document.getElementById('verifiedOcrText').value = chosen.text;

    const previewBox = document.getElementById('previewBox');
    previewBox.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-2xl mb-2">
        <i class="fa-solid ${escapeHtml(chosen.icon)}"></i>
      </div>
      <p class="text-xs font-extrabold text-slate-700">${chosen.title}</p>
      <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-1">Scanned via Lumen OCR</span>
    `;

    OcrAndVerifyModule.autoExtractMetadata(chosen.text);
    OcrAndVerifyModule.updateDiffAudit();
    document.getElementById('step1Check').classList.remove('hidden');

    NavigationModule.switchModule('wizard');
    this.goToStep(2);
    showToast(`Step 1 Complete! Loaded ${chosen.title} into Step 2 for verification.`, 'success');
  }
};

function documentInputClear() {
  const input = document.getElementById('documentInput');
  if (input) input.value = '';
  document.getElementById('fileNameDisplay').textContent = 'Drag & Drop Image or PDF Document Here';
  document.getElementById('residentAccountEmail').value = '';
}

/* =========================================================
   MODULE 3: OCR & HUMAN VERIFICATION MODULE (Steps 1 & 2)
   ========================================================= */
const OcrAndVerifyModule = {
  autoExtractMetadata(text) {
    ['residentName', 'referenceNo', 'purokAddress', 'amountOrDate'].forEach(id => {
      document.getElementById(id).value = '';
    });
    const nameMatch = text.match(/(?:Head of Household|Head of Family|Resident|Name|Account Name|Patient|Payee):\s*([^\n\r]+)/i);
    if (nameMatch) document.getElementById('residentName').value = nameMatch[1].trim();

    const refMatch = text.match(/(?:Control\s*\/\s*Stub\s*No|Stub\s*#|Control\s*No|Reference\s*No|Account\s*No|OR\s*No|Memo\s*No|Rx\s*#):\s*([A-Za-z0-9\-]+)/i);
    if (refMatch) document.getElementById('referenceNo').value = refMatch[1].trim();

    const addrMatch = text.match(/(?:Address|Location|Venue|Branch):\s*([^\n\r]+)/i);
    if (addrMatch) document.getElementById('purokAddress').value = addrMatch[1].trim();

    const amtMatch = text.match(/(?:Amount\s*\/\s*Assistance|Total\s*Due|Total\s*Paid|Amount|Deadline|Date):\s*([^\n\r]+)/i);
    if (amtMatch) document.getElementById('amountOrDate').value = amtMatch[1].trim();

    WizardModule.syncStickyContext();
  },

  computeEditDifference(original, edited) {
    if (!original) return 0;
    let diffs = Math.abs(original.length - edited.length);
    const minLen = Math.min(original.length, edited.length);
    for (let i = 0; i < minLen; i++) {
      if (original[i] !== edited[i]) diffs++;
    }
    return diffs;
  },

  updateDiffAudit() {
    const orig = document.getElementById('originalOcrStore').value;
    const curr = document.getElementById('verifiedOcrText').value;
    AppState.currentEditDistance = this.computeEditDifference(orig, curr);

    const badge = document.getElementById('diffCounterBadge');
    const indicator = document.getElementById('editIndicator');
    const note = document.getElementById('correctionNote');

    if (AppState.currentEditDistance > 0) {
      badge.innerHTML = `<i class="fa-solid fa-user-pen mr-1"></i>${AppState.currentEditDistance} corrections`;
      badge.className = 'bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]';
      indicator.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check-double mr-1"></i>Corrected</span>`;
      if (!note.value) {
        note.value = `User reviewed & corrected ${AppState.currentEditDistance} OCR character(s)`;
      }
    } else {
      badge.innerHTML = `<i class="fa-solid fa-user-check mr-1"></i>No changes`;
      badge.className = 'bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]';
    }
    document.getElementById('statEdits').textContent = `${AppState.currentEditDistance} corrections`;
  }
};

/* =========================================================
   MODULE 4: LUMEN AI CHAT & CHECKLIST MODULE (Step 3)
   ========================================================= */
const AiChatAndChecklistModule = {
  async runLumenChat(promptText) {
    if (AppState.activeRequest) {
      showToast('Please wait for the current AI response to finish.', 'warning');
      return;
    }
    const docText = document.getElementById('verifiedOcrText').value.trim();
    if (!docText) {
      showToast('Check a document first.', 'warning');
      return;
    }

    const aiStatus = document.getElementById('aiStatusText');
    const aiBox = document.getElementById('verifiedAiAdvice');
    aiStatus.innerHTML = `<span class="text-purple-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Lumen AI Chat thinking...</span>`;

    try {
      const data = await requestApi('chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: docText,
          prompt: promptText,
          language: document.getElementById('chatLanguage').value
        })
      });
      if (data.success) {
        aiBox.value = data.reply;
        this.extractTasksFromAiReply(data.reply);
        aiStatus.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check mr-1"></i>AI Explanation Ready</span>`;
        document.getElementById('step3Check').classList.remove('hidden');
        showToast('Lumen AI Chat generated explanation & checklist!', 'success');
      } else {
        showToast(data.error || 'AI Chat error', 'error');
      }
    } catch (err) {
      showToast('Failed to contact backend AI Chat proxy', 'error');
    }
  },

  extractTasksFromAiReply(replyText) {
    const lines = replyText.split('\n');
    const tasks = [];
    lines.forEach(line => {
      const match = line.trim().match(/^(?:\d+[\.\)]\s*|[-*•]\s*)(.+)/);
      if (match && match[1].length > 8) {
        const text = match[1].replace(/\*\*/g, '').trim();
        if (!tasks.some(task => task.text === text)) tasks.push({ text, done: false });
      }
    });
    AppState.currentChecklist = tasks;
    this.renderChecklist();
  },

  renderChecklist() {
    const container = document.getElementById('checklistContainer');
    if (!AppState.currentChecklist.length) {
      container.innerHTML = `<p class="text-slate-400 italic py-1">Click "Generate Full Summary & Action Steps" above to build your interactive checklist.</p>`;
      return;
    }
    container.innerHTML = AppState.currentChecklist.map((item, idx) => `
      <label class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
        <div class="flex items-center gap-2.5">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="AiChatAndChecklistModule.toggleItem(${idx})" class="rounded text-emerald-600 focus:ring-0" />
          <span class="${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}">${item.text}</span>
        </div>
        <button type="button" onclick="AiChatAndChecklistModule.removeItem(${idx})" class="text-slate-300 hover:text-rose-500 text-sm font-bold">&times;</button>
      </label>
    `).join('');
    I18n.setLanguage(AppState.currentLanguage);
  },

  toggleItem(idx) {
    AppState.currentChecklist[idx].done = !AppState.currentChecklist[idx].done;
    const checkbox = document.querySelector(`#checklistContainer [data-task-index="${idx}"]`);
    const taskText = checkbox && checkbox.parentElement.querySelector('.checklist-task-text');
    if (taskText) {
      taskText.classList.toggle('line-through', AppState.currentChecklist[idx].done);
      taskText.classList.toggle('text-slate-500', AppState.currentChecklist[idx].done);
      taskText.classList.toggle('text-slate-800', !AppState.currentChecklist[idx].done);
    }
  },

  removeItem(idx) {
    AppState.currentChecklist.splice(idx, 1);
    this.renderChecklist();
    const nextTask = document.querySelector(`#checklistContainer [data-task-index="${Math.min(idx, AppState.currentChecklist.length - 1)}"]`);
    if (nextTask) nextTask.focus();
    else document.getElementById('newTaskInput').focus();
  }
};

/* =========================================================
   MODULE 5: BARANGAY DIGITAL VAULT MODULE (Organize View)
   ========================================================= */
const VaultModule = {
  renderVault() {
    const records = AppState.recordsCache;
    updateDashboardMetrics(records);
    document.getElementById('statTotal').textContent = records.length;
    document.getElementById('navVaultCount').textContent = records.length;
    document.getElementById('statUrgent').textContent = records.filter(r => r.priority_level === 'High Priority').length;

    const query = document.getElementById('vaultSearch').value.trim().toLowerCase();
    const catFilter = document.getElementById('vaultFilter').value;
    const prioFilter = document.getElementById('vaultPriorityFilter').value;

    const filtered = records.filter(r => {
      const matchesCat = catFilter === 'ALL' || r.doc_type === catFilter;
      const matchesPrio = prioFilter === 'ALL' || r.priority_level === prioFilter;
      const matchesText =
        String(r.resident_name || '').toLowerCase().includes(query) ||
        String(r.reference_no || '').toLowerCase().includes(query) ||
        String(r.purok_address || '').toLowerCase().includes(query) ||
        String(r.verified_ocr || '').toLowerCase().includes(query);
      return matchesCat && matchesPrio && matchesText;
    });

    const listEl = document.getElementById('vaultList');
    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="md:col-span-2 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-2"></i>
          <p class="text-xs font-bold text-slate-500">No matching verified records found.</p>
        </div>`;
      I18n.setLanguage(AppState.currentLanguage);
      return;
    }

    listEl.innerHTML = filtered.map(r => {
      const badgeColor = r.priority_level === 'High Priority'
        ? 'bg-rose-100 text-rose-700 border-rose-200'
        : (r.priority_level === 'Action Required' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200');

      const checklist = Array.isArray(r.checklist) ? r.checklist : [];
      const doneCount = checklist.filter(t => t.done).length;
      const totalTasks = checklist.length;

      return `
        <article class="record-card bg-white dark-card border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">${r.doc_type}</span>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}">${r.priority_level}</span>
            </div>

            <h3 class="font-extrabold text-base text-slate-800">${r.resident_name}</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Ref: <strong class="font-mono text-slate-700">${r.reference_no}</strong>
              ${r.amount_or_date && r.amount_or_date !== 'N/A' ? `• <span class="text-emerald-700 font-bold">${r.amount_or_date}</span>` : ''}
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i>${r.purok_address}</p>

            <div class="mt-3 bg-slate-50 dark-subcard border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-600 line-clamp-2">${r.verified_ocr}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                <i class="fa-solid fa-user-check mr-1"></i>${r.correction_note}
              </span>
              ${totalTasks > 0 ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-list-check mr-1"></i>${doneCount}/${totalTasks} steps done</span>` : ''}
            </div>

            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-[11px] text-slate-400 font-mono">${r.id} • ${r.updated_at}</span>
              <div class="flex items-center gap-3">
                <button onclick="VaultModule.openRecord('${r.id}')" class="font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <i class="fa-solid fa-pen-to-square"></i> Inspect / Edit
                </button>
                <button onclick="VaultModule.deleteRecord('${r.id}')" class="text-rose-500 hover:text-rose-700 font-semibold">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    I18n.setLanguage(AppState.currentLanguage);
  },

  openRecord(id) {
    const rec = AppState.recordsCache.find(r => r.id === id);
    if (!rec) {
      showToast('That record could not be found. Refresh the vault and try again.', 'error');
      return;
    }
    document.getElementById('recordId').value = rec.id;
    document.getElementById('docType').value = rec.doc_type;
    document.getElementById('priorityLevel').value = rec.priority_level;
    document.getElementById('residentName').value = rec.resident_name;
    document.getElementById('residentAccountEmail').value = rec.owner_email || '';
    document.getElementById('referenceNo').value = rec.reference_no;
    document.getElementById('amountOrDate').value = rec.amount_or_date || '';
    document.getElementById('purokAddress').value = rec.purok_address;
    document.getElementById('originalOcrStore').value = rec.original_ocr || rec.verified_ocr;
    document.getElementById('rawOcrComparison').textContent = rec.original_ocr || rec.verified_ocr;
    document.getElementById('verifiedOcrText').value = rec.verified_ocr;
    document.getElementById('verifiedAiAdvice').value = rec.verified_advice || '';
    document.getElementById('correctionNote').value = rec.correction_note || '';
    AppState.currentChecklist = Array.isArray(rec.checklist) ? rec.checklist.map(item => ({ text: String(item.text || ''), done: Boolean(item.done) })) : [];
    AppState.step2Verified = false;
    AppState.step3Complete = Boolean(rec.verified_advice);
    document.getElementById('step2Check').classList.add('hidden');
    document.getElementById('step3Check').classList.toggle('hidden', !AppState.step3Complete);
    documentInputClear();

    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    NavigationModule.switchModule('wizard');
    WizardModule.goToStep(2);
    showToast('Record opened.', 'info');
  },

  async deleteRecord(id) {
    if (!confirm('Remove this record from the Barangay Vault?')) return;
    try {
      const data = await requestApi('delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      AppState.recordsCache = data.records;
      this.renderVault();
      showToast('Record deleted from vault', 'info');
    } catch (error) {
      showToast(error.message || 'Could not delete the record.', 'error');
    }
  }
};
