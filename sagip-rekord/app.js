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
  session: {
    userId: 'local-workspace',
    displayName: 'Palatiw DRRMO',
    role: 'barangay_worker',
    authenticated: false
  },
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

const SessionModule = {
  getContext() {
    return { ...AppState.session };
  }
};

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
    if (!['dashboard', 'wizard', 'vault', 'impact'].includes(moduleName)) return;
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
    syncSidebarControls();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

function syncSidebarControls() {
  const desktop = window.matchMedia('(min-width: 1025px)').matches;
  const mobileOpen = document.body.classList.contains('sidebar-open');
  const expanded = desktop ? !AppState.sidebarCollapsed : mobileOpen;
  document.getElementById('appSidebar')?.setAttribute('aria-hidden', String(!desktop && !mobileOpen));
  document.querySelectorAll('#sidebarToggle, #sidebarToggleDesktop').forEach(button => {
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', I18n.translate(expanded ? 'Collapse navigation' : 'Expand navigation'));
    button.querySelector('.burger-lines')?.classList.toggle('is-open', expanded);
  });
}

const I18n = {
  translations: {
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
    }
  },

  translate(text) {
    if (AppState.currentLanguage !== 'tl') return text;
    const direct = this.translations.tl[text];
    if (direct) return direct;
    const editCount = text.match(/^(\d+) chars fixed$/);
    if (editCount) return `${editCount[1]} karakter ang naitama`;
    const doneSteps = text.match(/^(\d+)\/(\d+) steps done$/);
    if (doneSteps) return `${doneSteps[1]}/${doneSteps[2]} hakbang ang nagawa`;
    const savedRecord = text.match(/^Saved verified record (.+)\.$/);
    if (savedRecord) return `Na-save ang nasuring rekord ${savedRecord[1]}.`;
    const openedRecord = text.match(/^Opened record (.+) in Wizard Step 2$/);
    if (openedRecord) return `Binuksan ang rekord ${openedRecord[1]} sa Hakbang 2 ng wizard.`;
    const savedPreset = text.match(/^Step 1 Complete! Loaded (.+) into Step 2 for verification\.$/);
    if (savedPreset) return `Kumpleto ang Hakbang 1! Na-load ang ${savedPreset[1]} sa Hakbang 2 para suriin.`;
    return text;
  },

  translateTextNode(node) {
    if (node.parentElement?.tagName === 'OPTION') return;
    const englishText = originalTextNodes.get(node) ?? node.nodeValue.trim();
    originalTextNodes.set(node, englishText);
    const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
    const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
    const localized = this.translate(englishText);
    if (node.nodeValue !== `${leading}${localized}${trailing}`) {
      node.nodeValue = `${leading}${localized}${trailing}`;
    }
  },

  translateAttribute(element, attribute) {
    const datasetKey = attribute === 'aria-label' ? 'englishAriaLabel' : `english${attribute}`;
    const englishText = element.dataset[datasetKey] || element.getAttribute(attribute);
    if (!englishText) return;
    element.dataset[datasetKey] = englishText;
    const localized = this.translate(englishText);
    if (element.getAttribute(attribute) !== localized) element.setAttribute(attribute, localized);
  },

  translateSubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const attributes = ['placeholder', 'title', 'aria-label'];
    if (attributes.some(attribute => root.hasAttribute(attribute))) {
      attributes.forEach(attribute => {
        if (root.hasAttribute(attribute)) this.translateAttribute(root, attribute);
      });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) this.translateTextNode(walker.currentNode);
    root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
      attributes.forEach(attribute => {
        if (element.hasAttribute(attribute)) this.translateAttribute(element, attribute);
      });
    });
  },

  observeDynamicContent() {
    if (this.observer || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver(mutations => {
      if (AppState.currentLanguage !== 'tl') return;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => this.translateSubtree(node));
        } else if (mutation.type === 'attributes') {
          this.translateAttribute(mutation.target, mutation.attributeName);
        }
      });
    });
    this.observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
      childList: true,
      subtree: true
    });
  },

  setLanguage(language) {
    AppState.currentLanguage = this.translations[language] ? language : 'en';
    savePreference('sagiprekord-language', AppState.currentLanguage);
    document.documentElement.lang = AppState.currentLanguage === 'tl' ? 'tl' : 'en';
    this.translateSubtree(document.body);
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
    this.observeDynamicContent();
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
      showToast('Please upload a document or choose a demo paper in Step 1 first.', 'warning');
      return false;
    }
    if (stepNumber === 3 && !AppState.step2Verified) {
      showToast('Review the extracted text and confirm the details in Step 2 first.', 'warning');
      return false;
    }
    if (stepNumber === 3 && !this.validateMetadata()) {
      return false;
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
      if (!btn || !circle) return;

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
  }
};

function documentInputClear() {
  const input = document.getElementById('documentInput');
  if (input) input.value = '';
  document.getElementById('fileNameDisplay').textContent = 'Drag & Drop Image or PDF Document Here';
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
      if (typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error('The assistant returned an empty response.');
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
      container.textContent = AppState.currentLanguage === 'tl'
        ? 'Gumawa ng buod at mga hakbang upang bumuo ng checklist.'
        : 'Click "Generate Full Summary & Action Steps" above to build your interactive checklist.';
      return;
    }
    container.innerHTML = AppState.currentChecklist.map((item, idx) => `
      <label class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
        <div class="flex items-center gap-2.5">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-checklist-index="${idx}" class="rounded text-emerald-600 focus:ring-0" />
          <span class="${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}">${escapeHtml(item.text)}</span>
        </div>
        <button type="button" data-remove-checklist-index="${idx}" class="text-slate-300 hover:text-rose-500 text-sm font-bold" aria-label="Remove action step">&times;</button>
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
          <p class="text-xs font-bold text-slate-500">${escapeHtml(AppState.currentLanguage === 'tl' ? 'Walang nahanap na katugmang nasuring rekord.' : 'No matching verified records found.')}</p>
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
              <span class="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">${escapeHtml(r.doc_type)}</span>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}">${escapeHtml(r.priority_level)}</span>
            </div>

            <h3 class="font-extrabold text-base text-slate-800">${escapeHtml(r.resident_name)}</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Ref: <strong class="font-mono text-slate-700">${escapeHtml(r.reference_no)}</strong>
              ${r.amount_or_date && r.amount_or_date !== 'N/A' ? `• <span class="text-emerald-700 font-bold">${escapeHtml(r.amount_or_date)}</span>` : ''}
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i>${escapeHtml(r.purok_address)}</p>

            <div class="mt-3 bg-slate-50 dark-subcard border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-600 line-clamp-2">${escapeHtml(r.verified_ocr)}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                <i class="fa-solid fa-user-check mr-1"></i>${escapeHtml(r.correction_note)}
              </span>
              ${totalTasks > 0 ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-list-check mr-1"></i>${doneCount}/${totalTasks} steps done</span>` : ''}
            </div>

            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-[11px] text-slate-400 font-mono">${escapeHtml(r.id)} • ${escapeHtml(r.updated_at)}</span>
              <div class="flex items-center gap-3">
                <button data-open-record="${escapeHtml(r.id)}" class="font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <i class="fa-solid fa-pen-to-square"></i> Inspect / Edit
                </button>
                <button data-delete-record="${escapeHtml(r.id)}" class="text-rose-500 hover:text-rose-700 font-semibold" aria-label="Delete record">
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
