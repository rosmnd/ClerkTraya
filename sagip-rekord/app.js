/* =========================================================
   SAGIPREKORD - MODULAR FRONTEND ARCHITECTURE (app.js)
   Structured into 5 clear modules so every team member can
   easily explain their assigned module during judging.
   ========================================================= */

const AppState = {
  currentModule: 'dashboard',
  currentLanguage: 'en',
  currentStep: 1,
  recordsCache: [],
  currentChecklist: [],
  currentEditDistance: 0
};

// Shared Toast Notification Helper
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-slate-950',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white'
  };
  const toast = document.createElement('div');
  toast.className = `toast-item pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

/* =========================================================
   MODULE 1: NAVIGATION MODULE (Top-Level UI Separation)
   ========================================================= */
const NavigationModule = {
  switchModule(moduleName) {
    AppState.currentModule = moduleName;
    ['dashboard', 'wizard', 'vault', 'impact'].forEach(mod => {
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
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const isTablet = window.matchMedia('(min-width: 701px) and (max-width: 1024px)').matches;
    const sidebarExpanded = isMobile
      ? false
      : (isTablet
        ? document.body.classList.contains('sidebar-expanded')
        : !document.body.classList.contains('sidebar-collapsed'));
    document.querySelectorAll('#sidebarToggle, #sidebarToggleDesktop').forEach(button => {
      button.setAttribute('aria-expanded', String(sidebarExpanded));
    });
    const activeSection = document.getElementById(`module-${moduleName}`);
    const activeHeading = moduleName === 'wizard'
      ? document.querySelector('#module-wizard .wizard-panel:not(.hidden) h2')
      : activeSection && activeSection.querySelector('h1, h2');
    if (activeHeading) activeHeading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const I18n = {
  translations: {
    en: {
      workspace: 'WORKSPACE',
      overview: 'Overview',
      documentWizard: 'Document wizard',
      recordsVault: 'Records vault',
      communityHub: 'Community help',
      communityHelpTitle: 'Where to get help',
      communityHelpIntro: 'Choose the service that matches your need.',
      communityHealthDesk: 'Barangay Palatiw Health & DRRMO Desk',
      communityHealthHelp: 'Health needs, relief claims, and calamity certificates.',
      communitySeniorDesk: 'Pasig CSWDO, OSCA, or Malasakit',
      communitySeniorHelp: 'Senior ID replacement and medical assistance.',
      needHelp: 'Need a hand?',
      helpCopy: 'Your community records are organized and ready to use.',
      learnMore: 'Learn more',
      welcomeEyebrow: 'PALATIW DRRMO',
      welcomeTitle: 'How can we help?',
      welcomeCopy: 'Scan, verify, and organize important community documents in one calm, secure place.',
      startDocument: 'Scan a document',
      scanHint: 'Take a photo or choose a file',
      searchHint: 'Search your records',
      workspaceSummary: 'Workspace summary',
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
      openVault: 'Find a saved record',
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
      communityHub: 'Tulong sa komunidad',
      communityHelpTitle: 'Saan hihingi ng tulong?',
      communityHelpIntro: 'Piliin ang serbisyong kailangan mo.',
      communityHealthDesk: 'Health at DRRMO Desk ng Barangay Palatiw',
      communityHealthHelp: 'Tulong pangkalusugan, ayuda, at sertipiko ng sakuna.',
      communitySeniorDesk: 'Pasig CSWDO, OSCA, o Malasakit',
      communitySeniorHelp: 'Pagpapalit ng senior ID at tulong medikal.',
      needHelp: 'Kailangan ng tulong?',
      helpCopy: 'Maayos at handa nang gamitin ang mga rekord ng inyong komunidad.',
      learnMore: 'Alamin pa',
      welcomeEyebrow: 'PALATIW DRRMO',
      welcomeTitle: 'Paano ka namin matutulungan?',
      welcomeCopy: 'I-scan, suriin, at ayusin ang mahahalagang dokumento ng komunidad sa iisang ligtas na lugar.',
      startDocument: 'Mag-scan ng dokumento',
      scanHint: 'Kumuha ng larawan o pumili ng file',
      searchHint: 'Hanapin ang iyong mga rekord',
      workspaceSummary: 'Buod ng workspace',
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
      openVault: 'Hanapin ang naka-save na rekord',
      ctaEyebrow: 'KAUNTING GINHAWA SA ISIP',
      ctaTitle: 'Magsimula sa isang mahalagang dokumento.',
      ctaCopy: 'Isang scan na lang ang susunod mong hakbang.',
      getStarted: 'Magsimula na',
      footerNote: 'Para sa mas handa at matatag na komunidad.',
      aboutUs: 'Tungkol sa amin'
    }
  },

  setLanguage(language) {
    AppState.currentLanguage = this.translations[language] ? language : 'en';
    const strings = this.translations[AppState.currentLanguage];
    document.documentElement.lang = AppState.currentLanguage === 'tl' ? 'tl' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      if (!strings[key]) return;
      const textNode = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = `${strings[key]} `;
      else element.textContent = strings[key];
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      const key = element.dataset.i18nAriaLabel;
      if (strings[key]) element.setAttribute('aria-label', strings[key]);
    });
    document.querySelectorAll('.language-option').forEach(button => {
      const selected = button.dataset.language === AppState.currentLanguage;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
};

function updateDashboardMetrics(records = AppState.recordsCache) {
  const checklistCount = records.reduce((total, record) => total + (record.checklist || []).length, 0);
  const metrics = {
    dashboardRecordCount: records.length,
    dashboardVerifiedCount: records.length,
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
    // Guard: Encourage scanning or loading a paper before jumping to Step 2/3
    const hasText = document.getElementById('verifiedOcrText').value.trim().length > 0;
    if (stepNumber > 1 && !hasText) {
      showToast('Add a document first.', 'warning');
      return;
    }

    AppState.currentStep = stepNumber;

    [1, 2, 3].forEach(n => {
      const panel = document.getElementById(`wizardStep-${n}`);
      const btn = document.getElementById(`stepperBtn-${n}`);
      const circle = btn.querySelector('.step-circle');

      if (panel) panel.classList.toggle('hidden', n !== stepNumber);
      if (n === stepNumber) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');

      btn.classList.remove('active-node', 'completed-node');
      if (n === stepNumber) {
        btn.classList.add('active-node');
        circle.className = 'step-circle w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow';
      } else if (n < stepNumber || (n === 1 && hasText)) {
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
  },

  syncStickyContext() {
    document.getElementById('contextCategory').textContent = document.getElementById('docType').value;
    document.getElementById('contextResident').textContent = document.getElementById('residentName').value || '—';
    document.getElementById('contextRef').textContent = document.getElementById('referenceNo').value || '—';
  },

  loadPreset(type) {
    document.getElementById('recordId').value = '';
    document.getElementById('correctionNote').value = '';

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

    const chosen = samples[type] || samples.form;
    document.getElementById('docType').value = chosen.cat;
    document.getElementById('priorityLevel').value = chosen.prio;
    document.getElementById('originalOcrStore').value = chosen.text;
    document.getElementById('rawOcrComparison').textContent = chosen.text;
    document.getElementById('verifiedOcrText').value = chosen.text;

    document.getElementById('previewBox').innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center text-2xl mb-2">
        <i class="fa-solid ${chosen.icon}"></i>
      </div>
      <p class="text-xs font-extrabold text-slate-700">${chosen.title}</p>
      <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-1">Sample document</span>
    `;

    OcrAndVerifyModule.autoExtractMetadata(chosen.text);
    OcrAndVerifyModule.updateDiffAudit();
    document.getElementById('step1Check').classList.remove('hidden');

    NavigationModule.switchModule('wizard');
    this.goToStep(2);
    showToast('Sample ready. Check the document.', 'success');
  }
};

/* =========================================================
   MODULE 3: OCR & HUMAN VERIFICATION MODULE (Steps 1 & 2)
   ========================================================= */
const OcrAndVerifyModule = {
  autoExtractMetadata(text) {
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
      document.getElementById('step2Check').classList.remove('hidden');
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
    const docText = document.getElementById('verifiedOcrText').value.trim();
    if (!docText) {
      showToast('Check a document first.', 'warning');
      return;
    }

    const aiStatus = document.getElementById('aiStatusText');
    const aiBox = document.getElementById('verifiedAiAdvice');
    aiStatus.innerHTML = `<span class="text-purple-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Working…</span>`;

    try {
      const res = await fetch('api.php?action=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: docText,
          prompt: promptText,
          language: document.getElementById('chatLanguage').value
        })
      });
      const data = await res.json();
      if (data.success) {
        aiBox.value = data.reply;
        this.extractTasksFromAiReply(data.reply);
        aiStatus.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check mr-1"></i>Ready</span>`;
        document.getElementById('step3Check').classList.remove('hidden');
        showToast('Your explanation is ready.', 'success');
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
      const match = line.trim().match(/^(?:\d+[\.\)]\s*|-\s*|\*\s*)(.+)/);
      if (match && match[1].length > 8) {
        tasks.push({ text: match[1].replace(/\*\*/g, '').trim(), done: false });
      }
    });
    if (tasks.length > 0) {
      AppState.currentChecklist = tasks;
      this.renderChecklist();
    }
  },

  renderChecklist() {
    const container = document.getElementById('checklistContainer');
    if (!AppState.currentChecklist.length) {
      container.innerHTML = `<p class="text-slate-600 italic py-1">Your tasks will appear here.</p>`;
      return;
    }
    container.innerHTML = AppState.currentChecklist.map((item, idx) => `
      <div class="task-row flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
        <label class="flex flex-1 items-center gap-3 cursor-pointer">
          <input type="checkbox" data-task-index="${idx}" ${item.done ? 'checked' : ''} onchange="AiChatAndChecklistModule.toggleItem(${idx})" class="rounded text-emerald-600 focus:ring-0" />
          <span class="checklist-task-text ${item.done ? 'line-through text-slate-500' : 'text-slate-800 font-semibold'}">${item.text}</span>
        </label>
        <button type="button" aria-label="Remove task ${idx + 1}" onclick="AiChatAndChecklistModule.removeItem(${idx})" class="text-slate-700 hover:text-rose-700 text-sm font-bold">&times;</button>
      </div>
    `).join('');
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

    const query = document.getElementById('vaultSearch').value.toLowerCase();
    const catFilter = document.getElementById('vaultFilter').value;
    const prioFilter = document.getElementById('vaultPriorityFilter').value;

    const filtered = records.filter(r => {
      const matchesCat = catFilter === 'ALL' || r.doc_type === catFilter;
      const matchesPrio = prioFilter === 'ALL' || r.priority_level === prioFilter;
      const matchesText =
        r.resident_name.toLowerCase().includes(query) ||
        r.reference_no.toLowerCase().includes(query) ||
        r.purok_address.toLowerCase().includes(query) ||
        r.verified_ocr.toLowerCase().includes(query);
      return matchesCat && matchesPrio && matchesText;
    });

    const listEl = document.getElementById('vaultList');
    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="md:col-span-2 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <i class="fa-regular fa-folder-open text-3xl text-slate-300 mb-2"></i>
          <p class="text-xs font-bold text-slate-500">No records found.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(r => {
      const badgeColor = r.priority_level === 'High Priority'
        ? 'bg-rose-100 text-rose-700 border-rose-200'
        : (r.priority_level === 'Action Required' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200');

      const doneCount = (r.checklist || []).filter(t => t.done).length;
      const totalTasks = (r.checklist || []).length;

      return `
        <article class="record-card bg-white dark-card border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="record-category text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">${r.doc_type}</span>
              <span class="record-priority px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}">${r.priority_level}</span>
            </div>

            <h3 class="font-extrabold text-base text-slate-800">${r.resident_name}</h3>
            <p class="record-reference"><span>Reference:</span> <strong class="font-mono text-slate-700">${r.reference_no}</strong></p>
            ${r.amount_or_date && r.amount_or_date !== 'N/A' ? `<p class="record-date">${r.amount_or_date}</p>` : ''}

            <details class="document-details record-details">
              <summary>More details</summary>
              <p><strong>Address:</strong> ${r.purok_address}</p>
              <p><strong>Document text:</strong></p>
              <pre class="record-text bg-slate-50 dark-subcard border border-slate-200 rounded-xl p-3 whitespace-pre-wrap">${r.verified_ocr}</pre>
              <p><strong>Note:</strong> ${r.correction_note || 'None'}</p>
              <p class="record-date">${r.id} • ${r.updated_at}</p>
            </details>
          </div>

          <div class="record-actions">
            ${totalTasks > 0 ? `<span class="record-progress">${doneCount} of ${totalTasks} tasks done</span>` : ''}
            <div class="flex items-center gap-2">
              <button type="button" onclick="VaultModule.openRecord('${r.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl">Open</button>
              <button type="button" aria-label="Delete record ${r.id}" title="Delete record" onclick="VaultModule.deleteRecord('${r.id}')" class="delete-record-button text-rose-700 hover:text-rose-900 font-semibold">
                <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  openRecord(id) {
    const rec = AppState.recordsCache.find(r => r.id === id);
    if (!rec) return;
    document.getElementById('recordId').value = rec.id;
    document.getElementById('docType').value = rec.doc_type;
    document.getElementById('priorityLevel').value = rec.priority_level;
    document.getElementById('residentName').value = rec.resident_name;
    document.getElementById('referenceNo').value = rec.reference_no;
    document.getElementById('amountOrDate').value = rec.amount_or_date || '';
    document.getElementById('purokAddress').value = rec.purok_address;
    document.getElementById('originalOcrStore').value = rec.original_ocr || rec.verified_ocr;
    document.getElementById('rawOcrComparison').textContent = rec.original_ocr || rec.verified_ocr;
    document.getElementById('verifiedOcrText').value = rec.verified_ocr;
    document.getElementById('verifiedAiAdvice').value = rec.verified_advice || '';
    document.getElementById('correctionNote').value = rec.correction_note || '';
    AppState.currentChecklist = rec.checklist || [];

    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    NavigationModule.switchModule('wizard');
    WizardModule.goToStep(2);
    showToast('Record opened.', 'info');
  },

  async deleteRecord(id) {
    if (!confirm('Delete this record?')) return;
    const res = await fetch('api.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      AppState.recordsCache = data.records;
      this.renderVault();
      showToast('Record deleted.', 'info');
    }
  }
};

/* =========================================================
   EVENT LISTENERS & INITIALIZATION
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const documentInput = document.getElementById('documentInput');
  const dropZone = document.getElementById('dropZone');
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  let selectedDocument = null;
  let cameraStream = null;
  let capturedPhoto = null;
  let cameraSession = 0;

  function stopCamera() {
    cameraSession++;
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    capturedPhoto = null;
    cameraModal.classList.add('hidden');
    cameraModal.classList.remove('flex');
    document.getElementById('openCameraBtn').focus();
  }

  const updateSidebarAria = () => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const isTablet = window.matchMedia('(min-width: 701px) and (max-width: 1024px)').matches;
    const isExpanded = isMobile
      ? document.body.classList.contains('sidebar-open')
      : (isTablet
        ? document.body.classList.contains('sidebar-expanded')
        : !document.body.classList.contains('sidebar-collapsed'));
    document.querySelectorAll('#sidebarToggle, #sidebarToggleDesktop').forEach(button => {
      button.setAttribute('aria-expanded', String(isExpanded));
    });
  };
  const toggleSidebar = () => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const isTablet = window.matchMedia('(min-width: 701px) and (max-width: 1024px)').matches;
    const className = isMobile ? 'sidebar-open' : (isTablet ? 'sidebar-expanded' : 'sidebar-collapsed');
    document.body.classList.toggle(className);
    updateSidebarAria();
    if (isMobile && document.body.classList.contains('sidebar-open')) {
      document.querySelector('.sidebar-link').focus();
    }
  };
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarToggleDesktop').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    updateSidebarAria();
    document.getElementById('sidebarToggle').focus();
  });
  window.addEventListener('resize', updateSidebarAria);
  updateSidebarAria();
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      updateSidebarAria();
      document.getElementById('sidebarToggle').focus();
    }
  });
  document.querySelectorAll('.language-option').forEach(button => {
    button.addEventListener('click', () => I18n.setLanguage(button.dataset.language));
  });
  I18n.setLanguage('en');
  updateDashboardMetrics();

  // File Preview handler
  function handleFilePreview(file) {
    if (!file) return;
    selectedDocument = file;
    document.getElementById('fileNameDisplay').textContent = `Selected: ${file.name}`;
    const previewBox = document.getElementById('previewBox');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewBox.innerHTML = `<img src="${e.target.result}" alt="Preview" class="max-h-36 object-contain rounded-lg shadow-xs" />`;
      };
      reader.readAsDataURL(file);
    } else {
      previewBox.innerHTML = `<i class="fa-solid fa-file-pdf text-3xl text-rose-500 mb-1"></i><span class="text-xs font-bold text-slate-600">${file.name}</span>`;
    }
  }

  documentInput.addEventListener('change', () => handleFilePreview(documentInput.files[0]));
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length) {
      documentInput.files = e.dataTransfer.files;
      handleFilePreview(e.dataTransfer.files[0]);
    }
  });

  document.getElementById('openCameraBtn').addEventListener('click', async () => {
    const cameraStatus = document.getElementById('cameraStatus');
    const captureButton = document.getElementById('capturePhotoBtn');
    capturedPhoto = null;
    cameraVideo.classList.remove('hidden');
    cameraCanvas.classList.add('hidden');
    captureButton.disabled = true;
    captureButton.classList.remove('hidden');
    document.getElementById('retakePhotoBtn').classList.add('hidden');
    document.getElementById('usePhotoBtn').classList.add('hidden');
    cameraStatus.textContent = 'Starting camera…';
    cameraModal.classList.remove('hidden');
    cameraModal.classList.add('flex');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraStatus.textContent = 'Camera access is not available in this browser. Use HTTPS or localhost, or upload a photo instead.';
      showToast('Camera access is unavailable. Use HTTPS or localhost, or upload a photo.', 'error');
      return;
    }

    const session = ++cameraSession;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
      });
      if (session !== cameraSession) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      cameraStream = stream;
      cameraVideo.srcObject = stream;
      await cameraVideo.play();
      if (session === cameraSession) {
        captureButton.disabled = false;
        cameraStatus.textContent = 'Camera ready. Center the document and capture when it is clear.';
      }
    } catch (error) {
      if (session !== cameraSession) return;
      stopCamera();
      const message = error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.'
        : 'Could not start the camera. Check that a camera is connected and try again, or upload a photo.';
      cameraStatus.textContent = message;
      showToast(message, 'error');
    }
  });

  document.getElementById('capturePhotoBtn').addEventListener('click', () => {
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
      showToast('The camera is not ready yet. Please wait a moment and try again.', 'warning');
      return;
    }

    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
    cameraCanvas.toBlob(blob => {
      if (!blob) {
        showToast('Could not capture the photo. Please try again.', 'error');
        return;
      }
      capturedPhoto = new File([blob], `sagiprekord-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      cameraVideo.classList.add('hidden');
      cameraCanvas.classList.remove('hidden');
      document.getElementById('cameraStatus').textContent = 'Photo captured. Retake it or use it to scan your document.';
      document.getElementById('capturePhotoBtn').classList.add('hidden');
      document.getElementById('retakePhotoBtn').classList.remove('hidden');
      document.getElementById('usePhotoBtn').classList.remove('hidden');
    }, 'image/jpeg', 0.92);
  });

  document.getElementById('retakePhotoBtn').addEventListener('click', () => {
    capturedPhoto = null;
    cameraVideo.classList.remove('hidden');
    cameraCanvas.classList.add('hidden');
    document.getElementById('cameraStatus').textContent = 'Camera ready. Center the document and capture when it is clear.';
    document.getElementById('capturePhotoBtn').classList.remove('hidden');
    document.getElementById('retakePhotoBtn').classList.add('hidden');
    document.getElementById('usePhotoBtn').classList.add('hidden');
  });

  document.getElementById('usePhotoBtn').addEventListener('click', () => {
    if (!capturedPhoto) return;
    handleFilePreview(capturedPhoto);
    closeCamera();
    showToast('Photo added. Select “Read document” to continue.', 'success');
  });

  document.getElementById('closeCameraModal').addEventListener('click', closeCamera);
  cameraModal.addEventListener('click', event => {
    if (event.target === cameraModal) closeCamera();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !cameraModal.classList.contains('hidden')) closeCamera();
  });

  // Step 1: OCR Form Submit -> Automatically Advances to Step 2
  document.getElementById('ocrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedDocument) {
      showToast('Choose a photo or PDF first.', 'warning');
      return;
    }

    const ocrBtn = document.getElementById('ocrBtn');
    const formData = new FormData();
    formData.append('document', selectedDocument, selectedDocument.name);

    ocrBtn.disabled = true;
    ocrBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Reading document…</span>`;

    try {
      const res = await fetch('api.php?action=ocr', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        document.getElementById('originalOcrStore').value = data.raw_text;
        document.getElementById('rawOcrComparison').textContent = data.raw_text;
        document.getElementById('verifiedOcrText').value = data.raw_text;
        OcrAndVerifyModule.autoExtractMetadata(data.raw_text);
        OcrAndVerifyModule.updateDiffAudit();
        document.getElementById('step1Check').classList.remove('hidden');
        WizardModule.goToStep(2);
        showToast('Text ready. Check it for mistakes.', 'success');
      } else {
        showToast(data.error || 'OCR scan failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to api.php backend', 'error');
    } finally {
      ocrBtn.disabled = false;
      ocrBtn.innerHTML = `<i class="fa-solid fa-file-lines"></i> <span>Read document</span> <i class="fa-solid fa-arrow-right ml-1"></i>`;
    }
  });

  // Step 2: Live Diff & Side-by-Side Comparison Toggle
  document.getElementById('verifiedOcrText').addEventListener('input', () => OcrAndVerifyModule.updateDiffAudit());
  ['docType', 'residentName', 'referenceNo'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => WizardModule.syncStickyContext());
  });

  document.getElementById('toggleDiffBtn').addEventListener('click', () => {
    const drawer = document.getElementById('diffDrawer');
    const grid = document.getElementById('ocrComparisonGrid');
    drawer.classList.toggle('hidden');
    grid.classList.toggle('md:grid-cols-2', !drawer.classList.contains('hidden'));
  });

  document.getElementById('restoreOriginalBtn').addEventListener('click', () => {
    const orig = document.getElementById('originalOcrStore').value;
    if (orig) {
      document.getElementById('verifiedOcrText').value = orig;
      OcrAndVerifyModule.updateDiffAudit();
      showToast('Original text restored.', 'info');
    }
  });

  // Step 2 -> Step 3 Button (Automatically triggers Lumen AI Chat if empty)
  document.getElementById('proceedToStep3Btn').addEventListener('click', () => {
    document.getElementById('step2Check').classList.remove('hidden');
    WizardModule.goToStep(3);
    if (!document.getElementById('verifiedAiAdvice').value.trim()) {
      AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
    }
  });

  // Step 3: AI Chat Controls & Checklist
  document.getElementById('explainBtn').addEventListener('click', () => {
    AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
  });

  document.getElementById('askCustomBtn').addEventListener('click', () => {
    const q = document.getElementById('customQuestion').value.trim();
    if (q) AiChatAndChecklistModule.runLumenChat(q);
  });

  document.querySelectorAll('.prompt-pill').forEach(btn => {
    btn.addEventListener('click', () => AiChatAndChecklistModule.runLumenChat(btn.dataset.prompt));
  });

  document.getElementById('addTaskBtn').addEventListener('click', () => {
    const input = document.getElementById('newTaskInput');
    if (!input.value.trim()) return;
    AppState.currentChecklist.push({ text: input.value.trim(), done: false });
    input.value = '';
    AiChatAndChecklistModule.renderChecklist();
  });

  // Save Record to Vault -> Switches to Vault Module
  document.getElementById('saveRecordBtn').addEventListener('click', async () => {
    const verifiedText = document.getElementById('verifiedOcrText').value.trim();
    if (!verifiedText) {
      showToast('No verified document text to save!', 'warning');
      return;
    }

    const payload = {
      id: document.getElementById('recordId').value,
      doc_type: document.getElementById('docType').value,
      priority_level: document.getElementById('priorityLevel').value,
      resident_name: document.getElementById('residentName').value || 'Unlisted Resident',
      reference_no: document.getElementById('referenceNo').value || 'N/A',
      amount_or_date: document.getElementById('amountOrDate').value || 'N/A',
      purok_address: document.getElementById('purokAddress').value || 'Brgy. Palatiw, Pasig City',
      original_ocr: document.getElementById('originalOcrStore').value || verifiedText,
      verified_ocr: verifiedText,
      verified_advice: document.getElementById('verifiedAiAdvice').value,
      checklist: AppState.currentChecklist,
      correction_note: document.getElementById('correctionNote').value || 'Checked & verified by user',
      edit_count: AppState.currentEditDistance
    };

    const res = await fetch('api.php?action=save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      AppState.recordsCache = data.records;
      document.getElementById('recordId').value = data.record.id;
      VaultModule.renderVault();
      showToast('Record saved.', 'success');
      setTimeout(() => NavigationModule.switchModule('vault'), 600);
    }
  });

  // Reset Form Button
  document.getElementById('clearFormBtn').addEventListener('click', () => {
    selectedDocument = null;
    documentInput.value = '';
    document.getElementById('fileNameDisplay').textContent = 'Drag & Drop Image or PDF Document Here';
    ['recordId', 'originalOcrStore', 'residentName', 'referenceNo', 'amountOrDate', 'purokAddress', 'verifiedOcrText', 'verifiedAiAdvice', 'correctionNote'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('previewBox').innerHTML = '<i class="fa-regular fa-file-lines text-3xl text-slate-300 mb-2"></i><p class="text-xs font-bold text-slate-500">No document yet</p>';
    ['step1Check', 'step2Check', 'step3Check'].forEach(id => document.getElementById(id).classList.add('hidden'));
    AppState.currentChecklist = [];
    AppState.currentEditDistance = 0;
    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    WizardModule.goToStep(1);
    showToast('Ready for a new document.', 'info');
  });

  // Printable Slip Modal
  const slipModal = document.getElementById('slipModal');
  document.getElementById('previewSlipBtn').addEventListener('click', () => {
    const tasksHtml = AppState.currentChecklist.length
      ? AppState.currentChecklist.map(t => `<li class="flex items-center gap-2"><i class="${t.done ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}" style="color:#4378E4"></i><span>${t.text}</span></li>`).join('')
      : `<li>No checklist items added yet.</li>`;

    document.getElementById('slipModalBody').innerHTML = `
      <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div><strong>Resident / Name:</strong> ${document.getElementById('residentName').value || 'N/A'}</div>
        <div><strong>Reference / Stub #:</strong> <span class="font-mono">${document.getElementById('referenceNo').value || 'N/A'}</span></div>
        <div><strong>Category:</strong> ${document.getElementById('docType').value}</div>
        <div><strong>Amount / Date:</strong> ${document.getElementById('amountOrDate').value || 'N/A'}</div>
      </div>
      <div>
        <strong class="block mb-1 text-slate-700">Human-Verified Document Text (${AppState.currentEditDistance} edits):</strong>
        <pre class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono whitespace-pre-wrap text-[11px]">${document.getElementById('verifiedOcrText').value}</pre>
      </div>
      <div>
        <strong class="block mb-1 text-slate-700">Explanation:</strong>
        <div class="bg-purple-50 p-2.5 rounded-xl border border-purple-200 whitespace-pre-wrap">${document.getElementById('verifiedAiAdvice').value || 'N/A'}</div>
      </div>
      <div>
        <strong class="block mb-1 text-slate-700">Action Checklist:</strong>
        <ul class="space-y-1 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">${tasksHtml}</ul>
      </div>
    `;
    slipModal.classList.remove('hidden');
    slipModal.classList.add('flex');
  });

  ['closeSlipModal', 'closeSlipBtn2'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      slipModal.classList.add('hidden');
      slipModal.classList.remove('flex');
    });
  });

  // Vault Filters & CSV Export
  ['vaultSearch', 'vaultFilter', 'vaultPriorityFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => VaultModule.renderVault());
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (!AppState.recordsCache.length) return showToast('No records to export', 'warning');
    const headers = ['Record ID', 'Category', 'Resident Name', 'Reference No', 'Amount/Date', 'Address', 'Priority', 'Human Edits', 'Verification Note', 'Updated At'];
    const rows = AppState.recordsCache.map(r => [
      r.id, r.doc_type, r.resident_name, r.reference_no, r.amount_or_date || '', r.purok_address, r.priority_level, r.edit_count || 0, r.correction_note, r.updated_at
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `SagipRekord_Vault_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Records exported.', 'success');
  });

  // Initial App Boot
  AiChatAndChecklistModule.renderChecklist();
  WizardModule.syncStickyContext();
  fetch('api.php?action=list')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        AppState.recordsCache = data.records;
        VaultModule.renderVault();
      }
    })
    .catch(() => showToast('Could not load saved records from the backend.', 'error'));
});