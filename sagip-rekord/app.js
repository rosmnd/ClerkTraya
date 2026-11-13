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
<<<<<<<<< Temporary merge branch 1
  toast.className = `toast-item pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
=========
  toast.className = `toast-item pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 ${colors[type] || colors.info}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = '';
  const icon = document.createElement('i');
  icon.className = `fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-triangle-exclamation' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}`;
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = I18n.translate(message);
  toast.append(icon, text);
  document.getElementById('toastContainer')?.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
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
<<<<<<<<< Temporary merge branch 1
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
=========
    syncSidebarControls();
>>>>>>>>> Temporary merge branch 2
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
<<<<<<<<< Temporary merge branch 1
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
=========
    en: {},
    tl: {
      'Secure workspace': 'Ligtas na workspace',
      'Community workspace': 'Workspace ng komunidad',
      'Community records, made clear': 'Malinaw at maayos na mga rekord ng komunidad',
      'Records protected': 'Protektado ang mga rekord',
      'Ready when you need them': 'Handa kapag kailangan',
      'Collapse navigation': 'Isara ang navigation',
      'Expand navigation': 'Buksan ang navigation',
      'Choose language': 'Pumili ng wika',
      'Main navigation': 'Pangunahing navigation',
      'Good morning, Palatiw.': 'Magandang umaga, Palatiw.',
      'Let’s keep what matters within reach.': 'Laging abot-kamay ang mahahalagang bagay.',
      'YOUR COMMUNITY WORKSPACE': 'WORKSPACE NG INYONG KOMUNIDAD',
      'Scan, verify, and organize important community documents in one calm, secure place.': 'I-scan, suriin, at ayusin ang mahahalagang dokumento ng komunidad sa iisang ligtas na lugar.',
      'Start a document': 'Magsimula ng dokumento',
      'Saved records': 'Mga naka-save na rekord',
      'In your community vault': 'Nasa imbakan ng komunidad',
      'Verified records': 'Mga nasuring rekord',
      'Reviewed with care': 'Maingat na sinuri',
      'Action steps': 'Mga susunod na hakbang',
      'Across saved checklists': 'Sa lahat ng naka-save na checklist',
      'Community first': 'Komunidad muna',
      'Important info, always close': 'Laging abot-kamay ang mahalagang impormasyon',
      'SIMPLE TOOLS, REAL IMPACT': 'MADADALING GAMITIN, MAKABULUHANG TULONG',
      'Everything you need to move forward.': 'Lahat ng kailangan para makausad.',
      'Explore community hub': 'Tingnan ang sentro ng komunidad',
      'Make paper easier': 'Gawing mas madali ang papel',
      'Turn forms, notices, and receipts into clear, searchable text with document scanning.': 'Gawing malinaw at mahahanap na teksto ang mga form, abiso, at resibo.',
      'Scan a document': 'Mag-scan ng dokumento',
      'Keep people in the loop': 'May taong nagsusuri',
      'Review extracted details and make corrections before anything is saved.': 'Suriin at itama ang mga detalye bago i-save ang dokumento.',
      'Review details': 'Suriin ang mga detalye',
      'Find it when it counts': 'Madaling hanapin kung kailangan',
      'Keep verified records, helpful guidance, and next steps together in one vault.': 'Pagsama-samahin ang mga rekord, gabay, at susunod na hakbang sa iisang imbakan.',
      'Open your vault': 'Buksan ang imbakan',
      'A LITTLE MORE PEACE OF MIND': 'KAUNTING GINHAWA SA ISIP',
      'Start with one important document.': 'Magsimula sa isang mahalagang dokumento.',
      'Your next helpful step is just a scan away.': 'Isang scan na lang ang susunod mong hakbang.',
      'Get started': 'Magsimula na',
      'Built for stronger, more prepared communities.': 'Para sa mas handa at matatag na komunidad.',
      'About us': 'Tungkol sa amin',
      'WORKSPACE': 'WORKSPACE',
      'Overview': 'Pangkalahatang-ideya',
      'Document wizard': 'Gabay sa dokumento',
      'Records vault': 'Imbakan ng rekord',
      'Community hub': 'Sentro ng komunidad',
      'Need a hand?': 'Kailangan ng tulong?',
      'Your community records are organized and ready to use.': 'Maayos at handa nang gamitin ang mga rekord ng inyong komunidad.',
      'Learn more': 'Alamin pa',
      'Barangay Palatiw DRRMO • Document & Relief Assistant': 'Barangay Palatiw DRRMO • Tulong sa dokumento at ayuda',
      'Document Wizard': 'Gabay sa dokumento',
      'Digital Vault': 'Imbakan ng rekord',
      'Partner & SDG Hub': 'Sentro ng komunidad',
      'Step 1 • Understand': 'Hakbang 1 • Unawain',
      'Step 2 • Bonus Feature': 'Hakbang 2 • Suriin',
      'Step 3 • Act & Organize': 'Hakbang 3 • Kumilos at ayusin',
      'Scan Paper (Lumen OCR)': 'I-scan ang papel (Lumen OCR)',
      'Check or Correct Data': 'Suriin o itama ang datos',
      'Lumen AI Chat & Action Plan': 'Lumen AI at plano ng aksyon',
      'Active Document Context': 'Kasalukuyang dokumento',
      'Paper Preview & Status': 'Preview at katayuan ng papel',
      'Quick-Load Demo Papers': 'Mabilis na demo na dokumento',
      'Upload or Select a Paper Document to Read': 'Mag-upload o pumili ng dokumentong babasahin',
      'Drag & Drop Image or PDF Document Here': 'I-drag at i-drop dito ang larawan o PDF',
      'Scan Document with Lumen OCR & Continue to Step 2': 'I-scan gamit ang Lumen OCR at magpatuloy sa Hakbang 2',
      'Review & Correct Extracted Document Text': 'Suriin at itama ang tekstong nakuha sa dokumento',
      'Confirm Verified Text & Analyze with Lumen AI Chat (Step 3)': 'Kumpirmahin ang teksto at suriin gamit ang Lumen AI (Hakbang 3)',
      'Output Language:': 'Wika ng sagot:',
      'Generate Full Summary & Action Steps': 'Gumawa ng buod at mga hakbang',
      'Ask AI': 'Magtanong sa AI',
      'Interactive Action Checklist (Act On Information)': 'Checklist ng mga hakbang',
      'Add custom action step...': 'Magdagdag ng hakbang...',
      'Save Verified Record to Barangay Vault': 'I-save ang nasuring rekord',
      'Scan New Document': 'Mag-scan ng bagong dokumento',
      'Export Vault to CSV': 'I-export ang imbakan bilang CSV',
      'Total Saved Records': 'Kabuuang naka-save na rekord',
      'High-Priority Cases': 'Mga agarang kaso',
      'High Priority': 'Mataas ang prayoridad',
      'Action Required': 'Kailangan ng aksyon',
      'Standard Record': 'Karaniwang rekord',
      'Forms (DAF-AC Relief Intake)': 'Mga form (DAF-AC relief intake)',
      'Notices (LGU / Barangay Advisory)': 'Mga abiso (LGU / barangay)',
      'Bills (Utility / Disconnection Notice)': 'Mga bill (utility / disconnection notice)',
      'Receipts (Pharmacy / Relief Supply)': 'Mga resibo (botika / relief supply)',
      'Records (Medical Rx / Senior ID)': 'Mga rekord (reseta medikal / senior ID)',
      'Human Verification Rate': 'Rate ng pagsusuri ng tao',
      'Last Session Edits': 'Mga huling pagwawasto',
      'No matching verified records found.': 'Walang nahanap na katugmang nasuring rekord.',
      'Ref:': 'Reference:',
      'steps done': 'hakbang ang nagawa',
      'Edited & Verified by Human': 'Sinuri at kinumpirma ng tao',
      'Reading document...': 'Binabasa ang dokumento...',
      'Analyzing document...': 'Sinusuri ang dokumento...',
      'Could not generate guidance': 'Hindi nakagawa ng gabay',
      'Demo guidance generated from the document.': 'Nakagawa ng demo na gabay mula sa dokumento.',
      'Lumen generated an explanation and checklist.': 'Gumawa ang Lumen ng paliwanag at checklist.',
      'The document wizard is ready for a new scan.': 'Handa na ang wizard para sa bagong scan.',
      'Document guidance:': 'Gabay sa dokumento:',
      'Action checklist:': 'Checklist ng aksyon:',
      'There are no records to export.': 'Walang rekord na ie-export.',
      'Exported the records vault to CSV.': 'Na-export ang mga rekord bilang CSV.',
      'Record deleted from vault': 'Tinanggal ang rekord sa imbakan',
      'Official Target Partner': 'Opisyal na katuwang',
      'Barangay Palatiw DRRMO & Welfare Desk (Pasig City)': 'Barangay Palatiw DRRMO at Welfare Desk (Lungsod ng Pasig)',
      'During typhoons and flooding along low-lying areas in Barangay Palatiw, social workers and residents face two bottlenecks: encoding hundreds of handwritten': 'Kapag may bagyo at baha sa mabababang lugar ng Barangay Palatiw, nahaharap ang mga social worker at residente sa dalawang hamon: pag-encode ng daan-daang sulat-kamay na',
      'DAF-AC intake cards': 'DAF-AC intake card',
      'and helping families understand complex': 'at pagpapaliwanag sa mga pamilya ng masalimuot na',
      'LGU relief notices, hospital bills, and lost-ID requirements': 'abiso ng LGU tungkol sa ayuda, bayarin sa ospital, at mga kailangan sa nawalang ID',
      'Cuts intake encoding time from 4 minutes per paper form to under 15 seconds with Lumen OCR + Human-in-the-Loop verification.': 'Pinaiikli ang pag-encode ng bawat form mula 4 na minuto tungo sa wala pang 15 segundo gamit ang Lumen OCR at pagsusuri ng tao.',
      'Translates English legal/medical notices and utility bills into clear Taglish checklists with printable Barangay Action Slips.': 'Isinasalin sa malinaw na Taglish checklist ang mga legal at medikal na abiso at utility bill, kasama ang napi-print na Barangay Action Slip.',
      'Brgy. Palatiw Health & DRRMO Desk': 'Health at DRRMO Desk ng Brgy. Palatiw',
      'Maintenance Meds, DAF-AC Stubs & Calamity Certs': 'Maintenance na gamot, DAF-AC stub, at sertipiko ng sakuna',
      'Pasig CSWDO / OSCA / Malasakit': 'Pasig CSWDO / OSCA / Malasakit',
      'Senior ID Replacement & AICS Medical Reimbursement': 'Pagpapalit ng senior ID at reimbursement medikal ng AICS',
      'Target 11.5 — Protects vulnerable households by safeguarding vital welfare records and speeding up post-disaster relief distribution.': 'Target 11.5 — Pinoprotektahan ang mahihinang sambahayan sa pag-iingat ng mahahalagang rekord at pagpapabilis ng pamamahagi ng ayuda matapos ang sakuna.',
      'Target 13.1 — Strengthens community-level adaptive capacity to climate-related hazards and typhoon flooding in Metro Manila.': 'Target 13.1 — Pinatitibay ang kakayahan ng komunidad na umangkop sa mga panganib dulot ng klima at pagbaha mula sa bagyo sa Metro Manila.',
      'All': 'Lahat ng',
      'and': 'at',
      'headers are injected server-side via': 'header ay inilalagay sa server sa pamamagitan ng',
      'using': 'gamit ang',
      '—never exposed in browser code.': '—hindi inilalantad sa browser code.',
      'Search by resident name, control/stub number, address, or document text...': 'Maghanap gamit ang pangalan, control/stub number, address, o teksto ng dokumento...',
      'Scanned via Lumen OCR': 'Na-scan gamit ang Lumen OCR',
      'Demo guidance ready': 'Handa na ang demo na gabay',
      'AI explanation ready': 'Handa na ang paliwanag ng AI',
      'Please wait for the current AI response to finish.': 'Hintaying matapos ang kasalukuyang sagot ng AI.',
      'Please scan or verify a document first!': 'Mag-scan o magsuri muna ng dokumento!',
      'Enter a question for the document assistant.': 'Magtanong sa document assistant.',
      'Enter an action step before adding it.': 'Maglagay muna ng hakbang bago ito idagdag.',
      'This record could not be found. Refresh the vault and try again.': 'Hindi mahanap ang rekord. I-refresh ang imbakan at subukan muli.',
      'Remove this record from the Barangay Vault?': 'Alisin ang rekord na ito sa Barangay Vault?',
      'Please enter a reference number (use N/A if none is shown).': 'Maglagay ng reference number (gamitin ang N/A kung walang nakasaad).',
      'Please enter the resident or household name.': 'Ilagay ang pangalan ng residente o sambahayan.',
      'Please select a document category.': 'Pumili ng kategorya ng dokumento.',
      'The document could not be scanned.': 'Hindi ma-scan ang dokumento.',
      'The record could not be saved.': 'Hindi ma-save ang rekord.',
      'Could not load saved records from the backend.': 'Hindi ma-load ang mga naka-save na rekord mula sa backend.',
      'Could not delete the record.': 'Hindi matanggal ang rekord.',
      'Inspect / Edit': 'Suriin / I-edit',
      'Reset': 'I-reset',
      'Category:': 'Kategorya:',
      'Name / Resident:': 'Pangalan / Residente:',
      'Ref / Stub No.:': 'Reference / Stub No.:',
      'Human Verification:': 'Pagsusuri ng tao:',
      'Ask Lumen AI Chat a specific question (e.g., Paano kumuha ng Affidavit of Loss sa Barangay?)': 'Magtanong sa Lumen AI (hal. Paano kumuha ng Affidavit of Loss sa Barangay?)',
      'Upload or pick a sample document': 'Mag-upload o pumili ng halimbawang dokumento',
      'e.g., Mendoza, Teresita L.': 'hal. Mendoza, Teresita L.',
      'e.g., PLTW-2026-0915': 'hal. PLTW-2026-0915',
      'e.g., PHP 5,000.00 • Nov 16': 'hal. PHP 5,000.00 • Nob 16',
      'e.g., Purok 4, Brgy. Palatiw': 'hal. Purok 4, Brgy. Palatiw',
      'Extracted text appears here. Edit any word or number...': 'Lalabas dito ang nakuha na teksto. Itama ang salita o numero...',
      'Lumen AI Chat explanation will appear here...': 'Lalabas dito ang paliwanag ng Lumen AI...',
      'DAF-AC Relief Intake Card': 'DAF-AC Card para sa ayuda',
      'Barangay Public Advisory': 'Pampublikong abiso ng barangay',
      'Meralco Billing Statement': 'Billing statement ng Meralco',
      'Pharmacy Medicine Receipt': 'Resibo ng gamot mula sa botika',
      'Verify & fix OCR fields before AI': 'Suriin at itama ang mga detalye bago gamitin ang AI',
      'Taglish guide, checklist & save': 'Gabay sa Taglish, checklist, at pag-save',
      'No Document Loaded Yet': 'Wala pang na-load na dokumento',
      'Upload a file or pick a Demo Paper in Step 1': 'Mag-upload ng file o pumili ng demo sa Hakbang 1',
      'Not selected': 'Hindi pa napipili',
      'Pending Scan': 'Hindi pa nai-scan',
      '1. Relief Form': '1. Form ng ayuda',
      '2. LGU Notice': '2. Abiso ng LGU',
      '3. Meralco Bill': '3. Bill ng Meralco',
      '4. Med Receipt': '4. Resibo ng gamot',
      'STEP 1 OF 3 • UNDERSTAND': 'HAKBANG 1 SA 3 • UNAWAIN',
      'Lumen OCR extracts text from forms, receipts, bills, notices, and household records via our backend proxy.': 'Kinukuha ng Lumen OCR ang teksto mula sa mga form, resibo, bill, abiso, at rekord ng sambahayan.',
      'or click to browse from your device (Supports JPG, PNG, PDF)': 'o pumili ng file sa device (JPG, PNG, PDF)',
      'Testing or Live Pitching? Click any sample Filipino document below to jump straight to Step 2:': 'Pumili ng halimbawang dokumento sa ibaba upang dumiretso sa Hakbang 2:',
      '1. DAF-AC Evacuation Form': '1. DAF-AC evacuation form',
      'Handwritten barangay relief card with an intentional OCR typo (': 'Sulat-kamay na barangay relief card na may sadyang OCR typo (',
      ') to showcase human correction.': ') upang ipakita ang pagwawasto ng tao.',
      '2. Barangay Relief & ID Advisory': '2. Abiso sa ayuda at ID ng barangay',
      'Official LGU notice on claiming DSWD cash aid and replacing flood-damaged IDs.': 'Opisyal na abiso ng LGU tungkol sa DSWD cash aid at pagpapalit ng ID na nasira sa baha.',
      '3. Meralco Disconnection Bill': '3. Bill ng Meralco',
      'Monthly electric billing statement with calamity staggered payment rules.': 'Buwanang bill sa kuryente at mga tuntunin sa hulugang bayad kapag may sakuna.',
      '4. Pharmacy Medicine Receipt': '4. Resibo ng botika',
      'Senior citizen maintenance medicine OR for DSWD AICS medical reimbursement.': 'Resibo ng gamot para sa senior citizen at DSWD AICS reimbursement.',
      'STEP 2 OF 3 • HUMAN-IN-THE-LOOP BONUS': 'HAKBANG 2 SA 3 • PAGSUSURI NG TAO',
      'Check or Correct What Lumen OCR Read': 'Suriin o itama ang nabasa ng Lumen OCR',
      'Inspect the extracted fields and raw text below. Fix any misread characters before sending to Lumen AI Chat.': 'Suriin ang mga detalye at teksto sa ibaba. Itama ang mali bago ipadala sa Lumen AI.',
      'Toggle Side-by-Side Original OCR': 'Ipakita ang orihinal na OCR sa tabi',
      '1. Verify Structured Key Fields': '1. Suriin ang mahahalagang detalye',
      'Document Category': 'Kategorya ng dokumento',
      'Forms (DAF-AC / Gov Form)': 'Mga form (DAF-AC / gobyerno)',
      'Bills (Meralco / Water / Rent)': 'Mga bill (Meralco / tubig / upa)',
      'Receipts (Pharmacy / Store OR)': 'Mga resibo (botika / tindahan)',
      'Records (Medical Rx / ID Record)': 'Mga rekord (reseta / ID)',
      'Resident / Biller / Payee Name': 'Pangalan ng residente / nagbayad',
      'Control / OR / Account No.': 'Control / OR / account no.',
      'Amount / Fee / Deadline': 'Halaga / bayad / deadline',
      'Address / Issuing Office': 'Address / tanggapang naglabas',
      'Urgency / Priority Level': 'Antas ng pagkaapurahan',
      'High Priority (Senior / Meds)': 'Mataas (senior / gamot)',
      'Action Required (Deadline / Bill)': 'Kailangan ng aksyon (deadline / bill)',
      'Standard Record (Archival)': 'Karaniwang rekord (archive)',
      'Raw Unedited Lumen OCR': 'Orihinal na teksto ng Lumen OCR',
      'Reset to Raw': 'Ibalik sa orihinal',
      'No scan loaded yet.': 'Wala pang na-scan.',
      '2. Editable Verified Document Text (Click inside to fix typos)': '2. Nae-edit na teksto (i-click upang itama)',
      'Ready for review': 'Handa nang suriin',
      'Human Verification Audit Note': 'Tala sa pagsusuri ng tao',
      'Back to Step 1 (Upload)': 'Bumalik sa Hakbang 1 (Upload)',
      'STEP 3 OF 3 • ACT ON & ORGANIZE': 'HAKBANG 3 SA 3 • KUMILOS AT AYUSIN',
      'Lumen AI Chat Explainer & Action Checklist': 'Paliwanag ng Lumen AI at checklist ng aksyon',
      "Translate complex terms into plain Taglish/Tagalog, review or edit the AI's answer, and save to the Barangay Vault.": 'Ipaliwanag ang mahihirap na salita sa payak na Taglish/Tagalog, suriin ang sagot ng AI, at i-save sa imbakan ng barangay.',
      'Quick Analysis Modes (Lumen AI Chat)': 'Mabilis na pagsusuri (Lumen AI)',
      'List Requirements & Deadlines': 'Ilista ang mga kailangan at deadline',
      'How to Claim Aid / Discount': 'Paano kumuha ng ayuda / diskuwento',
      "Lumen AI Chat Response (Editable — Check or refine the AI's explanation)": 'Sagot ng Lumen AI (maaaring suriin o itama)',
      'Ready': 'Handa na',
      'Toggle navigation': 'Ipakita o itago ang navigation',
      'SagipRekord dashboard': 'Dashboard ng SagipRekord',
      'Choose a valid document step.': 'Pumili ng wastong hakbang sa dokumento.',
      'Please upload a document or choose a demo paper in Step 1 first.': 'Mag-upload muna ng dokumento o pumili ng demo sa Hakbang 1.',
      'Review the extracted text and confirm the details in Step 2 first.': 'Suriin muna ang nakuha na teksto at kumpirmahin ang mga detalye sa Hakbang 2.',
      'Choose an image or PDF before starting the scan.': 'Pumili ng larawan o PDF bago simulan ang scan.',
      'Use a JPEG, PNG, WebP image, or PDF document.': 'Gumamit ng JPEG, PNG, WebP, o PDF na dokumento.',
      'Documents must be smaller than 10 MB.': 'Dapat mas maliit sa 10 MB ang dokumento.',
      'This browser could not attach the dropped file. Please use the file picker.': 'Hindi maikabit ng browser ang file. Gamitin ang file picker.',
      'Demo OCR text loaded. Review it before saving.': 'Na-load ang demo OCR text. Suriin ito bago i-save.',
      'Document text extracted. Review it before saving.': 'Nakuha ang teksto ng dokumento. Suriin ito bago i-save.',
      'Restored the original extracted text.': 'Ibinalik ang orihinal na nakuha na teksto.',
      'Checklist text must be under 1,000 characters and the list is limited to 100 steps.': 'Dapat wala pang 1,000 character ang bawat gawain at hanggang 100 hakbang lamang ang checklist.',
      'There is no verified document text to save.': 'Walang nasuring teksto ng dokumento na mai-save.',
      'Generate or enter document guidance before saving the verified record.': 'Gumawa o maglagay ng gabay bago i-save ang nasuring rekord.',
      'Could not contact the document assistant.': 'Hindi makakonekta sa document assistant.',
      'No records to export': 'Walang rekord na ie-export.',
      'Could not reach the SagipRekord server. Check your connection and try again.': 'Hindi makakonekta sa SagipRekord server. Suriin ang koneksyon at subukan muli.',
      'The request timed out. Check your connection and try again.': 'Nag-time out ang kahilingan. Suriin ang koneksyon at subukan muli.',
      'This browser is blocking local preferences; the current choice will last for this visit.': 'Hinaharang ng browser ang lokal na preference; mananatili ang pinili sa pagbisitang ito.',
      'Remove action step': 'Alisin ang hakbang',
      'Human-Verified Document Text': 'Teksto ng dokumentong sinuri ng tao',
      'The server returned an invalid response': 'Nagbalik ang server ng hindi wastong tugon',
      'Auto-extracted from Lumen AI Chat. Check off completed requirements or add custom tasks.': 'Mula sa Lumen AI. Lagyan ng tsek ang natapos o magdagdag ng gawain.',
      '+ Add': '+ Idagdag',
      'Back to Step 2 (Edit OCR)': 'Bumalik sa Hakbang 2 (I-edit ang OCR)',
      'Print Action Slip': 'I-print ang action slip',
      'ORGANIZE MODULE • DIGITAL VAULT': 'PAG-AAYOS • DIGITAL VAULT',
      'Barangay Palatiw Verified Records Ledger': 'Ledger ng nasuring rekord ng Barangay Palatiw',
      'All human-verified forms, receipts, bills, notices, and relief records stored in one searchable vault.': 'Lahat ng nasuring form, resibo, bill, abiso, at rekord ng ayuda ay nasa iisang nahahanap na imbakan.',
      '100%': '100%',
      '0 chars fixed': '0 karakter ang naitama',
      '0 edits made': 'Walang karakter na binago',
      'All Document Categories': 'Lahat ng kategorya',
      'Forms (DAF-AC)': 'Mga form (DAF-AC)',
      'Notices (LGU Advisory)': 'Mga abiso (LGU)',
      'Bills (Utility / Rent)': 'Mga bill (utility / upa)',
      'Receipts (Pharmacy / OR)': 'Mga resibo (botika / OR)',
      'Records (Medical / ID)': 'Mga rekord (medikal / ID)',
      'All Priority Levels': 'Lahat ng antas ng prayoridad',
      'For Barangay Staff & Volunteers': 'Para sa kawani at boluntaryo ng barangay',
      'For Residents & Senior Citizens': 'Para sa mga residente at senior citizen',
      'Integrated Barangay Palatiw & Pasig Referral Desks': 'Mga referral desk ng Barangay Palatiw at Pasig',
      'UN Sustainable Development Goals': 'Mga layunin ng UN para sa napapanatiling kaunlaran',
      'SDG Alignment & System Architecture': 'Pagkakaugnay sa SDG at arkitektura ng sistema',
      'SDG 11: Sustainable Cities & Communities': 'SDG 11: Napapanatiling lungsod at komunidad',
      'SDG 13: Climate Action': 'SDG 13: Aksyon para sa klima',
      'Secure Backend Proxy Architecture': 'Ligtas na backend proxy architecture',
      'Official Verified Record Slip': 'Opisyal na kopya ng nasuring rekord',
      'Print / Save PDF': 'I-print / I-save bilang PDF',
      'Close': 'Isara',
      'Taglish': 'Taglish',
      'Pure Tagalog': 'Purong Tagalog',
      'Plain English': 'Payak na Ingles',
      'No checklist items added yet.': 'Wala pang idinagdag na gawain.'
>>>>>>>>> Temporary merge branch 2
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
<<<<<<<<< Temporary merge branch 1
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
=========
    this.translateSubtree(document.body);
>>>>>>>>> Temporary merge branch 2
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
<<<<<<<<< Temporary merge branch 1
      showToast('Add a document first.', 'warning');
      return;
=========
      showToast('Please upload a document or choose a demo paper in Step 1 first.', 'warning');
      return false;
    }
    if (stepNumber === 3 && !AppState.step2Verified) {
      showToast('Review the extracted text and confirm the details in Step 2 first.', 'warning');
      return false;
    }
    if (stepNumber === 3 && !this.validateMetadata()) {
      return false;
>>>>>>>>> Temporary merge branch 2
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
<<<<<<<<< Temporary merge branch 1
      if (n === stepNumber) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
=========
      if (!btn || !circle) return;
>>>>>>>>> Temporary merge branch 2

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
<<<<<<<<< Temporary merge branch 1
      <p class="text-xs font-extrabold text-slate-700">${chosen.title}</p>
      <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-1">Sample document</span>
=========
      <p class="text-xs font-extrabold text-slate-700">${escapeHtml(chosen.title)}</p>
      <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold mt-1">Scanned via Lumen OCR</span>
    `;

    OcrAndVerifyModule.autoExtractMetadata(chosen.text);
    OcrAndVerifyModule.updateDiffAudit();
    document.getElementById('step1Check').classList.remove('hidden');

    NavigationModule.switchModule('wizard');
    this.goToStep(2);
    showToast(`Step 1 Complete! Loaded ${chosen.title} into Step 2 for verification.`, 'success');
    AiChatAndChecklistModule.renderChecklist();
>>>>>>>>> Temporary merge branch 2
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
      badge.innerHTML = `<i class="fa-solid fa-user-pen mr-1"></i>${AppState.currentEditDistance} chars fixed`;
      badge.className = 'bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]';
      indicator.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check-double mr-1"></i>Edited & Verified by Human</span>`;
      if (!note.value) {
        note.value = `User reviewed & corrected ${AppState.currentEditDistance} OCR character(s)`;
      }
    } else {
      badge.innerHTML = `<i class="fa-solid fa-user-check mr-1"></i>0 edits made`;
      badge.className = 'bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]';
    }
    document.getElementById('statEdits').textContent = `${AppState.currentEditDistance} chars fixed`;
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
      showToast('Please scan or verify a document first!', 'warning');
      return;
    }

    const aiStatus = document.getElementById('aiStatusText');
    const aiBox = document.getElementById('verifiedAiAdvice');
    aiStatus.innerHTML = `<span class="text-purple-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Lumen AI Chat thinking...</span>`;
    const buttons = [...document.querySelectorAll('#explainBtn, #askCustomBtn, .prompt-pill')];
    buttons.forEach(button => { button.disabled = true; });
    AppState.activeRequest = 'chat';
>>>>>>>>> Temporary merge branch 2

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
<<<<<<<<< Temporary merge branch 1
      const data = await res.json();
      if (data.success) {
        aiBox.value = data.reply;
        this.extractTasksFromAiReply(data.reply);
        aiStatus.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check mr-1"></i>Ready</span>`;
        document.getElementById('step3Check').classList.remove('hidden');
        showToast('Your explanation is ready.', 'success');
      } else {
        showToast(data.error || 'AI Chat error', 'error');
=========
      if (typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error('The assistant returned an empty response.');
>>>>>>>>> Temporary merge branch 2
      }
      aiBox.value = data.reply;
      this.extractTasksFromAiReply(data.reply);
      AppState.step3Complete = true;
      document.getElementById('step3Check').classList.remove('hidden');
      aiStatus.textContent = data.mode === 'demo_fallback' ? 'Demo guidance ready' : 'AI explanation ready';
      showToast(data.mode === 'demo_fallback' ? 'Demo guidance generated from the document.' : 'Lumen generated an explanation and checklist.', 'success');
    } catch (error) {
      aiStatus.textContent = 'Could not generate guidance';
      showToast(error.message || 'Could not contact the document assistant.', 'error');
    } finally {
      AppState.activeRequest = null;
      buttons.forEach(button => { button.disabled = false; });
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
<<<<<<<<< Temporary merge branch 1
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
=========
      container.textContent = AppState.currentLanguage === 'tl'
        ? 'Gumawa ng buod at mga hakbang upang bumuo ng checklist.'
        : 'Click "Generate Full Summary & Action Steps" above to build your interactive checklist.';
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
    this.renderChecklist();
  },

  removeItem(idx) {
    AppState.currentChecklist.splice(idx, 1);
    this.renderChecklist();
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
<<<<<<<<< Temporary merge branch 1
          <p class="text-xs font-bold text-slate-500">No records found.</p>
=========
          <p class="text-xs font-bold text-slate-500">${escapeHtml(AppState.currentLanguage === 'tl' ? 'Walang nahanap na katugmang nasuring rekord.' : 'No matching verified records found.')}</p>
>>>>>>>>> Temporary merge branch 2
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
        <div class="bg-white dark-card border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
<<<<<<<<< Temporary merge branch 1
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
=========
              <span class="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">${escapeHtml(r.doc_type)}</span>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}">${escapeHtml(r.priority_level)}</span>
            </div>

            <h3 class="font-extrabold text-base text-slate-800">${escapeHtml(r.resident_name)}</h3>
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
    showToast(`Opened record ${rec.id} in Wizard Step 2`, 'info');
  },

  async deleteRecord(id) {
<<<<<<<<< Temporary merge branch 1
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
=========
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
>>>>>>>>> Temporary merge branch 2
