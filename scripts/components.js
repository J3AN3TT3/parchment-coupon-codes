/* ════════════════════════════════════════════════════════════════════
   PARCHMENT CHROME COMPONENTS
   ════════════════════════════════════════════════════════════════════
   Mount via <div data-component="..."> in markup. mountChrome() walks
   every mount point and renders the matching component.

   Theme is controlled by <html data-theme="default"|"light">. The
   underlying markup is identical across themes — CSS handles colors.

   ╔══════════════════════════ TABLE OF CONTENTS ═══════════════════════╗
   ║  PageHeader        grep "function renderPageHeader"                ║
   ║  NavTabs           grep "function renderNavTabs"                   ║
   ║  WorkflowHeader    grep "function renderWorkflowHeader"            ║
   ║  PageFooter        grep "function renderPageFooter"                ║
   ║  setTheme          grep "function setTheme"                        ║
   ║  mountChrome       grep "function mountChrome"                     ║
   ║  rerenderChrome    grep "function rerenderChrome"                  ║
   ║  Boot              grep "Boot"                                     ║
   ╚════════════════════════════════════════════════════════════════════╝

   Mount attrs reference:
     page-header-mount      data-persona-name, data-persona-org,
                            data-org-initials, data-lang
     nav-tabs-mount         data-active="<tab-id>",
                            data-tabs='[{"id":"…","label":"…","screen":"…"}]'
     workflow-header-mount  data-back-label, data-back-action|data-back-id,
                            data-cancel-label, data-cancel-action|data-cancel-id
     page-footer-mount      data-logo (override)

   Window exposures (callable from app.js or inline onclick):
     window.mountChrome
     window.rerenderChrome
     window.setTheme('default'|'light')
     window.togglePersonaMenu
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────────
     PageHeader — Tasty Organisms · PageHeader
     ────────────────────────────────────────────────────────────────
     Attrs:
       data-logo            override Parchment logo src
       data-persona-greet   e.g. "Hello," (regular weight before name)
       data-persona-name    e.g. "Morgan Lee"   (bold)
       data-persona-org     e.g. "Pioneer High School"
       data-org-initials    e.g. "PHS" — shown in the 40px logo tile
       data-org-logo        override the org logo tile image src
       data-lang            e.g. "EN" — omit to hide selector
     ──────────────────────────────────────────────────────────────── */
  function renderPageHeader(el) {
    // Always use the horizontal wordmark (white PNG). CSS inverts it for the
    // light theme — keeps both themes identical in size and proportion since
    // the source image has a different aspect than the color "stacked" lockup.
    var logo         = el.dataset.logo         || (window.tastyAssetUrl ? window.tastyAssetUrl('assets/parchment-logo-white.png') : 'assets/parchment-logo-white.png');
    var greet        = el.dataset.personaGreet || 'Hello,';
    var name         = el.dataset.personaName  || 'Morgan Lee';
    var org          = el.dataset.personaOrg   || 'Pioneer High School';
    var orgInitials  = el.dataset.orgInitials  || 'PHS';
    var orgLogoSrc   = el.dataset.orgLogo      || '';
    var lang         = el.dataset.lang;

    var langHtml = lang
      ? '<button type="button" class="parch-header__lang">' +
          '<span class="parch-header__lang-icon">' + tastyIcon('global', { size: 26 }) + '</span>' +
          '<span class="parch-header__lang-label">' + escapeHtml(lang) + '</span>' +
        '</button>'
      : '';

    var orgLogoHtml = orgLogoSrc
      ? '<div class="parch-header__org-logo"><img src="' + escapeAttr(orgLogoSrc) + '" alt=""></div>'
      : '<div class="parch-header__org-logo parch-header__org-logo--initials">' + escapeHtml(orgInitials) + '</div>';

    el.outerHTML =
      '<header class="parch-header" data-component="page-header">' +
        '<div class="parch-header__brand">' +
          '<img class="parch-header__logo" src="' + escapeAttr(logo) + '" alt="Parchment">' +
        '</div>' +
        '<div class="parch-header__right">' +
          langHtml +
          '<button type="button" class="parch-header__persona" onclick="togglePersonaMenu(event)">' +
            '<div class="parch-header__persona-detail">' +
              orgLogoHtml +
              '<div class="parch-header__persona-text">' +
                '<div>' +
                  '<span class="parch-header__persona-hello">' + escapeHtml(greet) + ' </span>' +
                  '<span class="parch-header__persona-name">' + escapeHtml(name) + '</span>' +
                '</div>' +
                '<div class="parch-header__persona-org">' + escapeHtml(org) + '</div>' +
              '</div>' +
            '</div>' +
            '<span class="parch-header__persona-caret">' + tastyIcon('caret', { size: 13 }) + '</span>' +
          '</button>' +
        '</div>' +
      '</header>';
  }


  /* ────────────────────────────────────────────────────────────────
     NavTabs — Tasty Molecules II · NavTabSet
     ────────────────────────────────────────────────────────────────
     Attrs:
       data-active   id of the active tab (one of the data-tab-id values)
       data-tabs     JSON array: [{id, label, screen}]
                     screen = screen id to showScreen() on click

     Default tabs match the counselor product nav.
     ──────────────────────────────────────────────────────────────── */
  function renderNavTabs(el) {
    var activeId = el.dataset.active || 'workspace';
    var tabs;
    try {
      tabs = el.dataset.tabs ? JSON.parse(el.dataset.tabs) : null;
    } catch (e) {
      tabs = null;
    }
    if (!tabs) {
      // Default tabs — replace in your prototype by passing data-tabs JSON.
      tabs = [
        { id: 'workspace', label: 'Workspace', screen: 'dashboard' },
        { id: 'detail',    label: 'Detail',    screen: 'detail' }
      ];
    }

    var html = '<nav class="parch-nav" data-component="nav-tabs">';
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var activeCls = t.id === activeId ? ' active' : '';
      var click = t.screen ? ' onclick="showScreen(\'' + t.screen + '\')"' : '';
      html += '<button class="nav-tab' + activeCls + '"' + click + '>' +
                escapeHtml(t.label) +
              '</button>';
    }
    html += '</nav>';
    el.outerHTML = html;
  }


  /* ────────────────────────────────────────────────────────────────
     WorkflowHeader — Tasty micro-frontend pattern
     ────────────────────────────────────────────────────────────────
     Attrs:
       data-back-label    e.g. "Back to <Origination>"
       data-back-action   inline expression for onclick (e.g. "showScreen('de')")
       data-cancel-action e.g. "openCancelModal()" — omit to hide cancel
     ──────────────────────────────────────────────────────────────── */
  function renderWorkflowHeader(el) {
    var backLabel    = el.dataset.backLabel    || 'Back';
    var backAction   = el.dataset.backAction   || '';
    var backId       = el.dataset.backId       || '';
    var cancelLabel  = el.dataset.cancelLabel  || 'Cancel';
    var cancelAction = el.dataset.cancelAction || '';
    var cancelId     = el.dataset.cancelId     || '';

    var leftHtml = '';
    if (backAction || backId) {
      var backAttrs = '';
      if (backId)     backAttrs += ' id="' + backId + '"';
      if (backAction) backAttrs += ' onclick="' + backAction + '"';
      leftHtml = '<button class="workflow-nav-btn"' + backAttrs + '>' +
                   tastyIcon('back-caret', { size: 16 }) + ' ' + escapeHtml(backLabel) +
                 '</button>';
    }

    var rightHtml = '';
    if (cancelAction || cancelId) {
      var cancelAttrs = '';
      if (cancelId)     cancelAttrs += ' id="' + cancelId + '"';
      if (cancelAction) cancelAttrs += ' onclick="' + cancelAction + '"';
      rightHtml = '<button class="workflow-nav-btn"' + cancelAttrs + '>' +
                    escapeHtml(cancelLabel) + ' ' + tastyIcon('cancel', { size: 16 }) +
                  '</button>';
    }

    el.outerHTML =
      '<div class="workflow-header" data-component="workflow-header">' +
        '<div class="workflow-header-left">'  + leftHtml  + '</div>' +
        '<div class="workflow-header-right">' + rightHtml + '</div>' +
      '</div>';
  }


  /* ────────────────────────────────────────────────────────────────
     PageFooter — Tasty Organisms · PageFooter
     ────────────────────────────────────────────────────────────────
     Attrs:
       data-logo   override logo src (defaults to white logo)
     ──────────────────────────────────────────────────────────────── */
  function renderPageFooter(el) {
    // See renderPageHeader for rationale — single source image, CSS inverts
    // for light theme so both themes render at identical size.
    var logo = el.dataset.logo || (window.tastyAssetUrl ? window.tastyAssetUrl('assets/parchment-logo-white.png') : 'assets/parchment-logo-white.png');

    el.outerHTML =
      '<footer class="parch-footer" data-component="page-footer">' +
        '<div class="parch-footer__links-left">' +
          '<a class="parch-footer__link" href="#">' +
            tastyIcon('info', { size: 16 }) +
            '<span>Support: Help Desk</span>' +
          '</a>' +
        '</div>' +
        '<img class="parch-footer__logo" src="' + escapeAttr(logo) + '" alt="Parchment">' +
        '<div class="parch-footer__links-right">' +
          '<a class="parch-footer__link" href="#">Terms Of Use</a>' +
          '<a class="parch-footer__link" href="#">Privacy Policy</a>' +
        '</div>' +
      '</footer>';
  }


  /* ────────────────────────────────────────────────────────────────
     Theme control — dev panel calls setTheme(); chrome re-renders so
     the right logo (color vs white) is mounted.
     ──────────────────────────────────────────────────────────────── */
  // Mirrors Tasty's parchment themes: default · light · white (shipped),
  // dark · contrast (isEnabled:false upstream, exposed here for fidelity).
  var VALID_THEMES = { 'default': 1, 'light': 1, 'white': 1, 'dark': 1, 'contrast': 1 };
  function setTheme(theme) {
    if (!VALID_THEMES[theme]) return;
    document.documentElement.dataset.theme = theme;
    // Logo swap handled by CSS filter on [data-theme="light"] — no chrome
    // re-render needed (which would lose bound listeners).
  }


  /* ────────────────────────────────────────────────────────────────
     Mount — walks all data-component="*-mount" nodes once
     ────────────────────────────────────────────────────────────────
     Chrome is rendered ONCE at boot. Theme switching is CSS-only.
     Persona switching uses updatePersona() to mutate text in-place
     so click handlers bound by app.js (e.g. workflow Cancel buttons)
     survive across persona swaps.
     ──────────────────────────────────────────────────────────────── */
  function mountChrome(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-component$="-mount"]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      switch (node.dataset.component) {
        case 'page-header-mount':     renderPageHeader(node); break;
        case 'nav-tabs-mount':        renderNavTabs(node); break;
        case 'workflow-header-mount': renderWorkflowHeader(node); break;
        case 'page-footer-mount':     renderPageFooter(node); break;
      }
    }
  }

  // Update persona name/org on every rendered page-header in place.
  // Used by the dev panel to switch counselor without re-mounting chrome.
  function updatePersona(attrs) {
    var name = attrs && attrs.name;
    var org  = attrs && attrs.org;
    var initials = attrs && attrs.initials;
    document.querySelectorAll('.parch-header__persona-name').forEach(function (el) {
      if (name != null) el.textContent = name;
    });
    document.querySelectorAll('.parch-header__persona-org').forEach(function (el) {
      if (org != null) el.textContent = org;
    });
    document.querySelectorAll('.parch-header__org-logo--initials').forEach(function (el) {
      if (initials != null) el.textContent = initials;
    });
  }


  /* ────────────────────────────────────────────────────────────────
     Helpers
     ──────────────────────────────────────────────────────────────── */
  function caret() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
           'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
           'stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // Stub — wire up real menu if/when needed.
  function togglePersonaMenu(e) {
    e.stopPropagation();
    /* no-op for now */
  }


  /* ────────────────────────────────────────────────────────────────
     Boot
     ──────────────────────────────────────────────────────────────── */
  // Script tag lives at end of <body>, so the DOM is parsed by the time
  // we get here regardless of readyState. Mount immediately and synchronously
  // so app.js (loaded next) can bind click handlers by ID at IIFE-time.
  mountChrome();

  // Expose for app.js to call after dynamic screen swaps if needed.
  window.mountChrome       = mountChrome;
  window.updatePersona     = updatePersona;
  window.setTheme          = setTheme;
  window.togglePersonaMenu = togglePersonaMenu;
})();
