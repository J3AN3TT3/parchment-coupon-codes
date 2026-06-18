/* ════════════════════════════════════════════════════════════════════
   TASTY INTERACTIONS — tiny, dependency-free behaviors for the prototype
   component classes. Delegated click handling on document, so it works for
   markup injected after load. Opt-in via data-tasty="..." hooks.
   ════════════════════════════════════════════════════════════════════
     data-tasty="toggle"      → flips .is-on on the .tasty-toggle
     data-tasty="accordion"   → flips .is-open on the closest .tasty-accordion
     data-tasty="menu"        → toggles the next .tasty-menu / .tasty-popover sibling
     data-tasty="modal-open"  value=#id  → shows that .tasty-modal-overlay
     data-tasty="modal-close" → hides the closest overlay
     data-tasty="toast"       value="message" data-kind="success|warning|error|primary|note (config=primary)"
   ════════════════════════════════════════════════════════════════════ */
(function () {
  function closeAllMenus(except) {
    document.querySelectorAll('.tasty-menu.is-open, .tasty-popover.is-open').forEach(function (m) {
      if (m !== except) m.classList.remove('is-open');
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tasty]');

    // clicking outside any open menu closes them
    if (!t || t.getAttribute('data-tasty') !== 'menu') closeAllMenus(null);
    if (!t) return;

    var kind = t.getAttribute('data-tasty');

    if (kind === 'toggle') {
      if (t.classList.contains('is-disabled')) return;
      t.classList.toggle('is-on');
      t.setAttribute('aria-pressed', t.classList.contains('is-on'));
    }

    if (kind === 'accordion') {
      var acc = t.closest('.tasty-accordion');
      if (acc) acc.classList.toggle('is-open');
    }

    if (kind === 'menu') {
      e.stopPropagation();
      var menu = t.parentElement.querySelector('.tasty-menu, .tasty-popover');
      if (menu) {
        var willOpen = !menu.classList.contains('is-open');
        closeAllMenus(menu);
        menu.classList.toggle('is-open', willOpen);
      }
    }

    if (kind === 'modal-open') {
      var sel = t.getAttribute('value') || t.dataset.target;
      var ov = sel && document.querySelector(sel);
      if (ov) ov.style.display = 'flex';
    }

    if (kind === 'modal-close') {
      var overlay = t.closest('.tasty-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    if (kind === 'toast') {
      window.tastyToast(t.getAttribute('value') || 'Done', t.dataset.kind || 'config');
    }
  });

  // close menu/popover on escape
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(null); });

  // Programmatic toast. Mounts a stack if absent.
  window.tastyToast = function (message, kind) {
    var stack = document.querySelector('.tasty-toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'tasty-toast-stack'; document.body.appendChild(stack); }
    var el = document.createElement('div');
    el.className = 'tasty-toast is-' + (kind || 'success');   /* truth: ToastProvider defaults colorContext to success */
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="tasty-toast__msg"></span><button class="tasty-toast__x" aria-label="Dismiss">×</button>';
    el.querySelector('.tasty-toast__msg').textContent = message;
    el.querySelector('.tasty-toast__x').addEventListener('click', function () { el.remove(); });
    stack.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  };

  /* .tasty-menu/.tasty-popover are positioned absolutely and hidden until .is-open.
     Provide the hidden default here so consumers don't need extra CSS. */
  var style = document.createElement('style');
  style.textContent = '.tasty-menu:not(.is-open),.tasty-popover:not(.is-open){display:none}';
  document.head.appendChild(style);
})();
