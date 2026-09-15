(function () {
  'use strict';

  var root = document.documentElement;

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Theme ---------- */
  var themeBtn = document.querySelector('[data-theme-toggle]');
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return systemDark && systemDark.matches ? 'dark' : 'light';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      var system = systemDark && systemDark.matches ? 'dark' : 'light';
      if (next === system) {
        // Back to following the system setting.
        root.removeAttribute('data-theme');
        store('ahc-theme', null);
      } else {
        root.setAttribute('data-theme', next);
        store('ahc-theme', next);
      }
    });
  }

  /* ---------- Spoilers ---------- */
  var spoilerBtn = document.querySelector('[data-spoiler-toggle]');

  function syncSpoilerButton() {
    if (spoilerBtn) spoilerBtn.setAttribute('aria-pressed', root.getAttribute('data-spoilers') === 'shown' ? 'true' : 'false');
  }
  syncSpoilerButton();

  if (spoilerBtn) {
    spoilerBtn.addEventListener('click', function () {
      if (root.getAttribute('data-spoilers') === 'shown') {
        root.removeAttribute('data-spoilers');
        store('ahc-spoilers', null);
        document.querySelectorAll('.spoiler.is-revealed').forEach(function (el) { el.classList.remove('is-revealed'); });
        document.body.classList.remove('gate-open');
      } else {
        root.setAttribute('data-spoilers', 'shown');
        store('ahc-spoilers', 'shown');
      }
      syncSpoilerButton();
    });
  }

  document.addEventListener('click', function (e) {
    var reveal = e.target.closest('[data-reveal]');
    if (reveal) {
      var sp = reveal.closest('[data-spoiler]');
      if (sp) {
        sp.classList.add('is-revealed');
        if (sp.classList.contains('spoiler--gate')) document.body.classList.add('gate-open');
        var body = sp.querySelector('.spoiler-body');
        if (body && sp.classList.contains('spoiler--gate')) body.setAttribute('tabindex', '-1');
      }
      return;
    }
    var hide = e.target.closest('[data-hide]');
    if (hide) {
      var sp2 = hide.closest('[data-spoiler]');
      if (sp2) {
        sp2.classList.remove('is-revealed');
        if (sp2.classList.contains('spoiler--gate')) document.body.classList.remove('gate-open');
        sp2.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  // If someone follows a link into hidden content, open the gate that contains it.
  function openForHash() {
    if (!location.hash) return;
    var target;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (!target) return;
    var gate = target.closest('.spoiler--gate');
    if (gate && root.getAttribute('data-spoilers') !== 'shown' && !gate.classList.contains('is-revealed')) {
      // Scroll to the gate instead of silently revealing.
      gate.scrollIntoView();
    }
  }

  /* ---------- Mobile TOC drawer ---------- */
  var toc = document.getElementById('toc');
  var tocBtn = document.querySelector('[data-toc-toggle]');
  var scrim = document.querySelector('[data-toc-scrim]');

  function setToc(open) {
    if (!toc) return;
    toc.classList.toggle('is-open', open);
    if (tocBtn) tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.hidden = !open;
  }
  if (tocBtn) tocBtn.addEventListener('click', function () { setToc(!toc.classList.contains('is-open')); });
  if (scrim) scrim.addEventListener('click', function () { setToc(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setToc(false); });
  if (toc) {
    toc.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) {
        var gate = target.closest('.spoiler--gate');
        if (gate && root.getAttribute('data-spoilers') !== 'shown' && !gate.classList.contains('is-revealed')) {
          e.preventDefault();
          gate.scrollIntoView({ behavior: 'smooth' });
        }
      }
      if (window.matchMedia('(max-width: 1080px)').matches) setToc(false);
    });
  }

  /* ---------- Scrollspy ---------- */
  if (toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var active = null;

    function setActive(id) {
      if (active === id) return;
      active = id;
      links.forEach(function (a) { a.classList.remove('is-active'); });
      toc.querySelectorAll('.is-open').forEach(function (li) { li.classList.remove('is-open'); });
      var link = byId[id];
      if (!link) return;
      link.classList.add('is-active');
      var li = link.parentElement;
      while (li && li !== toc) {
        if (li.classList && li.classList.contains('toc-l2')) li.classList.add('is-open');
        li = li.parentElement;
      }
      var inner = toc.querySelector('.toc-inner');
      if (inner) {
        var lr = link.getBoundingClientRect(), ir = inner.getBoundingClientRect();
        if (lr.top < ir.top + 40 || lr.bottom > ir.bottom - 40) inner.scrollTop += (lr.top - ir.top) - ir.height / 3;
      }
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var line = (parseFloat(getComputedStyle(root).scrollPaddingTop) || 120) + 10;
        var best = null;
        for (var i = 0; i < targets.length; i++) {
          var r = targets[i].getBoundingClientRect();
          if (r.height === 0 && r.width === 0) continue;
          if (r.top <= line) best = targets[i]; else break;
        }
        if (best) setActive(best.id);
        else if (targets[0]) setActive(targets[0].id);
      });
    }, { passive: true });
    window.dispatchEvent(new Event('scroll'));
  }

  /* ---------- Filter ---------- */
  var filterInput = document.querySelector('[data-filter]');
  var countEl = document.querySelector('[data-filter-count]');
  if (filterInput) {
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-filter-group]'));
    var scopes = Array.prototype.slice.call(document.querySelectorAll('[data-filter-scope]'));
    var sections = Array.prototype.slice.call(document.querySelectorAll('.ref-section, .doc-section'));
    var texts = groups.map(function (g) { return g.textContent.replace(/\s+/g, ' ').toLowerCase(); });
    var empty = document.createElement('p');
    empty.className = 'no-results';
    empty.hidden = true;
    var main = document.getElementById('main');
    if (main) main.appendChild(empty);

    var run = function () {
      var q = filterInput.value.trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var shown = 0;
      groups.forEach(function (g, i) {
        var ok = terms.every(function (t) { return texts[i].indexOf(t) !== -1; });
        g.classList.toggle('is-filtered-out', !ok);
        if (ok) shown++;
      });
      scopes.forEach(function (s) {
        var any = s.querySelector('[data-filter-group]:not(.is-filtered-out)');
        s.classList.toggle('is-filtered-out', !any && terms.length > 0);
      });
      sections.forEach(function (sec) {
        if (!sec.querySelector('[data-filter-group]')) return;
        var any = sec.querySelector('[data-filter-group]:not(.is-filtered-out)');
        sec.classList.toggle('is-filtered-out', !any && terms.length > 0);
      });
      if (terms.length) {
        countEl.textContent = shown + ' match' + (shown === 1 ? '' : 'es');
        if (shown > 0 && root.getAttribute('data-spoilers') !== 'shown') {
          // Let matches inside hidden spoiler sections stay hidden, but say so.
          var hiddenMatches = 0;
          document.querySelectorAll('.spoiler--gate:not(.is-revealed) [data-filter-group]:not(.is-filtered-out)').forEach(function () { hiddenMatches++; });
          if (hiddenMatches) countEl.textContent += ' (' + hiddenMatches + ' in spoilers)';
        }
      } else {
        countEl.textContent = '';
      }
      empty.hidden = !(terms.length && shown === 0);
      empty.textContent = 'Nothing matches “' + filterInput.value.trim() + '”.';
    };
    filterInput.addEventListener('input', run);
  }

  /* ---------- Sorting (monster cards) ---------- */
  var sortSel = document.querySelector('[data-sort]');
  var sortable = document.querySelector('[data-sortable]');
  if (sortSel && sortable) {
    sortSel.addEventListener('change', function () {
      var key = sortSel.value;
      var cards = Array.prototype.slice.call(sortable.children);
      cards.sort(function (a, b) {
        if (key === 'name') return a.dataset.name.localeCompare(b.dataset.name);
        var d = Number(b.dataset[key]) - Number(a.dataset[key]);
        return d !== 0 ? d : a.dataset.name.localeCompare(b.dataset.name);
      });
      cards.forEach(function (c) { sortable.appendChild(c); });
    });
  }

  /* ---------- Back to top ---------- */
  var toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('is-visible', window.scrollY > 900);
    }, { passive: true });
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  openForHash();
})();
