/* What We Do — service tabs driven by the four-cube scene (cubes.js, built like the framework ring).
   - The scene's pills are real <button role="tab"> controls (arrow keys, Home/End), panels role="tabpanel".
   - #build / #modernize / #run / #secure select a tab on load; selecting a tab updates the hash
     with history.replaceState (no scroll).
   - Motion: the scene runs its own opening (see cubes.js). Panels cross-fade briefly on tab change.
     Each panel illustration plays a once-only orange-detail
     emphasis the first time it is shown. All of it is skipped with prefers-reduced-motion. */
(function () {
  "use strict";

  var N = window.Nohvum || {};
  var M = window.Motion;
  var ease = N.ease || [0.22, 1, 0.36, 1];
  var motionOK = function () { return N.motionOK ? N.motionOK() : false; };

  var chart = document.querySelector("[data-wwd-chart]");
  var tablist = document.querySelector("[data-wwd-tablist]");
  var panelsWrap = document.querySelector("[data-wwd-panels]");
  if (!chart || !tablist || !panelsWrap) return;

  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  var ids = tabs.map(function (t) { return t.getAttribute("data-service"); });
  var aliases = { modernise: "modernize", modernisation: "modernize", modernization: "modernize" };   // old and alternative spellings still land on the tab

  var current = -1;
  var cubes = null;
  var played = {};           // service -> emphasis played
  var artReady = {};         // service -> Promise resolving when the panel art is inlined and primed
  var switchToken = 0;
  var running = [];          // in-flight panel fades, stopped when the selection changes again

  function indexFromHash() {
    var h = (location.hash || "").replace(/^#/, "").toLowerCase();
    h = aliases[h] || h;
    var i = ids.indexOf(h);
    return i < 0 ? 0 : i;
  }

  /* ---------- Panel helpers ---------- */
  function drawIn(el, opts) {
    var len = 0;
    try { len = el.getTotalLength(); } catch (e) { len = 0; }
    if (!len) return M.animate(el, { opacity: [0, 1] }, opts);
    el.style.strokeDasharray = len + " " + len;
    el.style.strokeDashoffset = String(len);
    var a = M.animate(el, { strokeDashoffset: [len, 0] }, opts);
    a.finished.then(function () { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; });
    return a;
  }

  function popIn(el, opts) {
    el.classList.add("wwd-fx");
    return M.animate(el, { opacity: [0, 1], scale: [0.4, 1] }, opts);
  }

  /* ---------- Panel illustrations ---------- */
  // Once-only emphasis sequences: each step is [selector, kind, delay].
  var sequences = {
    build: [
      ['circle[cx="413"][cy="232"]', "pop", 0],
      ['path[d^="M413 339"]', "draw", 0.2],
      ['path[d^="m502 323"]', "pop", 0.75]
    ],
    modernize: [
      ['circle[cx="378"]', "pop", 0],
      ['path[d^="M378 315"]', "draw", 0.15],
      ['circle[cx="594"]', "pop", 0.75]
    ],
    run: [
      ['path[d^="M460 338"]', "draw", 0],
      ['circle[cx="337"][cy="201"]', "pop", 0.55],
      ['circle[cx="672"][cy="310"]', "pop", 0.65],
      ['circle[cx="246"][cy="303"]', "pop", 0.75]
    ],
    secure: [
      ['circle[cx="441"][cy="286"]', "pop", 0],
      ['circle[cx="420"][cy="387"][r="3.5"]', "pop", 0.2],
      ['path[d^="m555 361"]', "pop", 0.5]
    ]
  };

  function stepsFor(service, svg) {
    return (sequences[service] || []).map(function (s) {
      return { el: svg.querySelector(s[0]), kind: s[1], delay: s[2] };
    }).filter(function (s) { return !!s.el; });
  }

  function prepareArt(panel) {
    var service = panel.getAttribute("data-service");
    var box = panel.querySelector(".wwd-panel__art");
    var img = box && box.querySelector("[data-wwd-art]");
    if (!img || !N.inlineSvg) {
      if (box) box.style.opacity = "1";
      return Promise.resolve(null);
    }
    return N.inlineSvg(img).then(function (svg) {
      if (svg.tagName.toLowerCase() === "svg" && motionOK()) {
        // Prime: hide the orange details so the emphasis can bring them in.
        stepsFor(service, svg).forEach(function (s) {
          if (s.kind === "pop") { s.el.classList.add("wwd-fx"); s.el.style.opacity = "0"; }
          else {
            var len = 0;
            try { len = s.el.getTotalLength(); } catch (e) { len = 0; }
            if (len) { s.el.style.strokeDasharray = len + " " + len; s.el.style.strokeDashoffset = String(len); }
          }
        });
      }
      return svg;
    });
  }

  function emphasise(panel) {
    var service = panel.getAttribute("data-service");
    if (played[service]) return;
    played[service] = true;
    var box = panel.querySelector(".wwd-panel__art");
    (artReady[service] || Promise.resolve(null)).then(function (svg) {
      if (!motionOK() || !svg || svg.tagName.toLowerCase() !== "svg") { box.style.opacity = "1"; return; }
      var baseDelay = 0;
      if (getComputedStyle(box).opacity === "0") {
        M.animate(box, { opacity: [0, 1] }, { duration: 0.6, ease: ease });
        baseDelay = 0.35;
      }
      stepsFor(service, svg).forEach(function (s) {
        var opts = { duration: s.kind === "draw" ? 0.7 : 0.4, delay: baseDelay + s.delay, ease: ease };
        if (s.kind === "draw") drawIn(s.el, opts);
        else popIn(s.el, opts).finished.then(function () { s.el.style.opacity = ""; });
      });
    });
  }

  /* ---------- Tabs ---------- */
  function setStatic(i) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
  }

  function select(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= tabs.length) return;
    if (opts.focus !== false && opts.focus) tabs[i].focus();
    if (i === current) return;
    var prev = current;
    current = i;
    if (cubes && !opts.initial) cubes.select(i);   // the scene selects the initial service itself, after its opening
    if (!opts.initial) {
      var hash = "#" + ids[i];
      if (location.hash !== hash) history.replaceState(null, "", hash);
    }

    if (prev < 0 || !motionOK()) {
      setStatic(i);
      if (prev >= 0) emphasise(panels[i]);
      return;
    }

    // Tab state changes immediately; the panel content fades out then in (~220ms each way).
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    var token = ++switchToken;
    var next = panels[i];
    running.forEach(function (a) { try { a.stop(); } catch (e) { /* already done */ } });
    running = [];
    // Whatever is on screen now (normally the previous panel, or one still mid-fade) fades out.
    var out = panels.filter(function (p) { return !p.hidden && p !== next; });
    var outOpacity = out.length ? parseFloat(getComputedStyle(out[0]).opacity) : 0;
    next.hidden = true;
    var fadeOut;
    if (out.length && outOpacity > 0.05) {
      var a = M.animate(out, { opacity: [outOpacity, 0] }, { duration: 0.2 * outOpacity, ease: "easeIn" });
      running.push(a);
      fadeOut = a.finished;
    } else {
      fadeOut = Promise.resolve();
    }
    fadeOut.then(function () {
      if (token !== switchToken) return;
      out.forEach(function (p) { p.hidden = true; p.style.opacity = ""; });
      next.style.opacity = "0";
      next.hidden = false;
      var b = M.animate(next, { opacity: [0, 1] }, { duration: 0.25, ease: ease });
      running.push(b);
      b.finished.then(function () { if (token === switchToken) next.style.opacity = ""; });
      emphasise(next);
    });
  }

  /* ---------- Init ---------- */
  var start = indexFromHash();
  // The scene owns the pills' clicks and arrow keys; it reports changes back here.
  cubes = window.NohvumCubes ? window.NohvumCubes.create(chart, {
    initial: start,
    name: function (k) { return tabs[k].querySelector(".ring-pill__name").textContent; },
    onChange: function (k) { select(k, { focus: false }); }
  }) : null;

  if (!cubes) tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i, { focus: false }); });
    t.addEventListener("keydown", function (e) {
      var k = e.key, n = tabs.length, to = -1;
      if (k === "ArrowRight" || k === "ArrowDown") to = (i + 1) % n;
      else if (k === "ArrowLeft" || k === "ArrowUp") to = (i - 1 + n) % n;
      else if (k === "Home") to = 0;
      else if (k === "End") to = n - 1;
      if (to < 0) return;
      e.preventDefault();
      select(to, { focus: true });
    });
  });

  window.addEventListener("hashchange", function () {
    var i = indexFromHash();
    select(i, { focus: false });
    // A same-page link (e.g. the footer's service links) should bring the services into view.
    var r = chart.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      chart.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
    }
  });

  panelsWrap.classList.add("is-tabs");
  select(start, { initial: true });

  panels.forEach(function (p) { artReady[p.getAttribute("data-service")] = prepareArt(p); });

  // Initial panel: fade its art in and play its emphasis when the panel scrolls into view.
  var first = panels[start];
  if (motionOK()) N.onceInView(first.querySelector(".wwd-panel__art"), function () { emphasise(first); }, 0.35);
  else emphasise(first);
  // Panels not yet shown get their art made visible (the emphasis primes only the orange parts).
  panels.forEach(function (p, k) {
    if (k === start) return;
    var service = p.getAttribute("data-service");
    artReady[service].then(function () { p.querySelector(".wwd-panel__art").style.opacity = "1"; });
  });

})();
