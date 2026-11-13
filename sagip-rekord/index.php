<?php
declare(strict_types=1);
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';
startAuthSession();
try {
    $pdo = databaseConnection();
    ensureDemoAccounts($pdo);
} catch (PDOException $error) {
    error_log('SagipRekord database initialization failed: ' . $error->getMessage());
    http_response_code(503);
    exit('The database is unavailable. Check its configuration and try again.');
} catch (RuntimeException $error) {
    error_log('SagipRekord database configuration failed: ' . $error->getMessage());
    http_response_code(503);
    exit('The database configuration is invalid.');
}
if (!refreshSessionUser($pdo)) {
    header('Location: ./login.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="api-base" content="./api.php" />
  <title>SagipRekord | Community records, ready when it matters</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <link rel="stylesheet" href="style.css" />
</head>
<body class="app-shell">

  <!-- TOAST NOTIFICATION CONTAINER -->
  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none" aria-live="polite" aria-relevant="additions"></div>

  <!-- =========================================================
       TOP APPLICATION HEADER & MODULE NAVIGATION BAR
       ========================================================= -->
  <header class="app-topbar">
    <button id="sidebarToggle" class="icon-button mobile-menu-button" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="appSidebar">
      <span class="burger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
    </button>
    <button class="brand-lockup" type="button" onclick="NavigationModule.switchModule('dashboard')" aria-label="SagipRekord dashboard">
      <span class="brand-mark"><i class="fa-solid fa-life-ring"></i></span>
      <span class="brand-copy"><strong>SagipRekord</strong><small>Community records, made clear</small></span>
    </button>
    <div class="topbar-actions">
      <div class="language-switch" role="group" aria-label="Choose language">
        <button type="button" class="language-option is-selected" data-language="en" aria-label="English" aria-pressed="true">ENG</button>
        <button type="button" class="language-option" data-language="tl" aria-label="Tagalog" aria-pressed="false">TAG</button>
      </div>
      <button id="sidebarToggleDesktop" class="icon-button desktop-menu-button" type="button" aria-label="Collapse navigation" aria-expanded="true" aria-controls="appSidebar">
        <span class="burger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
      <button id="logoutButton" class="icon-button" type="button" aria-label="Sign out" title="Sign out">
        <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
      </button>
    </div>
  </header>

  <div id="sidebarBackdrop" class="sidebar-backdrop"></div>
  <aside id="appSidebar" class="app-sidebar" aria-label="Main navigation" aria-hidden="false">
    <p class="sidebar-caption" data-i18n="workspace">WORKSPACE</p>
    <nav class="sidebar-navigation">
      <button type="button" class="sidebar-link is-active" data-module="dashboard" onclick="NavigationModule.switchModule('dashboard')">
        <i class="fa-solid fa-house"></i><span data-i18n="overview">Overview</span>
      </button>
      <button type="button" class="sidebar-link" data-module="wizard" onclick="NavigationModule.switchModule('wizard')">
        <i class="fa-solid fa-wand-magic-sparkles"></i><span data-i18n="documentWizard">Document wizard</span>
      </button>
      <button type="button" class="sidebar-link" data-module="vault" onclick="NavigationModule.switchModule('vault')">
        <i class="fa-solid fa-box-archive"></i><span data-i18n="recordsVault">Records vault</span><span id="navVaultCount" class="sidebar-count">0</span>
      </button>
      <button type="button" class="sidebar-link" data-module="impact" onclick="NavigationModule.switchModule('impact')">
        <i class="fa-solid fa-handshake-angle"></i><span data-i18n="communityHub">Community hub</span>
      </button>
      <button type="button" class="sidebar-link" data-module="admin" aria-label="Administration" onclick="NavigationModule.switchModule('admin')">
        <i class="fa-solid fa-user-shield"></i><span>Administration</span>
      </button>
    </nav>
    <div class="sidebar-profile">
      <span class="profile-avatar" id="sessionAvatar">U</span>
      <span><strong id="sessionDisplayName">SagipRekord User</strong><small id="sessionRole">Resident</small></span>
    </div>
  </aside>

  <main id="module-dashboard" class="app-module dashboard-module">
    <section class="dashboard-welcome compact-welcome" aria-labelledby="dashboardTitle">
      <div>
        <p class="eyebrow"><span class="eyebrow-dot"></span><span data-i18n="welcomeEyebrow">YOUR COMMUNITY WORKSPACE</span></p>
        <h1><span data-i18n="welcomeTitle">Good morning, Palatiw.</span><br><span class="heading-muted" data-i18n="welcomeSubtitle">Let’s keep what matters within reach.</span></h1>
        <p class="welcome-copy" data-i18n="welcomeCopy">Scan, verify, and organize important community documents in one calm, secure place.</p>
        <button type="button" class="primary-button" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1)">
          <i class="fa-solid fa-plus"></i><span data-i18n="startDocument">Start a document</span><i class="fa-solid fa-arrow-right button-arrow"></i>
        </button>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span>
        <span class="art-sparkle sparkle-one">✦</span><span class="art-sparkle sparkle-two">✧</span>
        <div class="globe-card">
          <svg viewBox="0 0 170 170" role="img" aria-label="">
            <defs><linearGradient id="globeFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dfe9ff"/></linearGradient></defs>
            <circle cx="85" cy="85" r="67" fill="url(#globeFill)"/>
            <ellipse cx="85" cy="85" rx="31" ry="67" fill="none" stroke="#A58AE8" stroke-width="2" opacity=".65"/>
            <ellipse cx="85" cy="85" rx="59" ry="24" fill="none" stroke="#4378E4" stroke-width="2" opacity=".4"/>
            <path d="M21 85h128M85 19v132" stroke="#4378E4" stroke-width="1.5" opacity=".25"/>
            <path d="M51 54c9-8 19-9 24-3l-5 10 10 5-6 10-13-3-7 11-11-3-7-12 8-15zM101 91l15-8 14 8-4 14-13 8-9-9zM66 110l12 6 6 18-12 4-9-12z" fill="#A58AE8" opacity=".8"/>
            <circle cx="128" cy="53" r="7" fill="#3364E1"/>
          </svg>
          <span class="globe-label"><i class="fa-solid fa-location-dot"></i> PALATIW, PASIG</span>
        </div>
        <div class="floating-note"><span class="note-check"><i class="fa-solid fa-check"></i></span><span><strong>Records protected</strong><small>Ready when you need them</small></span></div>
      </div>
    </section>

    <section class="quick-action-grid" aria-label="Choose what to do">
      <button type="button" class="quick-action-card" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1)">
        <span class="quick-action-icon" aria-hidden="true"><i class="fa-solid fa-camera"></i></span>
        <span class="quick-action-title" data-i18n="scanDocument">Scan a document</span>
        <span class="quick-action-hint" data-i18n="scanHint">Take a photo or choose a file</span>
      </button>
      <button type="button" class="quick-action-card" onclick="NavigationModule.switchModule('vault')">
        <span class="quick-action-icon" aria-hidden="true"><i class="fa-solid fa-folder-open"></i></span>
        <span class="quick-action-title" data-i18n="openVault">Find a saved record</span>
        <span class="quick-action-hint" data-i18n="searchHint">Search your records</span>
      </button>
    </section>

    <details class="dashboard-summary">
      <summary data-i18n="workspaceSummary">Workspace summary</summary>
      <section class="stats-grid" aria-label="Workspace statistics">
        <article class="stat-card"><span class="stat-icon"><i class="fa-regular fa-folder-open"></i></span><p data-i18n="savedRecords">Saved records</p><strong id="dashboardRecordCount">0</strong></article>
        <article class="stat-card"><span class="stat-icon accent-icon"><i class="fa-solid fa-list-check"></i></span><p data-i18n="actionSteps">Action steps</p><strong id="dashboardActionCount">0</strong></article>
      </section>
    </details>

    <footer class="app-footer"><span>© 2026 SagipRekord</span></footer>
  </main>

  <!-- =========================================================
       MODULE 1: GUIDED STEP-BY-STEP DOCUMENT WIZARD
       ========================================================= -->
  <main id="module-wizard" class="app-module hidden max-w-7xl mx-auto w-full px-4 py-6 flex-1">

    <!-- PROGRESSIVE STEPPER HEADER BAR -->
    <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        <!-- Step 1 Trigger -->
        <button type="button" onclick="WizardModule.goToStep(1)" id="stepperBtn-1" class="stepper-node active-node flex items-center gap-3 p-3 rounded-xl border-2 text-left transition">
          <div class="step-circle w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow">
            1
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Step 1</span>
              <span id="step1Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Scan</p>
          </div>
        </button>

        <!-- Step 2 Trigger -->
        <button type="button" onclick="WizardModule.goToStep(2)" id="stepperBtn-2" class="stepper-node flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 text-left transition">
          <div class="step-circle w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
            2
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Step 2</span>
              <span id="step2Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Check</p>
          </div>
        </button>

        <!-- Step 3 Trigger -->
        <button type="button" onclick="WizardModule.goToStep(3)" id="stepperBtn-3" class="stepper-node flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 text-left transition">
          <div class="step-circle w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
            3
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Step 3</span>
              <span id="step3Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Save</p>
          </div>
        </button>

      </div>
    </div>

    <!-- WIZARD SPLIT LAYOUT: LEFT CONTEXT PANEL (4 COLS) + RIGHT ACTIVE STEP (8 COLS) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- LEFT 4 COLUMNS: STICKY DOCUMENT CONTEXT & LIVE SUMMARY CARD -->
      <aside class="lg:col-span-4 bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-5 lg:sticky lg:top-20 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">Document preview</h3>
          </div>
          <button type="button" id="clearFormBtn" class="text-xs text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 transition">
            <i class="fa-solid fa-rotate-left"></i> Reset
          </button>
        </div>

        <!-- Document Visual Preview Box -->
        <div id="previewBox" class="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-4 min-h-[160px] text-center overflow-hidden">
          <i class="fa-regular fa-file-lines text-3xl text-slate-300 mb-2"></i>
          <p class="text-xs font-bold text-slate-500">No document yet</p>
        </div>

        <!-- Live Metadata Summary Pill List -->
        <details class="document-details bg-slate-50 dark-subcard rounded-xl p-3.5 border border-slate-200/80">
          <summary>Document details</summary>
          <div class="space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Type:</span>
            <span id="contextCategory" class="font-bold text-indigo-700 text-right">Not selected</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Name:</span>
            <span id="contextResident" class="font-bold text-slate-800 text-right">—</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Number:</span>
            <span id="contextRef" class="font-mono font-bold text-slate-700 text-right">—</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Text check:</span>
            <span id="diffCounterBadge" class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
              Not checked
            </span>
          </div>
          </div>
        </details>

      </aside>

      <!-- RIGHT 8 COLUMNS: DEDICATED STEP PANELS (ONLY 1 SHOWN AT A TIME) -->
      <div class="lg:col-span-8">

        <!-- =====================================================
             WIZARD STEP 1 PANEL: UNDERSTAND (LUMEN OCR UPLOAD)
             ===================================================== -->
        <section id="wizardStep-1" class="wizard-panel bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span class="bg-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 1 OF 3</span>
              <h2 tabindex="-1" class="text-lg font-extrabold text-slate-800 mt-1">Add a document</h2>
              <p class="text-xs text-slate-500">Take a photo or choose a file.</p>
            </div>
          </div>

          <!-- Upload Form -->
          <form id="ocrForm" class="space-y-4">
            <label id="dropZone" class="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 rounded-2xl p-8 cursor-pointer transition text-center">
              <div class="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-2xl mb-3">
                <i class="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <span id="fileNameDisplay" class="text-base font-extrabold text-slate-700">Choose a photo or PDF</span>
              <span class="text-xs text-slate-500 mt-1">Select a file from your device</span>
              <input type="file" id="documentInput" name="document" accept="image/*,.pdf" aria-label="Choose a photo or PDF" class="sr-only" />
            </label>

            <button type="button" id="openCameraBtn" class="w-full border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold py-3 px-5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
              <i class="fa-solid fa-camera"></i>
              <span>Take a photo</span>
            </button>

            <button type="submit" id="ocrBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm">
              <i class="fa-solid fa-file-lines"></i>
              <span>Read document</span>
              <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </form>

          <details class="document-details pt-3 border-t border-slate-200">
            <summary>Try a sample document</summary>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onclick="WizardModule.loadPreset('form')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-indigo-700">Relief form</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('notice')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-amber-700">Barangay notice</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('bill')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-sky-700">Utility bill</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('receipt')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-emerald-700">Medicine receipt</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
              </button>
            </div>
          </details>
          </section>

        <!-- =====================================================
             WIZARD STEP 2 PANEL: CHECK & CORRECT (HUMAN VERIFY)
             ===================================================== -->
        <section id="wizardStep-2" class="wizard-panel hidden bg-white dark-card rounded-2xl border-2 border-amber-400 shadow-sm p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span class="bg-amber-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 2 OF 3</span>
              <h2 tabindex="-1" class="text-lg font-extrabold text-slate-800 mt-1">Check the document</h2>
              <p class="text-xs text-slate-500">Correct any mistakes, then continue.</p>
            </div>
            <button type="button" id="toggleDiffBtn" class="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
              <i class="fa-solid fa-columns"></i>
              <span>See original text</span>
            </button>
          </div>

          <input type="hidden" id="recordId" value="" />
          <input type="hidden" id="originalOcrStore" value="" />

          <!--Structured Metadata Editor Grid -->
          <div class="bg-amber-50/50 dark-subcard border border-amber-200/80 rounded-xl p-4">
            <p class="text-xs font-extrabold text-amber-900 mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-sliders"></i>
              <span>Check these details</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="docType">Document type</label>
                <select id="docType" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-semibold outline-none">
                  <option value="Forms (DAF-AC Relief Intake)">Form</option>
                  <option value="Notices (LGU / Barangay Advisory)">Notice</option>
                  <option value="Bills (Utility / Disconnection Notice)">Bill</option>
                  <option value="Receipts (Pharmacy / Relief Supply)">Receipt</option>
                  <option value="Records (Medical Rx / Senior ID)">Other record</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="residentName">Person or company</label>
                <input type="text" id="residentName" placeholder="Name" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>

              <div id="residentAccountLink" class="worker-admin-only">
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="residentAccountEmail">Link to resident account (optional)</label>
                <input type="email" id="residentAccountEmail" placeholder="resident@example.org" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="referenceNo">Reference number</label>
                <input type="text" id="referenceNo" placeholder="Number on the document" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-mono outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="amountOrDate">Amount or due date</label>
                <input type="text" id="amountOrDate" placeholder="Amount or date" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="purokAddress">Address</label>
                <input type="text" id="purokAddress" placeholder="Address" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="priorityLevel">Priority</label>
                <select id="priorityLevel" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-semibold outline-none">
                  <option value="High Priority">High</option>
                  <option value="Action Required">Needs action</option>
                  <option value="Standard Record">Standard</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Side-by-Side or Single Full-Text Editor -->
          <div id="ocrComparisonGrid" class="grid grid-cols-1 gap-4">
            <!-- Left Half: Raw Unedited OCR (Shown when Side-by-Side is active) -->
            <div id="diffDrawer" class="hidden bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-700 flex flex-col">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold text-amber-400"><i class="fa-solid fa-robot mr-1"></i>Original text</span>
                <button type="button" id="restoreOriginalBtn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded font-semibold">
                  Restore
                </button>
              </div>
              <pre id="rawOcrComparison" class="text-xs font-mono whitespace-pre-wrap text-slate-300 flex-1 overflow-y-auto max-h-52 leading-relaxed">No scan loaded yet.</pre>
            </div>

            <!-- Right Half: Editable Human-Verified Text -->
            <div class="flex flex-col">
              <div class="flex justify-between items-center mb-1.5">
                <label class="text-xs font-extrabold text-slate-700">
                  <i class="fa-solid fa-user-pen text-amber-600 mr-1"></i>Document text
                </label>
                <span id="editIndicator" class="text-[11px] font-semibold text-slate-400" role="status">Ready</span>
              </div>
              <textarea id="verifiedOcrText" rows="7" aria-label="Document text. Edit mistakes before continuing." placeholder="Document text appears here." class="w-full border-2 border-amber-300 rounded-xl p-3.5 text-xs font-mono bg-white focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"></textarea>
            </div>
          </div>

          <!-- Audit Note -->
          <details class="document-details">
            <summary>Optional note</summary>
            <label class="block text-[11px] font-bold text-slate-600 mb-1" for="correctionNote">What did you correct?</label>
            <input type="text" id="correctionNote" placeholder="Optional" class="w-full border border-slate-300 bg-slate-50 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white" />
          </details>

          <!-- Step 2 Footer Navigation -->
          <div class="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onclick="WizardModule.goToStep(1)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Back</span>
            </button>

            <button type="button" id="proceedToStep3Btn" class="bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-md flex items-center gap-2 transition">
              <i class="fa-solid fa-check-double"></i>
              <span>Continue</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </section>

        <!-- =====================================================
             WIZARD STEP 3 PANEL: ACT ON & SAVE (LUMEN AI CHAT)
             ===================================================== -->
        <section id="wizardStep-3" class="wizard-panel hidden bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span class="bg-purple-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 3 OF 3</span>
              <h2 tabindex="-1" class="text-lg font-extrabold text-slate-800 mt-1">Your next steps</h2>
              <p class="text-xs text-slate-500">Read the explanation and save your record.</p>
            </div>

            <!-- Dialect Selector -->
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-bold text-slate-500" for="chatLanguage">Language</label>
              <select id="chatLanguage" class="border border-purple-300 bg-purple-50 text-purple-900 rounded-xl px-3 py-1.5 text-xs font-extrabold outline-none">
                <option value="Taglish (Simple Filipino-English)">Taglish</option>
                <option value="Simple Tagalog">Tagalog</option>
                <option value="Simple Plain English">English</option>
              </select>
            </div>
          </div>

          <button type="button" id="explainBtn" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Explain this document
          </button>

          <details class="document-details">
            <summary>Ask a question (optional)</summary>
            <div class="flex flex-wrap gap-2">
              <input type="text" id="customQuestion" aria-label="Your question" placeholder="Type your question" class="min-w-[220px] flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 outline-none" />
              <button type="button" id="askCustomBtn" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition">Ask</button>
            </div>
          </details>

          <!-- Editable AI Answer Box (Users can check or correct what AI answered!) -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-extrabold text-slate-700">
                <i class="fa-solid fa-comment-medical text-purple-600 mr-1"></i>Explanation
              </label>
              <span id="aiStatusText" class="text-[11px] font-semibold text-slate-400">Ready</span>
            </div>
            <textarea id="verifiedAiAdvice" rows="6" aria-label="Document explanation" placeholder="Select “Explain this document” to begin." class="w-full border-2 border-purple-200 rounded-xl p-3.5 text-xs bg-purple-50/20 focus:bg-white focus:border-purple-500 outline-none leading-relaxed"></textarea>
          </div>

          <!-- Interactive Action Checklist Builder -->
          <div class="bg-emerald-50/50 dark-subcard border border-emerald-200 rounded-xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 class="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <i class="fa-solid fa-list-check text-emerald-600"></i>
                  <span>My checklist</span>
                </h3>
                <p class="text-[11px] text-slate-500">Tick each task when it is done.</p>
              </div>
              <div class="flex gap-1.5">
                <input type="text" id="newTaskInput" aria-label="New task" placeholder="Add a task" class="border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none" />
                <button type="button" id="addTaskBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-extrabold">Add</button>
              </div>
            </div>
            <div id="checklistContainer" class="space-y-2 text-xs"></div>
          </div>

          <!-- Step 3 Footer Navigation & Save to Vault -->
          <div class="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onclick="WizardModule.goToStep(2)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Back</span>
            </button>

            <div class="flex flex-wrap items-center gap-2.5">
              <button type="button" id="previewSlipBtn" class="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition">
                <i class="fa-solid fa-print"></i>
                <span>Print summary</span>
              </button>

              <button type="button" id="saveRecordBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-md flex items-center gap-2 transition">
                <i class="fa-solid fa-box-archive"></i>
                <span>Save record</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  </main>

  <!-- =========================================================
       MODULE 2: DEDICATED DIGITAL BARANGAY VAULT (ORGANIZE VIEW)
       ========================================================= -->
  <main id="module-vault" class="app-module hidden max-w-7xl mx-auto w-full px-4 py-6 flex-1 space-y-5">
    
    <!-- Vault Header & KPI Row -->
    <div class="bg-white dark-card rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 tabindex="-1" class="text-xl font-extrabold text-slate-800 mt-1">Saved records</h2>
        <p class="text-xs text-slate-500">Search or open a record.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button type="button" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1);" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition">
          <i class="fa-solid fa-plus"></i> Add document
        </button>
        <button type="button" id="exportCsvBtn" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition">
          <i class="fa-solid fa-file-csv"></i> Export
        </button>
      </div>
    </div>

    <!-- Vault KPI Summary Bar -->
    <details class="document-details">
      <summary>Vault summary</summary>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p class="text-xs text-slate-500 font-medium">Total Saved Records</p>
        <p id="statTotal" class="text-2xl font-black text-slate-800 mt-0.5">0</p>
        </div>
      </details>
      <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p class="text-xs text-slate-500 font-medium">High-Priority Cases</p>
        <p id="statUrgent" class="text-2xl font-black text-rose-600 mt-0.5">0</p>
      </div>
      <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p class="text-xs text-slate-500 font-medium">Human Verification Rate</p>
        <p class="text-2xl font-black text-emerald-600 mt-0.5">100%</p>
      </div>
      <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p class="text-xs text-slate-500 font-medium">Last Session Edits</p>
        <p id="statEdits" class="text-lg font-black text-amber-600 mt-1">0 chars fixed</p>
      </div>
    </div>

    <!-- Search & Category Filter Bar -->
    <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div class="relative flex-1 min-w-[240px]">
        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
        <input type="text" id="vaultSearch" aria-label="Search saved records" placeholder="Search by name or number" class="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select id="vaultFilter" aria-label="Filter by document type" class="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none">
          <option value="ALL">All Document Categories</option>
          <option value="Forms (DAF-AC Relief Intake)">Forms (DAF-AC)</option>
          <option value="Notices (LGU / Barangay Advisory)">Notices (LGU Advisory)</option>
          <option value="Bills (Utility / Disconnection Notice)">Bills (Utility / Rent)</option>
          <option value="Receipts (Pharmacy / Relief Supply)">Receipts (Pharmacy / OR)</option>
          <option value="Records (Medical Rx / Senior ID)">Records (Medical / ID)</option>
        </select>

        <select id="vaultPriorityFilter" aria-label="Filter by priority" class="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none">
          <option value="ALL">All Priority Levels</option>
          <option value="High Priority">High Priority</option>
          <option value="Action Required">Action Required</option>
          <option value="Standard Record">Standard Record</option>
        </select>
      </div>
    </div>

    <!-- Responsive Vault Grid -->
    <div id="vaultList" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
  </main>

  <main id="module-impact" class="app-module hidden max-w-7xl mx-auto w-full px-4 py-6 flex-1">
    <section class="community-help-card bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 tabindex="-1" data-i18n="communityHelpTitle">Where to get help</h2>
      <p data-i18n="communityHelpIntro">Choose the service that matches your need.</p>
      <div class="help-service-grid">
        <article class="help-service-card">
          <i class="fa-solid fa-house-medical" aria-hidden="true"></i>
          <div>
            <h3 data-i18n="communityHealthDesk">Barangay Palatiw Health & DRRMO Desk</h3>
            <p data-i18n="communityHealthHelp">Health needs, relief claims, and calamity certificates.</p>
          </div>
        </article>
        <article class="help-service-card">
          <i class="fa-solid fa-hands-holding-child" aria-hidden="true"></i>
          <div>
            <h3 data-i18n="communitySeniorDesk">Pasig CSWDO, OSCA, or Malasakit</h3>
            <p data-i18n="communitySeniorHelp">Senior ID replacement and medical assistance.</p>
          </div>
        </article>
      </div>
    </section>
  </main>

  <!-- CAMERA CAPTURE MODAL -->
  <div id="cameraModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cameraModalTitle">
    <div class="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
      <div class="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
        <div>
          <h3 id="cameraModalTitle" class="text-lg font-black">Take a document photo</h3>
          <p class="text-xs text-slate-500 mt-1">Fit the whole page in the frame. Take a photo.</p>
        </div>
        <button type="button" id="closeCameraModal" class="text-slate-400 hover:text-slate-700 text-lg font-bold" aria-label="Close camera">&times;</button>
      </div>

      <p id="cameraStatus" class="text-xs text-slate-600 mb-3" role="status">Starting camera…</p>
      <video id="cameraVideo" class="w-full max-h-[60vh] bg-slate-950 rounded-xl object-contain" autoplay muted playsinline></video>
      <canvas id="cameraCanvas" class="hidden w-full max-h-[60vh] bg-slate-950 rounded-xl object-contain"></canvas>

      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" id="retakePhotoBtn" class="hidden bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">Retake</button>
        <button type="button" id="capturePhotoBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2" disabled>
          <i class="fa-solid fa-camera"></i> Capture photo
        </button>
        <button type="button" id="usePhotoBtn" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <i class="fa-solid fa-check"></i> Use this photo
        </button>
      </div>
    </div>
  </main>

  <!-- PRINTABLE BARANGAY ACTION SLIP MODAL -->
  <div id="slipModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 hidden items-center justify-center p-4">
    <div class="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
      <div class="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Official Verified Record Slip</span>
          <h3 class="text-lg font-black mt-1">BARANGAY PALATIW DRRMO • SAGIPREKORD</h3>
          <p class="text-xs text-slate-500">Pasig City • Human-Verified AI Document & Action Checklist</p>
        </div>
        <button type="button" id="closeSlipModal" class="text-slate-400 hover:text-slate-700 text-lg font-bold">&times;</button>
      </div>

      <div id="slipModalBody" class="space-y-3 text-xs"></div>

      <div class="mt-5 pt-3 border-t border-slate-200 flex justify-end gap-2">
        <button type="button" onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
          <i class="fa-solid fa-print"></i> Print / Save PDF
        </button>
        <button type="button" id="closeSlipBtn2" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs">
          Close
        </button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
  <script src="app-init.js"></script>
</body>
</html>