/* =========================================================
   SAGIPREKORD - COMPLETE WORKING FRONTEND + REAL OCR ENGINE
   ========================================================= */

const AppState = {
  currentModule: 'dashboard',
  currentLanguage: 'en',
  currentStep: 1,
  recordsCache: [],
  currentChecklist: [],
  currentEditDistance: 0
};

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-slate-950',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white'
  };
  const toast = document.createElement('div');
  toast.className = `toast-item pointer-events-auto px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* =========================================================
   MODULE 1: NAVIGATION MODULE
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
    });
    document.body.classList.remove('sidebar-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/* =========================================================
   BILINGUAL TRANSLATIONS (ENGLISH & TAGALOG)
   ========================================================= */
const I18n = {
  translations: {
    en: {
      brandTagline: 'Easy paper helper for Barangay Palatiw',
      largerText: 'A+ Larger Text',
      workspace: 'MAIN MENU',
      overview: 'Home',
      documentWizard: 'Scan a Paper',
      recordsVault: 'Saved Papers',
      communityHub: 'Barangay Help',
      needHelp: 'Need help with a form or bill?',
      helpCopy: 'Take a photo of your paper and we will explain it in simple words.',
      welcomeEyebrow: 'BARANGAY PALATIW HELPER',
      welcomeTitle: 'Good day, ka-barangay.',
      welcomeSubtitle: 'Understand your papers in 3 easy steps.',
      welcomeCopy: 'Have a relief stub, electric bill, medical receipt, or barangay notice? Upload a photo to read it clearly, fix any typos, and see what to do next.',
      startDocument: 'Scan a Paper Now',
      openVault: 'View Saved Papers',
      simpleTools: 'HOW IT WORKS',
      toolsTitle: 'Three easy steps for anyone to follow',
      featureScanTitle: '1. Upload or Pick a Paper',
      featureScanCopy: 'Take a photo of your form, receipt, bill, or notice so the app can read the words for you.',
      scanDocument: 'Go to Step 1',
      featureVerifyTitle: '2. Check & Fix Details',
      featureVerifyCopy: 'Make sure the name, number, and words are spelled right. You can easily edit any mistake.',
      reviewDetails: 'Check details',
      featureOrganizeTitle: '3. Read Simple Guide & Save',
      featureOrganizeCopy: 'Get a clear explanation in Taglish or Tagalog, follow the checklist, and save your record.',
      savedRecords: 'Saved Papers',
      verifiedRecords: 'Checked by People',
      actionSteps: 'Checklist Tasks',
      step1Title: 'Read the Paper',
      step2Title: 'Check & Fix',
      step3Title: 'Simple Guide & Save',
      startOver: 'Start Over',
      step1Heading: 'Upload a photo or PDF of your paper',
      step1Sub: 'Take a picture or choose a file (form, receipt, bill, or notice) so we can read every word on it.',
      tapToUpload: 'Tap here to choose a photo or PDF',
      uploadHint: 'Works with real photos of forms, receipts, electric bills, and notices',
      readPaperBtn: 'Read This Paper & Go to Step 2',
      trySampleTitle: 'Or tap a sample paper below to test right away:',
      step2Heading: 'Check if the details are correct',
      step2Sub: 'Sometimes computers misread blurry or handwritten letters. Tap any box below to fix mistakes before saving.',
      labelDocType: '1. What kind of paper is this?',
      labelName: '2. Full Name on the Paper',
      labelRef: '3. Control / Stub / Account Number',
      labelDate: '4. Amount or Deadline Date',
      labelWords: '5. Words Read from the Paper (Tap inside to fix any typos)',
      looksGoodBtn: 'Looks Good! Explain What to Do Next (Step 3)',
      step3Heading: 'Simple Explanation & What to Do Next',
      step3Sub: 'Read the simple explanation below, check off your to-do list, and save this paper.',
      btnExplainSimple: 'Explain in Simple Words',
      btnRequirements: 'What to Bring & Deadlines',
      btnHowToClaim: 'How to Claim Free Aid / Discount',
      checklistHeading: 'Steps to Follow (Tap to Check Off)',
      savePaperBtn: 'Save This Paper'
    },
    tl: {
      brandTagline: 'Madaling gabay sa dokumento para sa Brgy. Palatiw',
      largerText: 'A+ Palakihin ang Sulat',
      workspace: 'MENU',
      overview: 'Simula (Home)',
      documentWizard: 'Mag-scan ng Papel',
      recordsVault: 'Mga Naka-save',
      communityHub: 'Tulong sa Barangay',
      needHelp: 'Kailangan ng tulong sa form o bill?',
      helpCopy: 'Kuhanan ng litrato ang iyong papel at ipapaliwanag namin ito nang malinaw.',
      welcomeEyebrow: 'TULONG PARA SA BARANGAY PALATIW',
      welcomeTitle: 'Magandang araw, ka-barangay.',
      welcomeSubtitle: 'Intindihin ang iyong papeles sa 3 madaling hakbang.',
      welcomeCopy: 'May relief stub, Meralco bill, resibo ng gamot, o abiso mula sa barangay? I-upload ang litrato para mabasa nang malinaw at malaman ang dapat gawin.',
      startDocument: 'Mag-scan ng Papel Ngayon',
      openVault: 'Tingnan ang mga Naka-save',
      simpleTools: 'PAANO GAMITIN',
      toolsTitle: 'Tatlong madaling hakbang para sa lahat',
      featureScanTitle: '1. I-upload o Pumili ng Papel',
      featureScanCopy: 'Kuhanan ng litrato ang iyong form, resibo, bill, o abiso para mabasa ito ng app.',
      scanDocument: 'Pumunta sa Hakbang 1',
      featureVerifyTitle: '2. Suriin at Itama ang Detalye',
      featureVerifyCopy: 'Siguraduhing tama ang pangalan, numero, at nakasulat. Madaling i-edit kung may mali.',
      reviewDetails: 'Suriin ang detalye',
      featureOrganizeTitle: '3. Basahin ang Paliwanag at I-save',
      featureOrganizeCopy: 'Makakuha ng malinaw na paliwanag sa Tagalog, sundan ang checklist, at i-save ang rekord.',
      savedRecords: 'Naka-save na Papel',
      verifiedRecords: 'Nasuring Rekord',
      actionSteps: 'Mga Hakbang sa Checklist',
      step1Title: 'Basahin ang Papel',
      step2Title: 'Suriin at Itama',
      step3Title: 'Paliwanag at I-save',
      startOver: 'Ulitin sa Simula',
      step1Heading: 'Mag-upload ng litrato o PDF ng iyong papel',
      step1Sub: 'Pumili ng litrato o PDF ng form, resibo, bill, o abiso para mabasa ang nakasulat.',
      tapToUpload: 'Pindutin ito para pumili ng litrato o PDF',
      uploadHint: 'Gumagana sa tunay na litrato ng relief form, resibo, bill, at abiso',
      readPaperBtn: 'Basahin ang Papel at Pumunta sa Step 2',
      trySampleTitle: 'O pindutin ang isa sa mga halimbawang papel sa ibaba:',
      step2Heading: 'Suriin kung tama ang mga detalye',
      step2Sub: 'Minsan nagkakamali ang computer sa malabong sulat-kamay. Pindutin ang kahon para itama ang anumang mali.',
      labelDocType: '1. Anong klaseng papel ito?',
      labelName: '2. Buong Pangalan sa Papel',
      labelRef: '3. Control / Stub / Account Number',
      labelDate: '4. Halaga o Petsa ng Deadline',
      labelWords: '5. Mga Salitang Nabasa sa Papel (Pindutin para itama)',
      looksGoodBtn: 'Tama na Ito! Ipaliwanag ang Dapat Gawin (Step 3)',
      step3Heading: 'Simpleng Paliwanag at Mga Dapat Gawin',
      step3Sub: 'Basahin ang paliwanag sa ibaba, lagyan ng tsek ang iyong listahan, at i-save ang papel.',
      btnExplainSimple: 'Ipaliwanag sa Simpleng Salita',
      btnRequirements: 'Ano ang Dadalhin at Deadline',
      btnHowToClaim: 'Paano Kumuha ng Tulong / Diskwento',
      checklistHeading: 'Mga Hakbang na Gagawin (Lagyan ng Tsek)',
      savePaperBtn: 'I-save ang Papel na Ito'
    }
  },

  setLanguage(language) {
    AppState.currentLanguage = this.translations[language] ? language : 'en';
    const strings = this.translations[AppState.currentLanguage];
    document.documentElement.lang = AppState.currentLanguage === 'tl' ? 'tl' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      if (strings[key]) element.textContent = strings[key];
    });
    document.querySelectorAll('.language-option').forEach(button => {
      const selected = button.dataset.language === AppState.currentLanguage;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    // Sync Step 3 explanation language selector
    const chatLangSelect = document.getElementById('chatLanguage');
    if (chatLangSelect) {
      chatLangSelect.value = AppState.currentLanguage === 'tl'
        ? 'Simple Tagalog'
        : 'Taglish (Simple Filipino-English)';
    }
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
   MODULE 2: WIZARD MODULE (Clean 3-Step Flow)
   ========================================================= */
const WizardModule = {
  openStep2OrLoadSample() {
    const hasText = document.getElementById('verifiedOcrText').value.trim().length > 0;
    if (hasText) {
      NavigationModule.switchModule('wizard');
      this.goToStep(2);
    } else {
      this.loadPreset('form');
    }
  },

  goToStep(stepNumber) {
    const hasText = document.getElementById('verifiedOcrText').value.trim().length > 0;
    if (stepNumber > 1 && !hasText) {
      showToast('Please choose a photo/PDF or tap a Sample Paper in Step 1 first!', 'warning');
      return;
    }

    AppState.currentStep = stepNumber;

    [1, 2, 3].forEach(n => {
      const panel = document.getElementById(`wizardStep-${n}`);
      const btn = document.getElementById(`stepperBtn-${n}`);
      if (panel) panel.classList.toggle('hidden', n !== stepNumber);
      btn.classList.remove('active-node', 'completed-node');
      if (n === stepNumber) {
        btn.classList.add('active-node');
      } else if (n < stepNumber || (n === 1 && hasText)) {
        btn.classList.add('completed-node');
      }
    });

    this.syncStickyContext();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  syncStickyContext() {
    const cat = document.getElementById('docType').value;
    const name = document.getElementById('residentName').value;
    const ref = document.getElementById('referenceNo').value;
    document.getElementById('contextCategory').textContent = cat || 'Paper Selected';
    document.getElementById('contextResident').textContent = name
      ? `${name} (${ref || 'No Ref #'})`
      : 'Review details below';
  },

  loadPreset(type) {
    document.getElementById('recordId').value = '';
    document.getElementById('correctionNote').value = '';
    document.getElementById('verifiedAiAdvice').value = '';

    const samples = {
      form: {
        cat: 'Forms (DAF-AC Relief Intake)',
        prio: 'High Priority',
        title: '1. Relief Card (DAF-AC)',
        icon: 'fa-id-card',
        text: `REPUBLIC OF THE PHILIPPINES\nBARANGAY PALATIW, PASIG CITY - DRRMO\nDISASTER ASSISTANCE FAMILY ACCESS CARD (DAF-AC)\n\nControl / Stub No: PLTW-2026-0915\nHead of Household: Mend0za, Teresita L.\nAddress: Purok 4, Market Ave., Brgy. Palatiw, Pasig City\nAmount / Assistance: PHP 5,000.00 DSWD Emergency Cash Transfer\nUrgent Needs: Insulin Pen (Glargine), Senior Citizen ID lost in flood.\nDeadline: Claim on or before Nov 16, 2026 at Brgy. Palatiw Covered Court.`
      },
      notice: {
        cat: 'Notices (LGU / Barangay Advisory)',
        prio: 'Action Required',
        title: '2. Barangay Notice',
        icon: 'fa-bullhorn',
        text: `BARANGAY PALATIW DISASTER RISK REDUCTION & MANAGEMENT OFFICE\nOFFICIAL PUBLIC NOTICE\nMemo No: BRGY-PLTW-2026-118\nName: All Flood-Affected Households (Purok 1 to 5)\nLocation: Brgy. Palatiw Multi-Purpose Hall, Pasig City\nDeadline: November 15, 2026 (8:00 AM - 4:00 PM)\n\nSubject: Free Replacement of Flood-Damaged Documents & Relief Distribution\n1. Bring your verified DAF-AC Stub or SagipRekord Digital Slip.\n2. Free Notary & Affidavit of Loss desk is open for lost PhilHealth, Senior, and Voter IDs.`
      },
      bill: {
        cat: 'Bills (Utility / Disconnection Notice)',
        prio: 'Action Required',
        title: '3. Meralco Electric Bill',
        icon: 'fa-bolt',
        text: `MERALCO ELECTRIC BILL & DISCONNECTION NOTICE\nAccount No: MRLC-7749201\nAccount Name: Villanueva, R0nald P.\nAddress: Urbano Velasco Ave., Brgy. Palatiw, Pasig City\nTotal Due: PHP 3,420.75\nDue Date: Nov 19, 2026\nAdvisory: Customers in flood-declared barangays in Pasig City may apply for a 30-day payment extension by presenting a Barangay Calamity Certificate.`
      },
      receipt: {
        cat: 'Receipts (Pharmacy / Relief Supply)',
        prio: 'High Priority',
        title: '4. Pharmacy Receipt',
        icon: 'fa-receipt',
        text: `PASIG COMMUNITY PHARMACY - OFFICIAL RECEIPT\nOR No: OR-994821\nPatient: Bautista, L0rdes C. (Senior Citizen ID #SC-8821)\nAddress: Brgy. Palatiw, Pasig City\nTotal Paid: PHP 1,180.00\nDate: Nov 13, 2026\nItems Purchased: Amlodipine 10mg (#30 tabs), Salbutamol Nebule (#10 nebules) for DSWD AICS Medical Reimbursement.`
      }
    };

    const chosen = samples[type] || samples.form;
    document.getElementById('docType').value = chosen.cat;
    document.getElementById('priorityLevel').value = chosen.prio;
    document.getElementById('originalOcrStore').value = chosen.text;
    document.getElementById('rawOcrComparison').textContent = chosen.text;
    document.getElementById('verifiedOcrText').value = chosen.text;

    document.getElementById('previewBox').innerHTML = `
      <i class="fa-solid ${chosen.icon} text-3xl text-blue-600 mb-2"></i>
      <p class="text-sm font-extrabold text-slate-800">${chosen.title}</p>
      <span class="text-xs text-emerald-700 font-bold mt-1">Paper Read Successfully</span>
    `;

    OcrAndVerifyModule.autoExtractMetadata(chosen.text);
    OcrAndVerifyModule.updateDiffAudit();
    document.getElementById('step1Check').classList.remove('hidden');

    NavigationModule.switchModule('wizard');
    this.goToStep(2);
    showToast(`Loaded ${chosen.title}! Check details in Step 2.`, 'success');
  }
};

/* =========================================================
   MODULE 3: REAL OCR (LUMEN API + TESSERACT.JS / PDF.JS)
   ========================================================= */
const OcrAndVerifyModule = {
  async extractRealTextFromFile(file, statusCallback) {
    // 1. If PDF file, extract real text from PDF pages via PDF.js
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      statusCallback('Reading PDF pages...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
      }
      if (fullText.trim().length > 10) return fullText.trim();
    }

    // 2. If Image file (JPG, PNG, etc.), run real Tesseract OCR
    if (window.Tesseract) {
      const result = await window.Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            statusCallback(`Reading words from image (${pct}%)...`);
          }
        }
      });
      if (result && result.data && result.data.text && result.data.text.trim()) {
        return result.data.text.trim();
      }
    }

    return `UPLOADED DOCUMENT: ${file.name}\nDate: ${new Date().toLocaleDateString()}\n(Please type or verify the details from your uploaded paper below.)`;
  },

  autoExtractMetadata(text) {
    const nameMatch = text.match(/(?:Head of Household|Head of Family|Resident|Name|Account Name|Patient|Payee|Head):\s*([^\n\r]+)/i);
    document.getElementById('residentName').value = nameMatch ? nameMatch[1].trim() : '';

    const refMatch = text.match(/(?:Control\s*\/\s*Stub\s*No|Stub\s*#|Control\s*No|Reference\s*No|Account\s*No|Account|OR\s*No|Memo\s*No|Rx\s*#):\s*([A-Za-z0-9\-]+)/i);
    document.getElementById('referenceNo').value = refMatch ? refMatch[1].trim() : '';

    const addrMatch = text.match(/(?:Address|Location|Venue|Branch):\s*([^\n\r]+)/i);
    document.getElementById('purokAddress').value = addrMatch ? addrMatch[1].trim() : 'Brgy. Palatiw, Pasig City';

    const amtMatch = text.match(/(?:Amount\s*\/\s*Assistance|Total\s*Due|Total\s*Paid|Amount|Deadline|Due\s*Date|Date):\s*([^\n\r]+)/i);
    document.getElementById('amountOrDate').value = amtMatch ? amtMatch[1].trim() : '';

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
      badge.innerHTML = `<i class="fa-solid fa-check mr-1"></i>Fixed ${AppState.currentEditDistance} letter(s)`;
      indicator.innerHTML = `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check-double mr-1"></i>Checked & Corrected by You</span>`;
      if (!note.value) {
        note.value = `Checked & corrected ${AppState.currentEditDistance} character(s)`;
      }
      document.getElementById('step2Check').classList.remove('hidden');
    } else {
      badge.innerHTML = `Ready to Check`;
    }
    document.getElementById('statEdits').textContent = `${AppState.currentEditDistance} chars fixed`;
  }
};

/* =========================================================
   MODULE 4: LUMEN AI CHAT & CHECKLIST MODULE
   ========================================================= */
const AiChatAndChecklistModule = {
  async runLumenChat(promptText) {
    const docText = document.getElementById('verifiedOcrText').value.trim();
    if (!docText) {
      showToast('Please scan or choose a paper first!', 'warning');
      return;
    }

    const aiStatus = document.getElementById('aiStatusText');
    const aiBox = document.getElementById('verifiedAiAdvice');
    aiStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>Analyzing your paper...`;

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
        aiStatus.innerHTML = `<i class="fa-solid fa-check mr-1"></i>Explanation Ready (${data.mode === 'live_lumen_chat' ? 'Live Lumen AI' : 'Smart Analyzer'})`;
        document.getElementById('step3Check').classList.remove('hidden');
      } else {
        showToast(data.error || 'Could not generate explanation', 'error');
      }
    } catch (err) {
      showToast('Could not connect to server', 'error');
    }
  },

  extractTasksFromAiReply(replyText) {
    const lines = replyText.split('\n');
    const tasks = [];
    lines.forEach(line => {
      const match = line.trim().match(/^(?:\d+[\.\)]\s*)(.+)/);
      if (match && match[1].length > 6) {
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
      container.innerHTML = `<p class="text-slate-500 py-2">Tap "Explain in Simple Words" above to create your step-by-step checklist.</p>`;
      return;
    }
    container.innerHTML = AppState.currentChecklist.map((item, idx) => `
      <label class="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border-2 border-slate-200 cursor-pointer hover:border-blue-500 transition">
        <div class="flex items-center gap-3">
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="AiChatAndChecklistModule.toggleItem(${idx})" class="w-5 h-5 rounded text-blue-600" />
          <span class="text-base ${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-bold'}">${item.text}</span>
        </div>
        <button type="button" onclick="AiChatAndChecklistModule.removeItem(${idx})" class="text-slate-400 hover:text-rose-600 text-lg font-bold px-2">&times;</button>
      </label>
    `).join('');
  },

  toggleItem(idx) {
    AppState.currentChecklist[idx].done = !AppState.currentChecklist[idx].done;
    this.renderChecklist();
  },

  removeItem(idx) {
    AppState.currentChecklist.splice(idx, 1);
    this.renderChecklist();
  }
};

/* =========================================================
   MODULE 5: CLEAN SAVED PAPERS VAULT MODULE
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
        <div class="md:col-span-2 text-center py-12 clean-card">
          <i class="fa-regular fa-folder-open text-4xl text-slate-300 mb-3"></i>
          <p class="text-base font-bold text-slate-600">No saved papers match your search.</p>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(r => {
      const doneCount = (r.checklist || []).filter(t => t.done).length;
      const totalTasks = (r.checklist || []).length;

      return `
        <div class="clean-card p-6 flex flex-col justify-between gap-4">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="step-badge">${r.doc_type}</span>
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700">${r.priority_level}</span>
            </div>

            <h3 class="font-extrabold text-xl text-slate-900 mt-2">${r.resident_name}</h3>
            <p class="text-base text-slate-600 mt-1">
              Number: <strong class="font-mono text-slate-900">${r.reference_no}</strong>
            </p>
            ${r.amount_or_date && r.amount_or_date !== 'N/A' ? `<p class="text-base font-bold text-blue-700 mt-1"><i class="fa-regular fa-calendar mr-1"></i>${r.amount_or_date}</p>` : ''}
            <p class="text-sm text-slate-500 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>${r.purok_address}</p>
          </div>

          <div class="pt-4 border-t border-slate-200 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="text-emerald-700 font-bold">
                <i class="fa-solid fa-user-check mr-1"></i>${r.correction_note}
              </span>
              ${totalTasks > 0 ? `<span class="font-bold text-slate-700"><i class="fa-solid fa-list-check mr-1"></i>${doneCount} of ${totalTasks} steps done</span>` : ''}
            </div>

            <div class="flex items-center justify-between gap-2 pt-1">
              <button onclick="VaultModule.openRecord('${r.id}')" class="primary-button py-2 px-4 min-h-[44px] text-sm flex-1 justify-center">
                <i class="fa-solid fa-folder-open"></i> Open & View Guide
              </button>
              <button onclick="VaultModule.deleteRecord('${r.id}')" class="secondary-button-outline py-2 px-4 min-h-[44px] text-sm text-rose-600" title="Delete record">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
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

    document.getElementById('previewBox').innerHTML = `
      <i class="fa-solid fa-file-circle-check text-3xl text-emerald-600 mb-2"></i>
      <p class="text-sm font-extrabold text-slate-800">${rec.resident_name}</p>
      <span class="text-xs text-slate-500 mt-1">Ref: ${rec.reference_no}</span>
    `;

    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    NavigationModule.switchModule('wizard');
    WizardModule.goToStep(3);
    showToast(`Opened ${rec.resident_name}'s paper`, 'info');
  },

  async deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this saved paper?')) return;
    const res = await fetch('api.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      AppState.recordsCache = data.records;
      this.renderVault();
      showToast('Saved paper deleted', 'info');
    }
  }
};

/* =========================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const documentInput = document.getElementById('documentInput');
  const dropZone = document.getElementById('dropZone');

  // Ensure only Dashboard is visible on startup
  NavigationModule.switchModule('dashboard');

  // Senior Citizen A+ Larger Text Toggle
  const textSizeToggle = document.getElementById('textSizeToggle');
  textSizeToggle.addEventListener('click', () => {
    const isLarge = document.body.classList.toggle('large-text-mode');
    textSizeToggle.classList.toggle('is-active', isLarge);
    textSizeToggle.setAttribute('aria-pressed', String(isLarge));
    showToast(isLarge ? 'Larger Text Mode turned ON' : 'Standard Text Size restored', 'info');
  });

  // Sidebar Toggle
  const toggleSidebar = () => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    document.body.classList.toggle(isMobile ? 'sidebar-open' : 'sidebar-collapsed');
  };
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarToggleDesktop').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });

  // Language Switcher
  document.querySelectorAll('.language-option').forEach(button => {
    button.addEventListener('click', () => I18n.setLanguage(button.dataset.language));
  });
  I18n.setLanguage('en');

  // Lumen API Config Modal (Click "Lumen AI Setup" in Topbar)
  const apiConfigModal = document.getElementById('apiConfigModal');
  const engineStatusText = document.getElementById('engineStatusText');
  fetch('api.php?action=config_status')
    .then(r => r.json())
    .then(cfg => {
      if (cfg.success) {
        document.getElementById('ocrUrlInput').value = cfg.ocr_url || '';
        document.getElementById('chatUrlInput').value = cfg.chat_url || '';
        engineStatusText.textContent = cfg.live_ready ? 'Lumen API Connected' : 'Lumen AI Ready';
      }
    });

  document.getElementById('engineBadge').addEventListener('click', () => {
    apiConfigModal.classList.remove('hidden');
    apiConfigModal.classList.add('flex');
  });

  document.getElementById('closeApiConfigModal').addEventListener('click', () => {
    apiConfigModal.classList.add('hidden');
    apiConfigModal.classList.remove('flex');
  });

  document.getElementById('saveApiConfigBtn').addEventListener('click', async () => {
    const ocr_url = document.getElementById('ocrUrlInput').value.trim();
    const chat_url = document.getElementById('chatUrlInput').value.trim();
    const res = await fetch('api.php?action=save_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocr_url, chat_url })
    });
    const data = await res.json();
    if (data.success) {
      engineStatusText.textContent = (ocr_url || chat_url) ? 'Lumen API Connected' : 'Lumen AI Ready';
      apiConfigModal.classList.add('hidden');
      apiConfigModal.classList.remove('flex');
      showToast('Saved Lumen API endpoints to backend .env!', 'success');
    }
  });

  // File Upload Preview
  function handleFilePreview(file) {
    if (!file) return;
    document.getElementById('fileNameDisplay').textContent = `Selected: ${file.name}`;
    const previewBox = document.getElementById('previewBox');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewBox.innerHTML = `<img src="${e.target.result}" alt="Preview" class="max-h-36 object-contain rounded-lg" />`;
      };
      reader.readAsDataURL(file);
    } else {
      previewBox.innerHTML = `<i class="fa-solid fa-file-pdf text-3xl text-rose-500 mb-1"></i><span class="text-sm font-bold">${file.name}</span>`;
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

  // Step 1 Submit: Calls Lumen OCR Backend -> Falls back to Real Tesseract/PDF.js OCR on the actual file!
  document.getElementById('ocrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!documentInput.files.length) {
      showToast('Please select a photo/PDF first, or tap one of the 4 Sample Papers below!', 'warning');
      return;
    }

    const file = documentInput.files[0];
    const ocrBtn = document.getElementById('ocrBtn');
    const formData = new FormData();
    formData.append('document', file);

    ocrBtn.disabled = true;
    ocrBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Reading your paper...</span>`;

    try {
      const res = await fetch('api.php?action=ocr', { method: 'POST', body: formData });
      const data = await res.json();

      let extractedText = data.raw_text || '';

      // If Lumen OCR URL is not set in .env yet, read the actual uploaded image/PDF in the browser
      if (data.needs_client_ocr) {
        extractedText = await OcrAndVerifyModule.extractRealTextFromFile(file, (statusMsg) => {
          ocrBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${statusMsg}</span>`;
        });
      }

      document.getElementById('recordId').value = '';
      document.getElementById('verifiedAiAdvice').value = '';
      document.getElementById('originalOcrStore').value = extractedText;
      document.getElementById('rawOcrComparison').textContent = extractedText;
      document.getElementById('verifiedOcrText').value = extractedText;
      OcrAndVerifyModule.autoExtractMetadata(extractedText);
      OcrAndVerifyModule.updateDiffAudit();
      document.getElementById('step1Check').classList.remove('hidden');
      WizardModule.goToStep(2);
      showToast('Paper read! Check if the details are correct in Step 2.', 'success');
    } catch (err) {
      showToast('Error reading document. Please try again.', 'error');
    } finally {
      ocrBtn.disabled = false;
      ocrBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Read This Paper & Go to Step 2</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  });

  // Step 2 Listeners
  document.getElementById('verifiedOcrText').addEventListener('input', () => OcrAndVerifyModule.updateDiffAudit());
  ['docType', 'residentName', 'referenceNo'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => WizardModule.syncStickyContext());
  });

  document.getElementById('toggleDiffBtn').addEventListener('click', () => {
    document.getElementById('diffDrawer').classList.toggle('hidden');
  });

  document.getElementById('restoreOriginalBtn').addEventListener('click', () => {
    const orig = document.getElementById('originalOcrStore').value;
    if (orig) {
      document.getElementById('verifiedOcrText').value = orig;
      OcrAndVerifyModule.updateDiffAudit();
      showToast('Restored original text', 'warning');
    }
  });

  document.getElementById('proceedToStep3Btn').addEventListener('click', () => {
    document.getElementById('step2Check').classList.remove('hidden');
    WizardModule.goToStep(3);
    AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
  });

  // Step 3 Listeners (including Enter key support & automatic re-explain on language change)
  document.getElementById('explainBtn').addEventListener('click', () => {
    AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
  });

  document.getElementById('chatLanguage').addEventListener('change', () => {
    if (document.getElementById('verifiedOcrText').value.trim()) {
      AiChatAndChecklistModule.runLumenChat('Ipaliwanag ang dokumentong ito nang simple at magbigay ng malinaw na numbered step-by-step action checklist.');
    }
  });

  const triggerCustomQuestion = () => {
    const q = document.getElementById('customQuestion').value.trim();
    if (q) AiChatAndChecklistModule.runLumenChat(q);
  };
  document.getElementById('askCustomBtn').addEventListener('click', triggerCustomQuestion);
  document.getElementById('customQuestion').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerCustomQuestion();
    }
  });

  document.querySelectorAll('.prompt-pill').forEach(btn => {
    btn.addEventListener('click', () => AiChatAndChecklistModule.runLumenChat(btn.dataset.prompt));
  });

  const triggerAddTask = () => {
    const input = document.getElementById('newTaskInput');
    if (!input.value.trim()) return;
    AppState.currentChecklist.push({ text: input.value.trim(), done: false });
    input.value = '';
    AiChatAndChecklistModule.renderChecklist();
  };
  document.getElementById('addTaskBtn').addEventListener('click', triggerAddTask);
  document.getElementById('newTaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerAddTask();
    }
  });

  // Save Record
  document.getElementById('saveRecordBtn').addEventListener('click', async () => {
    const verifiedText = document.getElementById('verifiedOcrText').value.trim();
    if (!verifiedText) {
      showToast('Please scan or choose a paper first!', 'warning');
      return;
    }

    const payload = {
      id: document.getElementById('recordId').value,
      doc_type: document.getElementById('docType').value,
      priority_level: document.getElementById('priorityLevel').value,
      resident_name: document.getElementById('residentName').value || 'Resident Record',
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
      showToast('Paper saved! Opening your Saved Papers...', 'success');
      setTimeout(() => NavigationModule.switchModule('vault'), 600);
    }
  });

  // Start Over / Reset
  document.getElementById('clearFormBtn').addEventListener('click', () => {
    ['recordId', 'originalOcrStore', 'residentName', 'referenceNo', 'amountOrDate', 'purokAddress', 'verifiedOcrText', 'verifiedAiAdvice', 'correctionNote'].forEach(id => {
      document.getElementById(id).value = '';
    });
    ['step1Check', 'step2Check', 'step3Check'].forEach(id => document.getElementById(id).classList.add('hidden'));
    AppState.currentChecklist = [];
    AppState.currentEditDistance = 0;
    AiChatAndChecklistModule.renderChecklist();
    OcrAndVerifyModule.updateDiffAudit();
    WizardModule.goToStep(1);
    showToast('Ready for a new paper', 'info');
  });

  // Printable Slip Modal
  const slipModal = document.getElementById('slipModal');
  document.getElementById('previewSlipBtn').addEventListener('click', () => {
    const tasksHtml = AppState.currentChecklist.length
      ? AppState.currentChecklist.map(t => `<li class="flex items-center gap-2"><span>${t.done ? '☑' : '☐'}</span> <span>${t.text}</span></li>`).join('')
      : `<li>No checklist items added yet.</li>`;

    document.getElementById('slipModalBody').innerHTML = `
      <div class="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div><strong>Name:</strong> ${document.getElementById('residentName').value || 'N/A'}</div>
        <div><strong>Number:</strong> <span class="font-mono">${document.getElementById('referenceNo').value || 'N/A'}</span></div>
        <div><strong>Paper Type:</strong> ${document.getElementById('docType').value}</div>
        <div><strong>Amount / Date:</strong> ${document.getElementById('amountOrDate').value || 'N/A'}</div>
      </div>
      <div>
        <strong class="block mb-1">Simple Explanation:</strong>
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">${document.getElementById('verifiedAiAdvice').value || 'N/A'}</div>
      </div>
      <div>
        <strong class="block mb-1">Steps to Follow:</strong>
        <ul class="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">${tasksHtml}</ul>
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

  // Vault Search, Filters & CSV Export
  ['vaultSearch', 'vaultFilter', 'vaultPriorityFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => VaultModule.renderVault());
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (!AppState.recordsCache.length) return showToast('No saved papers to download', 'warning');
    const headers = ['Record ID', 'Category', 'Name', 'Reference No', 'Amount/Date', 'Address', 'Priority', 'Verification Note', 'Updated At'];
    const rows = AppState.recordsCache.map(r => [
      r.id, r.doc_type, r.resident_name, r.reference_no, r.amount_or_date || '', r.purok_address, r.priority_level, r.correction_note, r.updated_at
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `SagipRekord_Saved_Papers.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // Boot App
  AiChatAndChecklistModule.renderChecklist();
  WizardModule.syncStickyContext();
  fetch('api.php?action=list')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        AppState.recordsCache = data.records;
        VaultModule.renderVault();
      }
    });
});