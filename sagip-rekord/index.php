<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
startAuthSession();
$authUsersFile = __DIR__ . '/users.json';
ensureDemoAccounts($authUsersFile);
if (!refreshSessionUser($authUsersFile)) {
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
      <span id="engineBadge" class="engine-status"><span class="status-dot"></span> Secure workspace</span>
      <div class="language-switch" role="group" aria-label="Choose language">
        <button type="button" class="language-option is-selected" data-language="en" aria-pressed="true">ENG</button>
        <button type="button" class="language-option" data-language="tl" aria-pressed="false">TAG</button>
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
      <button type="button" class="sidebar-link is-active" data-module="dashboard" aria-label="Overview" onclick="NavigationModule.switchModule('dashboard')">
        <i class="fa-solid fa-house"></i><span data-i18n="overview">Overview</span>
      </button>
      <button type="button" class="sidebar-link" data-module="wizard" aria-label="Document wizard" onclick="NavigationModule.switchModule('wizard')">
        <i class="fa-solid fa-wand-magic-sparkles"></i><span data-i18n="documentWizard">Document wizard</span>
      </button>
      <button type="button" class="sidebar-link" data-module="vault" aria-label="Records vault" onclick="NavigationModule.switchModule('vault')">
        <i class="fa-solid fa-box-archive"></i><span id="navVaultLabel">Records vault</span><span id="navVaultCount" class="sidebar-count">0</span>
      </button>
      <button type="button" class="sidebar-link" data-module="impact" aria-label="Community hub" onclick="NavigationModule.switchModule('impact')">
        <i class="fa-solid fa-handshake-angle"></i><span data-i18n="communityHub">Community hub</span>
      </button>
      <button type="button" class="sidebar-link" data-module="admin" aria-label="Administration" onclick="NavigationModule.switchModule('admin')">
        <i class="fa-solid fa-user-shield"></i><span>Administration</span>
      </button>
    </nav>
    <div class="sidebar-help">
      <span class="help-icon"><i class="fa-regular fa-circle-question"></i></span>
      <strong data-i18n="needHelp">Need a hand?</strong>
      <p data-i18n="helpCopy">Your community records are organized and ready to use.</p>
      <button type="button" onclick="NavigationModule.switchModule('impact')" data-i18n="learnMore">Learn more <i class="fa-solid fa-arrow-right"></i></button>
    </div>
    <div class="sidebar-profile">
      <span class="profile-avatar" id="sessionAvatar">U</span>
      <span><strong id="sessionDisplayName">SagipRekord User</strong><small id="sessionRole">Resident</small></span>
    </div>
  </aside>

  <main id="module-dashboard" class="app-module dashboard-module">
    <section class="dashboard-welcome">
      <div>
        <p class="eyebrow"><span class="eyebrow-dot"></span><span data-i18n="welcomeEyebrow">YOUR COMMUNITY WORKSPACE</span></p>
        <h1><span id="welcomeTitle" data-i18n="welcomeTitle">Good morning, Palatiw.</span><br><span class="heading-muted" data-i18n="welcomeSubtitle">Let’s keep what matters within reach.</span></h1>
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

    <section class="stats-grid" aria-label="Workspace statistics">
      <article class="stat-card"><span class="stat-icon"><i class="fa-regular fa-folder-open"></i></span><p data-i18n="savedRecords">Saved records</p><strong id="dashboardRecordCount">0</strong><small data-i18n="savedRecordsHint">In your community vault</small></article>
      <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-shield-heart"></i></span><p data-i18n="verifiedRecords">Verified records</p><strong id="dashboardVerifiedCount">0</strong><small data-i18n="verifiedRecordsHint">Reviewed with care</small></article>
      <article class="stat-card"><span class="stat-icon accent-icon"><i class="fa-solid fa-list-check"></i></span><p data-i18n="actionSteps">Action steps</p><strong id="dashboardActionCount">0</strong><small data-i18n="actionStepsHint">Across saved checklists</small></article>
      <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-heart"></i></span><p data-i18n="communityFirst">Community first</p><strong>24/7</strong><small data-i18n="communityFirstHint">Important info, always close</small></article>
    </section>

    <section class="section-heading">
      <div><p class="eyebrow" data-i18n="simpleTools">SIMPLE TOOLS, REAL IMPACT</p><h2 data-i18n="toolsTitle">Everything you need to move forward.</h2></div>
      <button type="button" class="text-link" onclick="NavigationModule.switchModule('impact')" data-i18n="exploreHub">Explore community hub <i class="fa-solid fa-arrow-right"></i></button>
    </section>
    <section class="feature-grid">
      <article class="feature-card"><span class="feature-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span><span class="feature-step">01</span><h3 data-i18n="featureScanTitle">Make paper easier</h3><p data-i18n="featureScanCopy">Turn forms, notices, and receipts into clear, searchable text with document scanning.</p><button type="button" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1)" data-i18n="scanDocument">Scan a document <i class="fa-solid fa-arrow-right"></i></button></article>
      <article class="feature-card"><span class="feature-icon lavender-icon"><i class="fa-solid fa-clipboard-check"></i></span><span class="feature-step">02</span><h3 data-i18n="featureVerifyTitle">Keep people in the loop</h3><p data-i18n="featureVerifyCopy">Review extracted details and make corrections before anything is saved.</p><button type="button" onclick="NavigationModule.switchModule('wizard')" data-i18n="reviewDetails">Review details <i class="fa-solid fa-arrow-right"></i></button></article>
      <article class="feature-card"><span class="feature-icon"><i class="fa-solid fa-box-archive"></i></span><span class="feature-step">03</span><h3 data-i18n="featureOrganizeTitle">Find it when it counts</h3><p data-i18n="featureOrganizeCopy">Keep verified records, helpful guidance, and next steps together in one vault.</p><button type="button" onclick="NavigationModule.switchModule('vault')" data-i18n="openVault">Open your vault <i class="fa-solid fa-arrow-right"></i></button></article>
    </section>

    <section class="dashboard-cta">
      <div class="cta-orb" aria-hidden="true"><i class="fa-solid fa-file-shield"></i></div>
      <div><p class="eyebrow" data-i18n="ctaEyebrow">A LITTLE MORE PEACE OF MIND</p><h2 data-i18n="ctaTitle">Start with one important document.</h2><p data-i18n="ctaCopy">Your next helpful step is just a scan away.</p></div>
      <button type="button" class="secondary-button" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1)"><span data-i18n="getStarted">Get started</span><i class="fa-solid fa-arrow-right"></i></button>
    </section>
    <footer class="app-footer"><span>© 2026 SagipRekord</span><span data-i18n="footerNote">Built for stronger, more prepared communities.</span><button type="button" onclick="NavigationModule.switchModule('impact')" data-i18n="aboutUs">About us</button></footer>
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
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Step 1 • Understand</span>
              <span id="step1Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Scan Paper (Lumen OCR)</p>
            <p class="text-[11px] text-slate-500">Upload or pick a sample document</p>
          </div>
        </button>

        <!-- Step 2 Trigger -->
        <button type="button" onclick="WizardModule.goToStep(2)" id="stepperBtn-2" class="stepper-node flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 text-left transition">
          <div class="step-circle w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
            2
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Step 2 • Bonus Feature</span>
              <span id="step2Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Check or Correct Data</p>
            <p class="text-[11px] text-slate-500">Verify & fix OCR fields before AI</p>
          </div>
        </button>

        <!-- Step 3 Trigger -->
        <button type="button" onclick="WizardModule.goToStep(3)" id="stepperBtn-3" class="stepper-node flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 text-left transition">
          <div class="step-circle w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
            3
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Step 3 • Act & Organize</span>
              <span id="step3Check" class="hidden text-emerald-600 text-xs"><i class="fa-solid fa-circle-check"></i></span>
            </div>
            <p class="text-sm font-extrabold text-slate-800">Lumen AI Chat & Action Plan</p>
            <p class="text-[11px] text-slate-500">Taglish guide, checklist & save</p>
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
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Active Document Context</span>
            <h3 class="text-sm font-extrabold text-slate-800">Paper Preview & Status</h3>
          </div>
          <button type="button" id="clearFormBtn" class="text-xs text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 transition">
            <i class="fa-solid fa-rotate-left"></i> Reset
          </button>
        </div>

        <!-- Document Visual Preview Box -->
        <div id="previewBox" class="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-4 min-h-[160px] text-center overflow-hidden">
          <i class="fa-regular fa-file-lines text-3xl text-slate-300 mb-2"></i>
          <p class="text-xs font-bold text-slate-500">No Document Loaded Yet</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Upload a file or pick a Demo Paper in Step 1</p>
        </div>

        <!-- Live Metadata Summary Pill List -->
        <div class="bg-slate-50 dark-subcard rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Category:</span>
            <span id="contextCategory" class="font-bold text-indigo-700 text-right">Not selected</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Name / Resident:</span>
            <span id="contextResident" class="font-bold text-slate-800 text-right">—</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Ref / Stub No.:</span>
            <span id="contextRef" class="font-mono font-bold text-slate-700 text-right">—</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Human Verification:</span>
            <span id="diffCounterBadge" class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
              Pending Scan
            </span>
          </div>
        </div>

        <!-- Quick Demo Switcher (Always Accessible) -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick-Load Demo Papers</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" onclick="WizardModule.loadPreset('form')" class="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 py-2 px-2.5 rounded-lg font-semibold text-left flex items-center gap-1.5 transition">
              <i class="fa-regular fa-id-card text-indigo-600"></i> 1. Relief Form
            </button>
            <button type="button" onclick="WizardModule.loadPreset('notice')" class="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 py-2 px-2.5 rounded-lg font-semibold text-left flex items-center gap-1.5 transition">
              <i class="fa-solid fa-bullhorn text-amber-600"></i> 2. LGU Notice
            </button>
            <button type="button" onclick="WizardModule.loadPreset('bill')" class="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 py-2 px-2.5 rounded-lg font-semibold text-left flex items-center gap-1.5 transition">
              <i class="fa-solid fa-bolt text-sky-600"></i> 3. Meralco Bill
            </button>
            <button type="button" onclick="WizardModule.loadPreset('receipt')" class="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 py-2 px-2.5 rounded-lg font-semibold text-left flex items-center gap-1.5 transition">
              <i class="fa-solid fa-receipt text-emerald-600"></i> 4. Med Receipt
            </button>
          </div>
        </div>
      </aside>

      <!-- RIGHT 8 COLUMNS: DEDICATED STEP PANELS (ONLY 1 SHOWN AT A TIME) -->
      <div class="lg:col-span-8">

        <!-- =====================================================
             WIZARD STEP 1 PANEL: UNDERSTAND (LUMEN OCR UPLOAD)
             ===================================================== -->
        <section id="wizardStep-1" class="wizard-panel bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span class="bg-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 1 OF 3 • UNDERSTAND</span>
              <h2 class="text-lg font-extrabold text-slate-800 mt-1">Upload or Select a Paper Document to Read</h2>
              <p class="text-xs text-slate-500">Lumen OCR extracts text from forms, receipts, bills, notices, and household records via our backend proxy.</p>
            </div>
          </div>

          <!-- Upload Form -->
          <form id="ocrForm" class="space-y-4">
            <label id="dropZone" class="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 rounded-2xl p-8 cursor-pointer transition text-center">
              <div class="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-2xl mb-3">
                <i class="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <span id="fileNameDisplay" class="text-base font-extrabold text-slate-700">Drag & Drop Image or PDF Document Here</span>
              <span class="text-xs text-slate-500 mt-1">or click to browse from your device (Supports JPG, PNG, PDF)</span>
              <input type="file" id="documentInput" name="document" accept="image/*,.pdf" class="hidden" />
            </label>

            <button type="submit" id="ocrBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Scan Document with Lumen OCR & Continue to Step 2</span>
              <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </form>

          <!-- Or Choose a Pre-Scanned Demo Paper Card -->
          <div class="pt-3 border-t border-slate-200">
            <p class="text-xs font-extrabold text-slate-600 mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-bolt text-amber-500"></i>
              <span>Testing or Live Pitching? Click any sample Filipino document below to jump straight to Step 2:</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onclick="WizardModule.loadPreset('form')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-indigo-700">1. DAF-AC Evacuation Form</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
                <p class="text-[11px] text-slate-500">Handwritten barangay relief card with an intentional OCR typo (<code class="bg-amber-100 text-amber-900 px-1 rounded">Mend0za</code>) to showcase human correction.</p>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('notice')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-amber-700">2. Barangay Relief & ID Advisory</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
                <p class="text-[11px] text-slate-500">Official LGU notice on claiming DSWD cash aid and replacing flood-damaged IDs.</p>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('bill')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-sky-700">3. Meralco Disconnection Bill</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
                <p class="text-[11px] text-slate-500">Monthly electric billing statement with calamity staggered payment rules.</p>
              </button>

              <button type="button" onclick="WizardModule.loadPreset('receipt')" class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition group">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-extrabold text-emerald-700">4. Pharmacy Medicine Receipt</span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-600"></i>
                </div>
                <p class="text-[11px] text-slate-500">Senior citizen maintenance medicine OR for DSWD AICS medical reimbursement.</p>
              </button>
            </div>
          </div>
        </section>

        <!-- =====================================================
             WIZARD STEP 2 PANEL: CHECK & CORRECT (HUMAN VERIFY)
             ===================================================== -->
        <section id="wizardStep-2" class="wizard-panel hidden bg-white dark-card rounded-2xl border-2 border-amber-400 shadow-sm p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span class="bg-amber-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 2 OF 3 • HUMAN-IN-THE-LOOP BONUS</span>
              <h2 class="text-lg font-extrabold text-slate-800 mt-1">Check or Correct What Lumen OCR Read</h2>
              <p class="text-xs text-slate-500">Inspect the extracted fields and raw text below. Fix any misread characters before sending to Lumen AI Chat.</p>
            </div>
            <button type="button" id="toggleDiffBtn" class="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
              <i class="fa-solid fa-columns"></i>
              <span>Toggle Side-by-Side Original OCR</span>
            </button>
          </div>

          <input type="hidden" id="recordId" value="" />
          <input type="hidden" id="originalOcrStore" value="" />

          <!--Structured Metadata Editor Grid -->
          <div class="bg-amber-50/50 dark-subcard border border-amber-200/80 rounded-xl p-4">
            <p class="text-xs font-extrabold text-amber-900 mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-sliders"></i>
              <span>1. Verify Structured Key Fields</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Document Category</label>
                <select id="docType" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-semibold outline-none">
                  <option value="Forms (DAF-AC Relief Intake)">Forms (DAF-AC / Gov Form)</option>
                  <option value="Notices (LGU / Barangay Advisory)">Notices (LGU / Barangay Advisory)</option>
                  <option value="Bills (Utility / Disconnection Notice)">Bills (Meralco / Water / Rent)</option>
                  <option value="Receipts (Pharmacy / Relief Supply)">Receipts (Pharmacy / Store OR)</option>
                  <option value="Records (Medical Rx / Senior ID)">Records (Medical Rx / ID Record)</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Resident / Biller / Payee Name</label>
                <input type="text" id="residentName" placeholder="e.g., Mendoza, Teresita L." class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>

              <div id="residentAccountLink" class="worker-admin-only">
                <label class="block text-[11px] font-bold text-slate-600 mb-1" for="residentAccountEmail">Link to resident account (optional)</label>
                <input type="email" id="residentAccountEmail" placeholder="resident@example.org" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Control / OR / Account No.</label>
                <input type="text" id="referenceNo" placeholder="e.g., PLTW-2026-0915" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-mono outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Amount / Fee / Deadline</label>
                <input type="text" id="amountOrDate" placeholder="e.g., PHP 5,000.00 • Nov 16" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Address / Issuing Office</label>
                <input type="text" id="purokAddress" placeholder="e.g., Purok 4, Brgy. Palatiw" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs outline-none" />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Urgency / Priority Level</label>
                <select id="priorityLevel" class="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs font-semibold outline-none">
                  <option value="High Priority">High Priority (Senior / Meds)</option>
                  <option value="Action Required">Action Required (Deadline / Bill)</option>
                  <option value="Standard Record">Standard Record (Archival)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Side-by-Side or Single Full-Text Editor -->
          <div id="ocrComparisonGrid" class="grid grid-cols-1 gap-4">
            <!-- Left Half: Raw Unedited OCR (Shown when Side-by-Side is active) -->
            <div id="diffDrawer" class="hidden bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-700 flex flex-col">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold text-amber-400"><i class="fa-solid fa-robot mr-1"></i>Raw Unedited Lumen OCR</span>
                <button type="button" id="restoreOriginalBtn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded font-semibold">
                  Reset to Raw
                </button>
              </div>
              <pre id="rawOcrComparison" class="text-xs font-mono whitespace-pre-wrap text-slate-300 flex-1 overflow-y-auto max-h-52 leading-relaxed">No scan loaded yet.</pre>
            </div>

            <!-- Right Half: Editable Human-Verified Text -->
            <div class="flex flex-col">
              <div class="flex justify-between items-center mb-1.5">
                <label class="text-xs font-extrabold text-slate-700">
                  <i class="fa-solid fa-user-pen text-amber-600 mr-1"></i>2. Editable Verified Document Text (Click inside to fix typos)
                </label>
                <span id="editIndicator" class="text-[11px] font-semibold text-slate-400">Ready for review</span>
              </div>
              <textarea id="verifiedOcrText" rows="7" placeholder="Extracted text appears here. Edit any word or number..." class="w-full border-2 border-amber-300 rounded-xl p-3.5 text-xs font-mono bg-white focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"></textarea>
            </div>
          </div>

          <!-- Audit Note -->
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Human Verification Audit Note</label>
            <input type="text" id="correctionNote" placeholder="e.g., Fixed OCR typo in surname (Mend0za -> Mendoza) and verified stub #" class="w-full border border-slate-300 bg-slate-50 rounded-xl px-3.5 py-2 text-xs outline-none focus:bg-white" />
          </div>

          <!-- Step 2 Footer Navigation -->
          <div class="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onclick="WizardModule.goToStep(1)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Back to Step 1 (Upload)</span>
            </button>

            <button type="button" id="proceedToStep3Btn" class="bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-md flex items-center gap-2 transition">
              <i class="fa-solid fa-check-double"></i>
              <span>Confirm Verified Text & Analyze with Lumen AI Chat (Step 3)</span>
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
              <span class="bg-purple-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">STEP 3 OF 3 • ACT ON & ORGANIZE</span>
              <h2 class="text-lg font-extrabold text-slate-800 mt-1">Lumen AI Chat Explainer & Action Checklist</h2>
              <p class="text-xs text-slate-500">Translate complex terms into plain Taglish/Tagalog, review or edit the AI's answer, and save to the Barangay Vault.</p>
            </div>

            <!-- Dialect Selector -->
            <div class="flex items-center gap-1.5">
              <label class="text-xs font-bold text-slate-500">Output Language:</label>
              <select id="chatLanguage" class="border border-purple-300 bg-purple-50 text-purple-900 rounded-xl px-3 py-1.5 text-xs font-extrabold outline-none">
                <option value="Taglish (Simple Filipino-English)">Taglish</option>
                <option value="Simple Tagalog">Pure Tagalog</option>
                <option value="Simple Plain English">Plain English</option>
              </select>
            </div>
          </div>

          <!-- One-Click AI Action Buttons -->
          <div class="space-y-2">
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Analysis Modes (Lumen AI Chat)</label>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="explainBtn" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Full Summary & Action Steps
              </button>
              <button type="button" class="prompt-pill text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-2 rounded-xl font-semibold transition" data-prompt="Anu-ano ang mga kailangang dalhin na requirements, magkano ang babayaran o matatanggap, at kailan ang deadline?">
                <i class="fa-solid fa-list-check text-indigo-600"></i> List Requirements & Deadlines
              </button>
              <button type="button" class="prompt-pill text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-2 rounded-xl font-semibold transition" data-prompt="Paano makakakuha ng diskwento, installment plan, o libreng assistance sa Barangay Palatiw / DSWD / Malasakit Center base sa dokumentong ito?">
                <i class="fa-solid fa-handshake-angle text-indigo-600"></i> How to Claim Aid / Discount
              </button>
            </div>
          </div>

          <!-- Custom Question Input Bar -->
          <div class="flex gap-2">
            <input type="text" id="customQuestion" placeholder="Ask Lumen AI Chat a specific question (e.g., Paano kumuha ng Affidavit of Loss sa Barangay?)" class="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 outline-none" />
            <button type="button" id="askCustomBtn" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition">
              Ask AI
            </button>
          </div>

          <!-- Editable AI Answer Box (Users can check or correct what AI answered!) -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-extrabold text-slate-700">
                <i class="fa-solid fa-comment-medical text-purple-600 mr-1"></i>Lumen AI Chat Response (Editable — Check or refine the AI's explanation)
              </label>
              <span id="aiStatusText" class="text-[11px] font-semibold text-slate-400">Ready</span>
            </div>
            <textarea id="verifiedAiAdvice" rows="6" placeholder="Lumen AI Chat explanation will appear here..." class="w-full border-2 border-purple-200 rounded-xl p-3.5 text-xs bg-purple-50/20 focus:bg-white focus:border-purple-500 outline-none leading-relaxed"></textarea>
          </div>

          <!-- Interactive Action Checklist Builder -->
          <div class="bg-emerald-50/50 dark-subcard border border-emerald-200 rounded-xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 class="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <i class="fa-solid fa-list-check text-emerald-600"></i>
                  <span>Interactive Action Checklist (Act On Information)</span>
                </h3>
                <p class="text-[11px] text-slate-500">Auto-extracted from Lumen AI Chat. Check off completed requirements or add custom tasks.</p>
              </div>
              <div class="flex gap-1.5">
                <input type="text" id="newTaskInput" placeholder="Add custom action step..." class="border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none" />
                <button type="button" id="addTaskBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-extrabold">+ Add</button>
              </div>
            </div>
            <div id="checklistContainer" class="space-y-2 text-xs"></div>
          </div>

          <!-- Step 3 Footer Navigation & Save to Vault -->
          <div class="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onclick="WizardModule.goToStep(2)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Back to Step 2 (Edit OCR)</span>
            </button>

            <div class="flex flex-wrap items-center gap-2.5">
              <button type="button" id="previewSlipBtn" class="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition">
                <i class="fa-solid fa-print"></i>
                <span>Print Action Slip</span>
              </button>

              <button type="button" id="saveRecordBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-md flex items-center gap-2 transition">
                <i class="fa-solid fa-box-archive"></i>
                <span>Save Verified Record to Barangay Vault</span>
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
        <span class="bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md">ORGANIZE MODULE • DIGITAL VAULT</span>
        <h2 class="text-xl font-extrabold text-slate-800 mt-1">Barangay Palatiw Verified Records Ledger</h2>
        <p class="text-xs text-slate-500">All human-verified forms, receipts, bills, notices, and relief records stored in one searchable vault.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button type="button" onclick="NavigationModule.switchModule('wizard'); WizardModule.goToStep(1);" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition">
          <i class="fa-solid fa-plus"></i> Scan New Document
        </button>
        <button type="button" id="exportCsvBtn" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition">
          <i class="fa-solid fa-file-csv"></i> Export Vault to CSV
        </button>
      </div>
    </div>

    <!-- Vault KPI Summary Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white dark-card rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p class="text-xs text-slate-500 font-medium">Total Saved Records</p>
        <p id="statTotal" class="text-2xl font-black text-slate-800 mt-0.5">0</p>
      </div>
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
        <input type="text" id="vaultSearch" placeholder="Search by resident name, control/stub number, address, or document text..." class="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select id="vaultFilter" class="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none">
          <option value="ALL">All Document Categories</option>
          <option value="Forms (DAF-AC Relief Intake)">Forms (DAF-AC)</option>
          <option value="Notices (LGU / Barangay Advisory)">Notices (LGU Advisory)</option>
          <option value="Bills (Utility / Disconnection Notice)">Bills (Utility / Rent)</option>
          <option value="Receipts (Pharmacy / Relief Supply)">Receipts (Pharmacy / OR)</option>
          <option value="Records (Medical Rx / Senior ID)">Records (Medical / ID)</option>
        </select>

        <select id="vaultPriorityFilter" class="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none">
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

  <!-- =========================================================
       MODULE 3: PARTNER & UN SDG IMPACT HUB
       ========================================================= -->
  <main id="module-impact" class="app-module hidden max-w-7xl mx-auto w-full px-4 py-6 flex-1 space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Partner Spotlight: Barangay Palatiw DRRMO -->
      <section class="lg:col-span-7 bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <span class="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full">
          <i class="fa-solid fa-building-shield mr-1"></i>Official Target Partner
        </span>
        <h2 class="text-xl font-extrabold text-slate-800">Barangay Palatiw DRRMO & Welfare Desk (Pasig City)</h2>
        <p class="text-xs text-slate-600 leading-relaxed">
          During typhoons and flooding along low-lying areas in Barangay Palatiw, social workers and residents face two bottlenecks: encoding hundreds of handwritten <strong>DAF-AC intake cards</strong> and helping families understand complex <strong>LGU relief notices, hospital bills, and lost-ID requirements</strong>.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div class="p-4 rounded-xl bg-slate-50 dark-subcard border border-slate-200">
            <h3 class="text-xs font-extrabold text-indigo-700 mb-1">For Barangay Staff & Volunteers</h3>
            <p class="text-[11px] text-slate-600">Cuts intake encoding time from 4 minutes per paper form to under 15 seconds with Lumen OCR + Human-in-the-Loop verification.</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 dark-subcard border border-slate-200">
            <h3 class="text-xs font-extrabold text-purple-700 mb-1">For Residents & Senior Citizens</h3>
            <p class="text-[11px] text-slate-600">Translates English legal/medical notices and utility bills into clear Taglish checklists with printable Barangay Action Slips.</p>
          </div>
        </div>

        <!-- Local Pasig / Palatiw Action Referral Directory -->
        <div class="pt-3 border-t border-slate-200">
          <h3 class="text-xs font-extrabold text-slate-700 mb-2">Integrated Barangay Palatiw & Pasig Referral Desks</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div class="p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <i class="fa-solid fa-house-medical text-rose-600 text-lg"></i>
              <div>
                <p class="font-bold text-slate-800">Brgy. Palatiw Health & DRRMO Desk</p>
                <p class="text-[11px] text-slate-500">Maintenance Meds, DAF-AC Stubs & Calamity Certs</p>
              </div>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <i class="fa-solid fa-hands-holding-child text-indigo-600 text-lg"></i>
              <div>
                <p class="font-bold text-slate-800">Pasig CSWDO / OSCA / Malasakit</p>
                <p class="text-[11px] text-slate-500">Senior ID Replacement & AICS Medical Reimbursement</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- UN SDG Alignment & Architecture Card -->
      <section class="lg:col-span-5 bg-white dark-card rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <span class="bg-sky-100 text-sky-800 text-xs font-extrabold px-3 py-1 rounded-full">
          <i class="fa-solid fa-earth-asia mr-1"></i>UN Sustainable Development Goals
        </span>
        <h2 class="text-lg font-extrabold text-slate-800">SDG Alignment & System Architecture</h2>

        <div class="space-y-3">
          <div class="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
            <p class="text-xs font-extrabold text-amber-900">SDG 11: Sustainable Cities & Communities</p>
            <p class="text-[11px] text-amber-800 mt-0.5">Target 11.5 — Protects vulnerable households by safeguarding vital welfare records and speeding up post-disaster relief distribution.</p>
          </div>

          <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <p class="text-xs font-extrabold text-emerald-900">SDG 13: Climate Action</p>
            <p class="text-[11px] text-emerald-800 mt-0.5">Target 13.1 — Strengthens community-level adaptive capacity to climate-related hazards and typhoon flooding in Metro Manila.</p>
          </div>

          <div class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <p class="text-xs font-extrabold text-indigo-900">Secure Backend Proxy Architecture</p>
            <p class="text-[11px] text-indigo-800 mt-0.5">All <code class="font-mono">lumen-api-key</code> and <code class="font-mono">lumen-api-secret</code> headers are injected server-side via <code class="font-mono">api.php</code> using <code class="font-mono">.env</code>—never exposed in browser code.</p>
          </div>
        </div>
      </section>

    </div>
  </main>

  <main id="module-admin" class="app-module hidden admin-module">
    <section class="admin-heading">
      <p class="eyebrow"><span class="eyebrow-dot"></span>ADMINISTRATION</p>
      <h1>Accounts &amp; system activity</h1>
      <p>Manage workspace access and review recent activity.</p>
    </section>
    <div class="admin-grid">
      <section class="admin-card">
        <div class="admin-card-heading">
          <div><h2 id="adminFormTitle">Create account</h2><p>Passwords are stored as hashes on the server.</p></div>
          <button type="button" class="secondary-button admin-reset-button" id="adminResetUser">New account</button>
        </div>
        <form id="adminUserForm" class="admin-user-form">
          <input type="hidden" name="id" id="adminUserId" />
          <label>Full name<input name="name" id="adminUserName" type="text" maxlength="120" required /></label>
          <label>Email<input name="email" id="adminUserEmail" type="email" maxlength="254" required /></label>
          <label>Role
            <select name="role" id="adminUserRole" required>
              <option value="resident">Resident</option>
              <option value="worker">Barangay / Health Worker</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label>Temporary password <span id="adminPasswordHint">(required, at least 8 characters)</span>
            <input name="password" id="adminUserPassword" type="password" minlength="8" autocomplete="new-password" required />
          </label>
          <label class="admin-active-option"><input id="adminUserActive" type="checkbox" checked /> Account active</label>
          <p id="adminUserMessage" class="auth-message" aria-live="polite"></p>
          <button type="submit" class="primary-button">Save account</button>
        </form>
      </section>
      <section class="admin-card">
        <div class="admin-card-heading"><div><h2>Accounts</h2><p>Assign staff and administrator access intentionally.</p></div><button type="button" class="secondary-button" id="adminReloadData">Refresh</button></div>
        <div id="adminUsersList" class="admin-users-list" aria-live="polite"></div>
      </section>
      <section class="admin-card admin-audit-card">
        <div class="admin-card-heading"><div><h2>Recent activity</h2><p>Latest sign-ins and account or record changes.</p></div></div>
        <div id="adminAuditList" class="admin-audit-list" aria-live="polite"></div>
      </section>
      <section class="admin-card">
        <div class="admin-card-heading"><div><h2>System configuration</h2><p>Read-only service and storage status. Secrets are never shown.</p></div></div>
        <div id="adminSystemConfig" class="admin-config-list" aria-live="polite"></div>
      </section>
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