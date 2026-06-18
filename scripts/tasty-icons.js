/* ════════════════════════════════════════════════════════════════════
   TASTY ICON HELPERS — resolve a friendly slug to vendored SVG markup.
   Depends on window.TASTY_ICONS (assets/tasty/manifest.js), loaded first.
   ════════════════════════════════════════════════════════════════════

   tastyIcon(slug, opts)   → monochrome <span class="tcon">  (recolorable)
   tastyIllus(slug, opts)  → full-color <img class="tillus">
   tastyName(slug)         → the PascalCase name Tasty calls it (e.g. CheckIcon)

   Lookup order: icon → graphic → vector (first match wins). Pass
   { category: 'vector' } to disambiguate. Unknown slug → empty string
   plus a console.warn (so a typo is visible, not silently blank).
   ════════════════════════════════════════════════════════════════════ */
(function (w, doc) {
  var M = w.TASTY_ICONS || { icon: {}, graphic: {}, vector: {} };
  var ORDER = ['icon', 'graphic', 'vector'];

  // Manifest paths are project-root-relative (e.g. "assets/tasty/icons/x.svg").
  // Derive the project root from THIS script's own URL so those paths resolve
  // correctly no matter where the host page lives — project root (index.html),
  // a subfolder (preview/*.html), or a template (templates/*/). Without this,
  // a preview page resolves "assets/…" against /preview/ → broken /preview/assets/….
  var self = doc.currentScript || (function () { var s = doc.getElementsByTagName('script'); return s[s.length - 1]; })();
  var BASE = '';
  try { if (self && self.src) BASE = self.src.replace(/scripts\/tasty-icons\.js(\?.*)?$/, ''); } catch (e) {}
  w.TASTY_BASE = BASE;
  // Leave absolute (http(s)://, //, data:, /) paths untouched; prefix the rest.
  function resolvePath(p) {
    return (!p || /^([a-z][a-z0-9+.-]*:)?\/\//i.test(p) || p.charAt(0) === '/' || p.indexOf('data:') === 0) ? p : BASE + p;
  }
  w.tastyAssetUrl = resolvePath;

  function lookup(slug, category) {
    if (category) return M[category] && M[category][slug] ? { cat: category, rec: M[category][slug] } : null;
    for (var i = 0; i < ORDER.length; i++) {
      var c = ORDER[i];
      if (M[c] && M[c][slug]) return { cat: c, rec: M[c][slug] };
    }
    return null;
  }

  function warn(slug) { if (w.console) console.warn('[tasty-icons] unknown slug: ' + slug); return ''; }

  // Monochrome 'icon'-family slugs render as a recolorable CSS mask (.tcon) that
  // inherits currentColor — so they paint white on the dark header, dark on light
  // surfaces, etc., automatically. This works on file:// because the SVG is an
  // INLINE data: URI (manifest.js), not a cross-origin file (which masks block).
  // Full-color families ('graphic'/'vector') keep their baked colors → <img>.
  // opts: { size:18, className, title, category }
  w.tastyIcon = function (slug, opts) {
    opts = opts || {};
    var hit = lookup(slug, opts.category);
    if (!hit) return warn(slug);
    var src = hit.rec.uri || resolvePath(hit.rec.path);
    var size = opts.size != null ? (typeof opts.size === 'number' ? opts.size : parseInt(opts.size, 10)) : 18;
    if (hit.cat !== 'icon') {
      // full-color graphic/vector — baked colors, can't recolor
      var icls = 'ticon' + (opts.className ? ' ' + opts.className : '');
      var ititle = opts.title ? ' title="' + opts.title + '" alt="' + opts.title + '"' : ' alt="" aria-hidden="true"';
      return '<img class="' + icls + '" src="' + src + '" width="' + size + '" height="' + size + '"' + ititle + '>';
    }
    var cls = 'tcon' + (opts.className ? ' ' + opts.className : '');
    var a11y = opts.title ? ' role="img" aria-label="' + opts.title + '" title="' + opts.title + '"' : ' aria-hidden="true"';
    return '<span class="' + cls + '" style="--tcon:url(' + src + ');font-size:' + size + 'px"' + a11y + '></span>';
  };

  // Full-color illustration/graphic/logo. opts: { size:number(px width), alt, className, category }
  w.tastyIllus = function (slug, opts) {
    opts = opts || {};
    var hit = lookup(slug, opts.category);
    if (!hit) return warn(slug);
    var cls = 'tillus' + (opts.className ? ' ' + opts.className : '');
    var style = opts.size != null ? ' style="width:' + opts.size + 'px"' : '';
    var alt = ' alt="' + (opts.alt != null ? opts.alt : '') + '"';
    return '<img class="' + cls + '" src="' + (hit.rec.uri || resolvePath(hit.rec.path)) + '"' + style + alt + '>';
  };

  // The name Tasty calls this asset (e.g. 'check' → 'CheckIcon').
  w.tastyName = function (slug) {
    var hit = lookup(slug);
    return hit ? hit.rec.name : null;
  };

  // ── Declarative hydrator ──────────────────────────────────────────────
  // Paint every <span class="tcon" data-g="SLUG"> by setting its --tcon mask
  // from the icon manifest. This is what makes STATIC markup icons appear —
  // tastyIcon() above is only for JS-injected strings; writing the declarative
  // <span class="tcon" data-g="…"> form (as the kit gallery does) needs this
  // sweep or the icons render blank. Idempotent + re-runnable: after you inject
  // more .tcon[data-g] nodes from a render fn, call w.tastyPaintIcons() again.
  w.tastyPaintIcons = function (root) {
    var nodes = (root || doc).querySelectorAll('.tcon[data-g]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-tcon-painted')) continue;       // already done
      var slug = el.getAttribute('data-g');
      var hit = lookup(slug, 'icon') || lookup(slug);            // icon family first
      if (hit && hit.rec.uri) {
        el.style.setProperty('--tcon', 'url(' + hit.rec.uri + ')');
        el.setAttribute('data-tcon-painted', '1');
      } else { warn(slug); }
    }
  };
  // Auto-run on load, then again next tick — components.js mounts the chrome
  // header/footer glyphs on the same DOMContentLoaded and listener order isn't
  // guaranteed, so the second pass catches them. Idempotent via the guard attr.
  function autopaint() { w.tastyPaintIcons(); setTimeout(function () { w.tastyPaintIcons(); }, 0); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autopaint);
  else autopaint();
})(window, document);
