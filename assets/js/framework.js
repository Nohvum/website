/* Framework page.
   - Lifecycle ring: see framework-ring.js (ported from the Delivery Loop reference). The selected
     stage turns to the front-centre; a connector drops from it to the stage detail section below.
   - Stage panels crossfade in place (no scrolling); prev/next drive the same selection.
   - Context engineering / certification / feedback loop share one section as tabs.
   - The knowledge model, certification and feedback-loop diagrams are cards wired by flow-diagrams.js. */
(function () {
  "use strict";
  var N = window.Nohvum;
  var M = window.Motion;
  if (!N) return;
  var ease = N.ease;

  var STAGES = ["plan", "build", "test", "deploy", "run", "support"];
  var NAMES = { plan: "Plan", build: "Build", test: "Test", deploy: "Deploy", run: "Run", support: "Support" };
  var COUNT = STAGES.length;
  var mod = function (a, n) { return ((a % n) + n) % n; };

  var selected = 0;
  var ring = null;

  /* ------------------------------------------------------------------------------- panels */
  var panels = {};
  document.querySelectorAll(".stage-panel").forEach(function (p) { panels[p.getAttribute("data-stage")] = p; });
  var prevBtn = document.querySelector("[data-stage-prev]");
  var nextBtn = document.querySelector("[data-stage-next]");
  var prevLabel = document.querySelector("[data-stage-prev-label]");
  var nextLabel = document.querySelector("[data-stage-next-label]");
  var played = {};
  var panelAnim = null;

  function loadArt(panel) {
    var img = panel.querySelector("img[data-src]");
    if (!img) return Promise.resolve(panel.querySelector(".stage-panel__art svg"));
    img.src = img.getAttribute("data-src");
    img.removeAttribute("data-src");
    return N.inlineSvg(img);
  }

  function flowSequence(panel) {
    if (!N.motionOK()) return;
    var steps = panel.querySelectorAll("[data-flow-step]");
    var gates = panel.querySelectorAll("[data-flow-gate]");
    var order = [steps[0], gates[0], steps[1], gates[1], steps[2]];
    var timers = panel._timers || [];
    timers.forEach(clearTimeout);
    order.forEach(function (el) { if (el) el.classList.remove("is-lit"); });
    timers = [];
    order.forEach(function (el, i) {
      if (!el) return;
      timers.push(setTimeout(function () {
        el.classList.add("is-lit");
      }, 250 + i * 330));
    });
    // pause at the human review point, then settle
    timers.push(setTimeout(function () { order.forEach(function (el) { if (el) el.classList.remove("is-lit"); }); }, 250 + 4 * 330 + 1300));
    panel._timers = timers;
  }

  function artEmphasis(svg) {
    if (!svg || svg.tagName.toLowerCase() !== "svg" || !N.motionOK()) return;
    var parts = N.orangeParts(svg);
    parts.forEach(function (el, i) {
      var tag = el.tagName.toLowerCase();
      var delay = 0.25 + Math.min(i, 8) * 0.06;
      if (tag === "path" || tag === "line" || tag === "polyline") {
        el.setAttribute("pathLength", "1");
        el.style.strokeDasharray = "1 1";
        M.animate(el, { strokeDashoffset: [1, 0] }, { delay: delay, duration: 0.7, ease: ease });
      } else {
        el.style.transformBox = "fill-box";
        el.style.transformOrigin = "center";
        M.animate(el, { opacity: [0, 1], scale: [0.5, 1] }, { delay: delay + 0.3, duration: 0.4, ease: ease });
      }
    });
  }

  function showPanel(key, animate) {
    var next = panels[key];
    var current = null;
    Object.keys(panels).forEach(function (k) { if (!panels[k].hidden && k !== key) current = panels[k]; });
    var run = function () {
      if (current) { current.hidden = true; current.style.opacity = ""; }
      next.hidden = false;
      loadArt(next).then(function (svg) {
        if (played[key]) return;
        played[key] = true;
        if (animate) artEmphasis(svg);
        else N.onceInView(document.getElementById("stages"), function () { artEmphasis(svg); }, 0.4);
      });
      if (animate && N.motionOK()) {
        M.animate(next, { opacity: [0, 1] }, { duration: 0.35, ease: "easeOut" });
        flowSequence(next);
      }
    };
    if (!current) { run(); return; }
    if (animate && N.motionOK()) {
      if (panelAnim) panelAnim.stop();
      panelAnim = M.animate(current, { opacity: 0 }, { duration: 0.2, ease: "easeIn" });
      panelAnim.then(run);
    } else {
      run();
    }
  }

  function updateChrome() {
    var prev = STAGES[mod(selected - 1, COUNT)], next = STAGES[mod(selected + 1, COUNT)];
    if (prevLabel) prevLabel.textContent = NAMES[prev];
    if (nextLabel) nextLabel.textContent = NAMES[next];
    if (prevBtn) prevBtn.setAttribute("aria-label", "Previous stage: " + NAMES[prev]);
    if (nextBtn) nextBtn.setAttribute("aria-label", "Next stage: " + NAMES[next]);
  }

  // Selection from anywhere (ring, section prev/next, hash) updates the page; the ring is told
  // unless the change came from the ring itself.
  function select(index, opts) {
    opts = opts || {};
    index = mod(index, COUNT);
    if (index === selected && !opts.force) return;
    selected = index;
    updateChrome();
    showPanel(STAGES[index], !opts.instant);
    if (!opts.instant && history.replaceState) history.replaceState(null, "", "#" + STAGES[index]);
    if (ring && !opts.fromRing && !opts.initial) ring.select(index, { instant: opts.instant });
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { select(selected - 1, { dir: -1 }); });
  if (nextBtn) nextBtn.addEventListener("click", function () { select(selected + 1, { dir: 1 }); });

  var fromHash = STAGES.indexOf((location.hash || "").slice(1).toLowerCase());
  var initial = fromHash >= 0 ? fromHash : 0;
  select(initial, { instant: true, force: true, initial: true });
  if (window.NohvumRing) {
    ring = window.NohvumRing.create(document.querySelector("[data-ring]"), {
      initial: initial,
      name: function (i) { return NAMES[STAGES[mod(i, COUNT)]]; },
      onChange: function (i) { select(i, { fromRing: true }); }
    });
  }
  window.addEventListener("hashchange", function () {
    var i = STAGES.indexOf((location.hash || "").slice(1).toLowerCase());
    if (i >= 0) select(i);
  });

  // First view of the stage detail plays the flow highlight once.
  var stageSection = document.getElementById("stages");
  N.onceInView(stageSection, function () { flowSequence(panels[STAGES[selected]]); }, 0.4);

  /* ------------------------------------------------------------------------------- autonomy dial */
  var dial = document.querySelector(".dial__options");
  if (dial) {
    var opts = Array.prototype.slice.call(dial.querySelectorAll(".dial__opt"));
    var marker = dial.querySelector("[data-dial-marker]");
    var track = dial.querySelector(".dial__track");
    var current = opts.findIndex(function (o) { return o.getAttribute("aria-checked") === "true"; });
    var place = function (animate) {
      var x = track.clientWidth * current / (opts.length - 1);
      if (animate && N.motionOK()) M.animate(marker, { x: x }, { type: "spring", bounce: 0, visualDuration: 0.35 });
      else marker.style.transform = "translateX(" + x + "px)";
    };
    var choose = function (i, focus) {
      current = mod(i, opts.length);
      opts.forEach(function (o, k) {
        o.setAttribute("aria-checked", k === current ? "true" : "false");
        o.tabIndex = k === current ? 0 : -1;
      });
      if (focus) opts[current].focus();
      place(true);
    };
    opts.forEach(function (o, i) {
      o.addEventListener("click", function () { choose(i); });
      o.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); choose(i + 1, true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); choose(i - 1, true); }
      });
    });
    place(false);
    if ("ResizeObserver" in window) new ResizeObserver(function () { place(false); }).observe(track);
  }

  /* -------------------------------------------------------------------- pillar tabs */
  var pillarList = document.querySelector("[data-pillar-tablist]");
  if (pillarList) {
    var ptabs = Array.prototype.slice.call(pillarList.querySelectorAll('[role="tab"]'));
    var showPillar = function (i, focus) {
      ptabs.forEach(function (t, k) {
        var on = k === i;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        if (!panel) return;
        if (on && panel.hidden) {
          panel.hidden = false;
          if (N.motionOK()) M.animate(panel, { opacity: [0, 1] }, { duration: 0.35, ease: ease });
        } else if (!on) panel.hidden = true;
      });
      if (focus) ptabs[i].focus();
    };
    ptabs.forEach(function (t, i) {
      t.addEventListener("click", function () { showPillar(i); });
      t.addEventListener("keydown", function (e) {
        var n = ptabs.length, j = null;
        if (e.key === "ArrowRight") j = (i + 1) % n;
        else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = n - 1;
        if (j !== null) { e.preventDefault(); showPillar(j, true); }
      });
    });
  }
})();
