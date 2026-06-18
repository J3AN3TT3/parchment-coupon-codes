/* ═══════════════════════════════════════════════════════════════════
   Coupon Codes Prototype — app.js
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Screen routing ──────────────────────────────────────────── */
  window.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  };

  /* ── Theme switcher (dev panel) ──────────────────────────────── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-theme]');
    if (btn && btn.classList.contains('dev-btn')) {
      document.querySelectorAll('.dev-btn[data-theme]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (typeof window.setTheme === 'function') window.setTheme(btn.dataset.theme);
      else document.documentElement.dataset.theme = btn.dataset.theme;
    }
  });

  /* ── Toast ───────────────────────────────────────────────────── */
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  window.escapeHtml = escapeHtml;

  window.showToast = function (message, context) {
    if (!context || context === 'info') context = 'config';
    var ICONS = { config:'info', success:'check', warning:'info', urgent:'warning', error:'sis-error', bold:'info' };
    var stack = document.getElementById('toast-mount');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast ' + context;
    el.setAttribute('role', 'status');
    el.innerHTML =
      tastyIcon(ICONS[context] || 'info', { size: 18 }) +
      '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
      '<button type="button" class="toast-x" aria-label="Dismiss">' + tastyIcon('cancel', { size: 16 }) + '</button>';
    function dismiss() { el.classList.add('fading'); setTimeout(function () { if (el.parentElement) el.remove(); }, 260); }
    el.querySelector('.toast-x').addEventListener('click', dismiss);
    stack.appendChild(el);
    setTimeout(dismiss, 4000);
  };


  /* ═══════════════════════════════════════════════════════════════
     DATA
  ═══════════════════════════════════════════════════════════════ */
  var COUPONS = [
    { id: 'SUMMER26',  name: 'Alumni Summer Package',    appliesTo: 'All Products',           expires: 'Jun 1, 2026',  status: 'active',   used: 0,   total: 25  },
    { id: 'SPRING26',  name: 'Alumni Spring Package',    appliesTo: 'All Products',           expires: 'May 15, 2026', status: 'active',   used: 6,   total: 25  },
    { id: 'REUNION21', name: 'Alumni Reunion',           appliesTo: 'Transcripts',            expires: 'Jan 20, 2026', status: 'redeemed', used: 6,   total: 25  },
    { id: 'FALLWVR',   name: 'Fall Session Bulk Waiver', appliesTo: 'All Products',           expires: 'Aug 20, 2025', status: 'expired',  used: 123, total: 123 },
    { id: 'CDISC25',   name: 'Counselor Discretionary',  appliesTo: 'Transcripts, Diplomas',  expires: 'Jul 13, 2025', status: 'revoked',  used: 20,  total: 25  }
  ];

  var LEARNERS = [
    { name: 'Jessica Cumberland', email: 'jessica.cumberland03@gmail.com' },
    { name: 'Matthew Adams',      email: 'mattadams@gmail.com' },
    { name: 'Jason Carter',       email: 'jasoncarter@gmail.com' },
    { name: 'Elizabeth Bailey',   email: 'elizabethbailey@gmail.com' },
    { name: 'Lawrence Baker',     email: 'lawrencebaker@gmail.com' },
    { name: 'Evelyn Harper',      email: 'evelyn.harper87@example.com' },
    { name: 'Lila Morgan',        email: 'lila.morgan42@example.com' }
  ];

  var activeFilters   = new Set(['active', 'redeemed', 'expired', 'revoked']);
  var revokeTarget   = null;
  var sendList       = [];
  var librarySelected = new Set();
  var appliesToVal   = 'all';
  var totalUsageVal  = 'limit';
  var perLearnerVal  = 'limit';
  var pendingCoupon  = null;


  /* ═══════════════════════════════════════════════════════════════
     STATUS TAG HELPERS
  ═══════════════════════════════════════════════════════════════ */
  var STATUS_CFG = {
    active:   { label: 'Active',   cls: 'is-solid is-success', icon: 'star'   },
    redeemed: { label: 'Redeemed', cls: 'is-solid is-note',    icon: 'check'  },
    expired:  { label: 'Expired',  cls: '',                    icon: 'time'   },
    revoked:  { label: 'Revoked',  cls: 'is-solid is-error',   icon: 'cancel' }
  };

  function statusTag(status) {
    var cfg = STATUS_CFG[status] || { label: status, cls: '', icon: 'info' };
    return '<span class="tasty-status-tag ' + cfg.cls + '">' +
      '<span class="tcon" data-g="' + cfg.icon + '"></span>' +
      '<span class="tasty-status-tag__label">' + cfg.label + '</span>' +
    '</span>';
  }


  /* ═══════════════════════════════════════════════════════════════
     TABLE RENDER
  ═══════════════════════════════════════════════════════════════ */
  /* ── FilterTag toggle ────────────────────────────────────────── */
  window.toggleFilter = function (status, btn) {
    if (activeFilters.has(status)) {
      activeFilters.delete(status);
      if (btn) { btn.classList.remove('is-active'); btn.setAttribute('aria-pressed', 'false'); }
    } else {
      activeFilters.add(status);
      if (btn) { btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true'); }
    }
    var search = document.getElementById('search-input');
    renderTable(search ? search.value : '');
  };

  function renderTable(search) {
    var rows = COUPONS.filter(function (c) {
      var matchFilter = activeFilters.has(c.status);
      var term = (search || '').trim().toLowerCase();
      var matchSearch = !term ||
        c.name.toLowerCase().indexOf(term) !== -1 ||
        c.id.toLowerCase().indexOf(term) !== -1;
      return matchFilter && matchSearch;
    });

    var tbody      = document.getElementById('coupon-tbody');
    var emptyState = document.getElementById('empty-state');
    var pagination = document.getElementById('pagination-wrap');
    var table      = document.getElementById('coupon-table');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = '';
      if (table)      table.style.display      = 'none';
      if (emptyState) emptyState.style.display  = 'flex';
      if (pagination) pagination.style.display  = 'none';
    } else {
      if (table)      table.style.display      = '';
      if (emptyState) emptyState.style.display  = 'none';
      if (pagination) pagination.style.display  = '';
      var rangeEl = document.getElementById('showing-range');
      var totalEl = document.getElementById('showing-total');
      if (rangeEl) rangeEl.textContent = '1-' + rows.length;
      if (totalEl) totalEl.textContent = rows.length;

      tbody.innerHTML = rows.map(function (c) {
        var pct = c.total > 0 ? Math.round((c.used / c.total) * 100) : 0;
        var displayDate = c.expires.toUpperCase()
          .replace('JAN', 'JAN').replace('FEB', 'FEB').replace('MAR', 'MAR')
          .replace('APR', 'APR').replace('MAY', 'MAY').replace('JUN', 'JUN')
          .replace('JUL', 'JUL').replace('AUG', 'AUG').replace('SEP', 'SEP')
          .replace('OCT', 'OCT').replace('NOV', 'NOV').replace('DEC', 'DEC');
        return '<tr class="tasty-table__row">' +
          '<td class="tasty-table__td">' + escapeHtml(c.name) + '</td>' +
          '<td class="tasty-table__td">' + escapeHtml(c.appliesTo) + '</td>' +
          '<td class="tasty-table__td expires-cell">' + escapeHtml(displayDate) + '</td>' +
          '<td class="tasty-table__td">' + statusTag(c.status) + '</td>' +
          '<td class="tasty-table__td">' +
            '<div class="usage-cell">' +
              '<div class="tasty-progress"><div class="tasty-progress__fill' + (pct >= 100 ? ' is-full' : '') + '" style="width:' + pct + '%"></div></div>' +
              '<span class="usage-count">' + c.used + ' / ' + c.total + ' USES</span>' +
            '</div>' +
          '</td>' +
          '<td class="tasty-table__td actions-cell">' +
            '<div class="row-actions-wrap">' +
              '<button class="tasty-btn is-ghost is-sm manage-btn" ' +
                'onclick="openManageMenu(event,\'' + c.id + '\')">' +
                'Manage' +
              '</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

      if (typeof tastyPaintIcons === 'function') tastyPaintIcons();
    }
  }

  window.handleSearch = function (val) {
    renderTable(val);
  };

  window.sortTable = function () { /* prototype stub */ };


  /* ═══════════════════════════════════════════════════════════════
     MANAGE ROW MENU
  ═══════════════════════════════════════════════════════════════ */
  var activeManageMenu = null;

  window.openManageMenu = function (e, couponId) {
    e.stopPropagation();
    closeAllMenus();

    var coupon = COUPONS.find(function (c) { return c.id === couponId; });
    if (!coupon) return;

    var menu = document.createElement('div');
    menu.className = 'tasty-menu manage-menu';

    var items = [];
    items.push('<button class="tasty-menu__item" onclick="viewDetails(\'' + couponId + '\')">View details</button>');
    if (coupon.status === 'active') {
      items.push('<button class="tasty-menu__item" style="color:var(--context-error);" onclick="openRevokeModal(\'' + couponId + '\')">Revoke</button>');
    }
    menu.innerHTML = items.join('');

    var wrap = e.currentTarget.closest('.row-actions-wrap');
    if (!wrap) wrap = e.currentTarget.parentElement;
    wrap.style.position = 'relative';
    wrap.appendChild(menu);
    activeManageMenu = menu;

    setTimeout(function () {
      document.addEventListener('click', closeAllMenus, { once: true });
    }, 0);
  };

  function closeAllMenus() {
    if (activeManageMenu) { activeManageMenu.remove(); activeManageMenu = null; }
    var km = document.getElementById('kebab-menu');
    if (km) km.style.display = 'none';
  }

  window.viewDetails = function (couponId) {
    closeAllMenus();
    var c = COUPONS.find(function (x) { return x.id === couponId; });
    if (c) showToast('Viewing "' + c.name + '"', 'config');
  };


  /* ═══════════════════════════════════════════════════════════════
     REVOKE MODAL
  ═══════════════════════════════════════════════════════════════ */
  window.openRevokeModal = function (couponId) {
    closeAllMenus();
    revokeTarget = couponId;
    var el = document.getElementById('revoke-code-id');
    if (el) el.textContent = couponId;
    var overlay = document.getElementById('revoke-overlay');
    if (overlay) { overlay.style.display = 'flex'; if (typeof tastyPaintIcons === 'function') tastyPaintIcons(); }
  };

  window.closeRevokeModal = function () {
    var overlay = document.getElementById('revoke-overlay');
    if (overlay) overlay.style.display = 'none';
    revokeTarget = null;
  };

  window.confirmRevoke = function () {
    if (!revokeTarget) return;
    var coupon = COUPONS.find(function (c) { return c.id === revokeTarget; });
    if (coupon) {
      coupon.status = 'revoked';
      updateBadges();
      renderTable('');
      closeRevokeModal();
      showToast('"' + coupon.name + '" has been revoked.', 'warning');
    }
  };


  /* ═══════════════════════════════════════════════════════════════
     BADGE COUNTS
  ═══════════════════════════════════════════════════════════════ */
  function updateBadges() {
    ['active', 'redeemed', 'expired', 'revoked'].forEach(function (s) {
      var el = document.getElementById('badge-' + s);
      if (el) el.textContent = COUPONS.filter(function (c) { return c.status === s; }).length;
    });
  }


  /* ═══════════════════════════════════════════════════════════════
     KEBAB MENU
  ═══════════════════════════════════════════════════════════════ */
  window.toggleKebab = function () {
    var m = document.getElementById('kebab-menu');
    if (!m) return;
    var isOpen = m.style.display !== 'none';
    m.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      setTimeout(function () {
        document.addEventListener('click', function handler() {
          m.style.display = 'none';
          document.removeEventListener('click', handler);
        });
      }, 0);
    }
  };
  window.closeKebab = function () {
    var m = document.getElementById('kebab-menu');
    if (m) m.style.display = 'none';
  };


  /* ═══════════════════════════════════════════════════════════════
     CREATE FLOW — STEP 1 (FORM)
  ═══════════════════════════════════════════════════════════════ */
  window.openCreateFlow = function () {
    resetCreateForm();
    showScreen('create-01');
  };

  window.cancelCreate = function () {
    pendingCoupon = null;
    showScreen('list');
    resetCreateForm();
  };

  function setRadioActive(id, checked) {
    var el = document.getElementById(id);
    if (!el) return;
    if (checked) el.classList.add('is-checked'); else el.classList.remove('is-checked');
  }

  function resetCreateForm() {
    var fields = ['input-code-name', 'input-expiry', 'input-note'];
    fields.forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    updateCharCount(document.getElementById('input-note'));
    appliesToVal  = 'all';
    totalUsageVal = 'limit';
    perLearnerVal = 'limit';
    setRadioActive('radio-all-products', true);
    setRadioActive('radio-specific', false);
    setRadioActive('radio-total-unlimited', false);
    setRadioActive('radio-total-limit', true);
    setRadioActive('radio-learner-unlimited', false);
    setRadioActive('radio-learner-limit', true);
    var ps = document.getElementById('product-select-wrap');
    if (ps) ps.style.display = 'none';
    var tg = document.getElementById('total-limit-group');
    if (tg) tg.style.display = 'flex';
    var lg = document.getElementById('learner-limit-group');
    if (lg) lg.style.display = 'flex';
    var gen = document.getElementById('btn-generate');
    if (gen) gen.disabled = true;
  }

  window.selectAppliesTo = function (value) {
    appliesToVal = value;
    setRadioActive('radio-all-products', value === 'all');
    setRadioActive('radio-specific',     value === 'specific');
    var wrap = document.getElementById('product-select-wrap');
    if (wrap) wrap.style.display = value === 'specific' ? 'block' : 'none';
    validateCreate();
  };

  window.selectUsage = function (type, value) {
    if (type === 'total') {
      totalUsageVal = value;
      setRadioActive('radio-total-unlimited', value === 'unlimited');
      setRadioActive('radio-total-limit',     value === 'limit');
      var tg = document.getElementById('total-limit-group');
      if (tg) tg.style.display = value === 'limit' ? 'flex' : 'none';
    } else {
      perLearnerVal = value;
      setRadioActive('radio-learner-unlimited', value === 'unlimited');
      setRadioActive('radio-learner-limit',     value === 'limit');
      var lg = document.getElementById('learner-limit-group');
      if (lg) lg.style.display = value === 'limit' ? 'flex' : 'none';
    }
    validateCreate();
  };

  window.updateCharCount = function (el) {
    var len     = el && el.value ? el.value.length : 0;
    var counter = document.getElementById('char-count');
    if (counter) counter.textContent = len + ' of 250 characters used';
    validateCreate();
  };

  window.validateCreate = function () {
    var name   = (document.getElementById('input-code-name') || {}).value || '';
    var expiry = (document.getElementById('input-expiry')    || {}).value || '';
    var gen    = document.getElementById('btn-generate');
    if (gen) gen.disabled = !(name.trim() && expiry.trim());
  };

  /* Generate → confirmation screen */
  window.goToConfirmation = function () {
    var nameInput   = document.getElementById('input-code-name');
    var codeName    = nameInput ? nameInput.value.trim() : 'New Coupon';
    var expiry      = (document.getElementById('input-expiry') || {}).value || 'TBD';
    var totalLim    = parseInt((document.getElementById('input-total-limit') || {}).value || '100', 10);
    var perLim      = parseInt((document.getElementById('input-learner-limit') || {}).value || '1', 10);
    var appliesLabel = appliesToVal === 'all' ? 'All Products' : 'Specific Product';
    var totalUnlimited = totalUsageVal === 'unlimited';
    var perUnlimited   = perLearnerVal === 'unlimited';

    pendingCoupon = {
      id:        codeName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12) || 'NEWCODE',
      name:      codeName,
      appliesTo: appliesLabel,
      expires:   expiry,
      status:    'active',
      used:      0,
      total:     totalUnlimited ? 999 : totalLim
    };

    /* Populate confirmation card */
    var el;
    el = document.getElementById('confirm-name');        if (el) el.textContent = codeName;
    el = document.getElementById('confirm-expires-date');if (el) el.textContent = expiry;
    el = document.getElementById('confirm-applies');     if (el) el.textContent = appliesLabel;
    el = document.getElementById('confirm-per-learner-num'); if (el) el.textContent = perUnlimited ? '∞' : perLim;
    el = document.getElementById('confirm-total-num');   if (el) el.textContent = totalUnlimited ? '∞' : totalLim;
    el = document.getElementById('confirm-code-input');  if (el) el.value = codeName;

    showScreen('create-03');
    showToast('Coupon code successfully generated!', 'success');
  };


  /* ═══════════════════════════════════════════════════════════════
     CREATE FLOW — STEP 3 (CONFIRMATION)
  ═══════════════════════════════════════════════════════════════ */
  window.copyCode = function () {
    var code = pendingCoupon ? pendingCoupon.id : 'COUPONCODE';
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).catch(function () {});
    }
    showToast('Code copied to clipboard.', 'success');
  };

  window.doneCreate = function () {
    if (pendingCoupon) {
      COUPONS.unshift(pendingCoupon);
      pendingCoupon = null;
      updateBadges();
    }
    showScreen('list');
    renderTable('');
    resetCreateForm();
  };

  window.sendToLearners = function () {
    sendList = [];
    librarySelected = new Set();
    updateSendList();
    renderLibraryList('');
    selectSendMethod('library');
    selectSendAction('now');
    showScreen('create-02');
  };


  /* ═══════════════════════════════════════════════════════════════
     SEND FLOW — STEP 2
  ═══════════════════════════════════════════════════════════════ */
  window.selectSendMethod = function (method) {
    ['library', 'individual', 'csv'].forEach(function (m) {
      var btn    = document.getElementById('opt-' + m);
      var circle = document.getElementById('opt-' + m + '-circle');
      var panel  = document.getElementById('panel-' + m);
      var active = m === method;
      if (btn)    { btn.classList.toggle('is-active', active); btn.setAttribute('aria-pressed', active ? 'true' : 'false'); }
      if (circle) circle.classList.toggle('is-selected', active);
      if (circle) {
        var check = circle.querySelector('.send-option__check');
        if (check) check.style.display = active ? 'flex' : 'none';
      }
      if (panel)  panel.style.display = active ? 'block' : 'none';
    });
  };

  window.selectSendAction = function (action) {
    var tabNow     = document.getElementById('tab-send-now');
    var tabSched   = document.getElementById('tab-schedule');
    var panelNow   = document.getElementById('tabpanel-send-now');
    var panelSched = document.getElementById('tabpanel-schedule');
    if (tabNow) {
      tabNow.classList.toggle('is-active', action === 'now');
      tabNow.setAttribute('aria-selected', action === 'now' ? 'true' : 'false');
    }
    if (tabSched) {
      tabSched.classList.toggle('is-active', action === 'schedule');
      tabSched.setAttribute('aria-selected', action === 'schedule' ? 'true' : 'false');
    }
    if (panelNow)   panelNow.hidden   = (action !== 'now');
    if (panelSched) panelSched.hidden = (action !== 'schedule');
  };

  /* Library panel */
  function renderLibraryList(filter) {
    var box = document.getElementById('learner-list-box');
    if (!box) return;
    var term = (filter || '').trim().toLowerCase();
    var filtered = LEARNERS.filter(function (l) {
      return !term || l.name.toLowerCase().indexOf(term) !== -1 || l.email.toLowerCase().indexOf(term) !== -1;
    });

    box.innerHTML = filtered.map(function (l) {
      var checked = librarySelected.has(l.email);
      return '<label class="learner-list-row' + (checked ? ' is-checked' : '') + '">' +
        '<input type="checkbox" class="learner-checkbox" ' + (checked ? 'checked' : '') +
          ' onchange="toggleLearner(\'' + escapeHtml(l.email) + '\')">' +
        '<span class="learner-name">' + escapeHtml(l.name) + '</span>' +
        '<span class="learner-email">' + escapeHtml(l.email) + '</span>' +
      '</label>';
    }).join('');
  }

  window.renderLibraryList = renderLibraryList;

  window.toggleLearner = function (email) {
    if (librarySelected.has(email)) {
      librarySelected.delete(email);
    } else {
      librarySelected.add(email);
    }
    var countEl = document.getElementById('library-count');
    if (countEl) countEl.textContent = librarySelected.size;
    renderLibraryList((document.getElementById('library-search-input') || {}).value || '');
  };

  window.filterLearners = function (val) {
    renderLibraryList(val);
  };

  /* Individual panel */
  window.addRecipient = function () {
    var first = (document.getElementById('input-first-name') || {}).value || '';
    var last  = (document.getElementById('input-last-name')  || {}).value || '';
    var email = (document.getElementById('input-email')      || {}).value || '';
    if (!first.trim() || !email.trim()) {
      showToast('First name and email are required.', 'warning');
      return;
    }
    sendList.push({ first: first.trim(), last: last.trim(), email: email.trim() });
    ['input-first-name', 'input-last-name', 'input-email'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    updateSendList();
  };

  window.clearSendList = function () {
    sendList = [];
    updateSendList();
  };

  function updateSendList() {
    var badge = document.getElementById('send-count-badge');
    var empty = document.getElementById('send-list-empty-state');
    var items = document.getElementById('send-list-items');
    if (badge) badge.textContent = sendList.length;
    if (empty) empty.style.display = sendList.length === 0 ? 'flex' : 'none';
    if (items) {
      items.style.display = sendList.length > 0 ? 'block' : 'none';
      items.innerHTML = sendList.map(function (r, i) {
        return '<li class="send-list-item">' +
          '<span class="send-list-name">' +
            escapeHtml(r.first) + ' ' + escapeHtml(r.last) +
            ' <span class="send-list-email">— ' + escapeHtml(r.email) + '</span>' +
          '</span>' +
          '<button class="send-list-remove" onclick="removeRecipient(' + i + ')" aria-label="Remove">' +
            '<span class="tcon" data-g="cancel"></span>' +
          '</button>' +
        '</li>';
      }).join('');
      if (typeof tastyPaintIcons === 'function') tastyPaintIcons();
    }
  }

  window.removeRecipient = function (i) {
    sendList.splice(i, 1);
    updateSendList();
  };

  window.completeSend = function () {
    var codeName = pendingCoupon ? pendingCoupon.name : 'New Coupon';
    var count    = librarySelected.size > 0 ? librarySelected.size : sendList.length;

    if (pendingCoupon) {
      COUPONS.unshift(pendingCoupon);
      pendingCoupon = null;
      updateBadges();
    }

    showScreen('list');
    renderTable('');
    showToast('"' + codeName + '" sent to ' + count + ' recipient(s).', 'success');
    sendList = [];
    librarySelected = new Set();
    resetCreateForm();
  };


  /* ═══════════════════════════════════════════════════════════════
     PAGINATION
  ═══════════════════════════════════════════════════════════════ */
  window.togglePerPage = function () {
    var opts = document.getElementById('per-page-options');
    if (opts) opts.style.display = opts.style.display === 'none' ? 'inline-flex' : 'none';
  };
  window.setPerPage = function (n) {
    var trigger = document.getElementById('per-page-trigger');
    if (trigger) {
      trigger.innerHTML = n + ' <span class="tcon" data-g="caret" style="font-size:10px;vertical-align:middle;"></span>';
      if (typeof tastyPaintIcons === 'function') tastyPaintIcons();
    }
    var opts = document.getElementById('per-page-options');
    if (opts) opts.style.display = 'none';
  };


  /* ═══════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    /* Header illustration */
    var headerSlot = document.getElementById('coupon-illus-header');
    if (headerSlot && typeof tastyIllus === 'function') {
      headerSlot.innerHTML = tastyIllus('piggy-bank-fill', { size: 64, alt: 'Coupon Codes' });
    }

    /* Empty state illustration */
    var emptySlot = document.getElementById('empty-illus-slot');
    if (emptySlot && typeof tastyIllus === 'function') {
      emptySlot.innerHTML = tastyIllus('piggy-bank-line', { size: 120, alt: '' });
    }

    /* Usage limits section icon */
    var usageSlot = document.getElementById('usage-icon-slot');
    if (usageSlot && typeof tastyIcon === 'function') {
      usageSlot.innerHTML = tastyIcon('settings', { size: 16 });
    }

    updateBadges();
    renderTable('');
    renderLibraryList('');
    selectSendMethod('library');
    selectSendAction('now');
    if (typeof tastyPaintIcons === 'function') tastyPaintIcons();
  });

})();
