/* Framework flow diagrams (context engineering, certification, feedback loop and telemetry).
   The cards are ordinary HTML. This script draws the connectors as an SVG overlay measured from the cards'
   positions (so the wiring follows the layout at every width), then, while the diagram is in view, loops an
   orange signal along the connectors in order and lights each card as the signal reaches it.
   Two layouts per diagram: a row (wide screens) and a stacked column (narrow), detected from the cards. */
(function () {
  "use strict";
  var M = window.Motion;
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var COMET = 26;   // px length of the travelling signal

  function rel(el, root) {
    var r = el.getBoundingClientRect(), o = root.getBoundingClientRect();
    var l = r.left - o.left, t = r.top - o.top;
    return { l: l, t: t, r: l + r.width, b: t + r.height, w: r.width, h: r.height, cx: l + r.width / 2, cy: t + r.height / 2 };
  }
  function d(pts) { return "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L"); }
  function mk(parent, tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  }
  var same = function (a, b) { return Math.abs(a - b) < 3; };

  /* ----------------------------------------------------------------- knowledge model */
  function planKm(root, node) {
    var srcEls = Array.prototype.slice.call(root.querySelectorAll('[data-node="src"]'));
    var srcs = srcEls.map(function (e) { return rel(e, root); });
    var ten = rel(node("tenant"), root), K = rel(node("knowledge"), root), A = rel(node("agents"), root),
        G = rel(node("gate"), root), D = rel(node("delivered"), root), R = rel(node("return"), root);
    var wires = [], steps = [], t;
    var lit = function (n, at) { steps.push({ lit: n, at: at }); };
    var go = function (id, at, dur) { steps.push({ wire: id, at: at, dur: dur }); };

    srcEls.forEach(function (e) { lit(e, 0); });
    if (srcs.every(function (s) { return same(s.t, srcs[0].t); })) {
      // one row: each source drops to a shared bus, which feeds the tenant
      var busY = (srcs[0].b + ten.t) / 2, mid = ten.cx, last = srcs[srcs.length - 1];
      srcs.forEach(function (s, i) { wires.push({ id: "f" + i, pts: [[s.cx, s.b], [s.cx, busY]], soft: true }); go("f" + i, 0.2, 0.3); });
      wires.push({ id: "busL", pts: [[srcs[0].cx, busY], [mid, busY]], soft: true });
      wires.push({ id: "busR", pts: [[last.cx, busY], [mid, busY]], soft: true });
      wires.push({ id: "drop", pts: [[mid, busY], [mid, ten.t]], arrow: true });
      go("busL", 0.5, 0.7); go("busR", 0.5, 0.7); go("drop", 1.2, 0.3);
      t = 1.5;
    } else {
      var sb = Math.max.apply(null, srcs.map(function (s) { return s.b; }));
      wires.push({ id: "drop", pts: [[ten.cx, sb], [ten.cx, ten.t]], arrow: true });
      go("drop", 0.3, 0.5);
      t = 0.8;
    }

    lit("knowledge", t);
    if (same(K.t, D.t)) {
      var y = K.cy, retY = R.cy;
      wires.push({ id: "k2a", pts: [[K.r, y], [A.l, y]], arrow: true });
      wires.push({ id: "a2g", pts: [[A.r, y], [G.l, y]], arrow: true });
      wires.push({ id: "g2d", pts: [[G.r, y], [D.l, y]], arrow: true });
      wires.push({ id: "tA", pts: [[A.cx, A.b], [A.cx, retY]], soft: true });
      wires.push({ id: "tG", pts: [[G.cx, G.b], [G.cx, retY]], soft: true });
      wires.push({ id: "ret", pts: [[D.cx, D.b], [D.cx, retY], [K.cx, retY], [K.cx, K.b]], arrow: true });
      go("tA", t + 3.5, 0.3); go("tG", t + 3.5, 0.3);
    } else {
      var x = Math.max(K.r, A.r, G.r, D.r) + 28;
      wires.push({ id: "k2a", pts: [[K.cx, K.b], [A.cx, A.t]], arrow: true });
      wires.push({ id: "a2g", pts: [[A.cx, A.b], [G.cx, G.t]], arrow: true });
      wires.push({ id: "g2d", pts: [[G.cx, G.b], [D.cx, D.t]], arrow: true });
      wires.push({ id: "ret", pts: [[D.r, D.cy], [x, D.cy], [x, K.cy], [K.r, K.cy]], arrow: true });
    }
    go("k2a", t + 0.5, 0.45); lit("agents", t + 0.95);
    go("a2g", t + 1.4, 0.45); lit("gate", t + 1.85);           // the signal holds at the human gate
    go("g2d", t + 2.7, 0.45); lit("delivered", t + 3.15);
    go("ret", t + 3.6, 1.3); lit("knowledge", t + 4.9);
    return { wires: wires, steps: steps };
  }

  /* ----------------------------------------------------------------- certification */
  function planCert(root, node) {
    var R = rel(node("reference"), root), B = rel(node("blind"), root), S = rel(node("scoring"), root),
        L = rel(node("monitoring"), root), Gb = rel(root.querySelector("[data-gate-bar]"), root);
    var failLbl = root.querySelector('[data-loop="fail"]'), driftLbl = root.querySelector('[data-loop="drift"]');
    var wires = [], steps = [];
    var lit = function (n, at) { steps.push({ lit: n, at: at }); };
    var go = function (id, at, dur) { steps.push({ wire: id, at: at, dur: dur }); };

    if (same(R.t, L.t)) {
      var y = R.cy, bottom = Math.max(R.b, B.b, S.b, L.b, Gb.b), failY = bottom + 36, driftY = bottom + 92;
      wires.push({ id: "r2b", pts: [[R.r, y], [B.l, y]], arrow: true });
      wires.push({ id: "b2s", pts: [[B.r, y], [S.l, y]], arrow: true });
      wires.push({ id: "s2g", pts: [[S.r, y], [Gb.l - 17, y]], arrow: true });
      wires.push({ id: "g2l", pts: [[Gb.r + 17, y], [L.l, y]], arrow: true });
      wires.push({ id: "fail", pts: [[Gb.cx, Gb.b], [Gb.cx, failY], [B.cx, failY], [B.cx, B.b]], arrow: true });
      wires.push({ id: "drift", pts: [[L.cx, L.b], [L.cx, driftY], [R.cx, driftY], [R.cx, R.b]], arrow: true });
      place(failLbl, (B.cx + Gb.cx) / 2, failY);
      place(driftLbl, (R.cx + L.cx) / 2, driftY);
    } else {
      var right = Math.max(R.r, B.r, S.r, L.r, Gb.r), x1 = right + 22, x2 = right + 42;
      wires.push({ id: "r2b", pts: [[R.cx, R.b], [B.cx, B.t]], arrow: true });
      wires.push({ id: "b2s", pts: [[B.cx, B.b], [S.cx, S.t]], arrow: true });
      wires.push({ id: "s2g", pts: [[S.cx, S.b], [Gb.cx, Gb.t - 4]], arrow: true });
      wires.push({ id: "g2l", pts: [[Gb.cx, Gb.b], [L.cx, L.t]], arrow: true });
      wires.push({ id: "fail", pts: [[Gb.r, Gb.cy], [x1, Gb.cy], [x1, B.cy], [B.r, B.cy]], arrow: true });
      wires.push({ id: "drift", pts: [[L.r, L.cy], [x2, L.cy], [x2, R.cy], [R.r, R.cy]], arrow: true });
      place(failLbl, null); place(driftLbl, null);
    }
    // one pass fails and is remediated, the re-run passes into production, then drift sends it back
    lit("reference", 0);
    go("r2b", 0.45, 0.45); lit("blind", 0.9);
    go("b2s", 1.35, 0.45); lit("scoring", 1.8);
    go("s2g", 2.25, 0.4); steps.push({ gate: true, at: 2.65 });
    go("fail", 2.95, 1.3); lit("blind", 4.25);
    go("b2s", 4.7, 0.45); lit("scoring", 5.15);
    go("s2g", 5.6, 0.4); steps.push({ gate: true, at: 6.0 });
    go("g2l", 6.35, 0.45); lit("monitoring", 6.8);
    go("drift", 7.5, 1.6); lit("reference", 9.1);
    return { wires: wires, steps: steps };
  }
  /* ----------------------------------------------------------------- feedback loop */
  function planLoop(root, node) {
    var T = rel(node("telemetry"), root), A = rel(node("agents"), root), K = rel(node("knowledge"), root),
        Gb = rel(root.querySelector("[data-gate-bar]"), root);
    var wires = [], steps = [];
    var lit = function (n, at) { steps.push({ lit: n, at: at }); };
    var go = function (id, at, dur) { steps.push({ wire: id, at: at, dur: dur }); };
    if (same(K.t, A.t)) {
      var y = (K.t + Math.min(K.b, A.b)) / 2;
      wires.push({ id: "t2a", pts: [[T.r, T.cy], [A.cx, T.cy], [A.cx, A.t]], arrow: true });
      wires.push({ id: "a2g", pts: [[A.l, y], [Gb.r + 17, y]], arrow: true });
      wires.push({ id: "g2k", pts: [[Gb.l - 17, y], [K.r, y]], arrow: true });
      wires.push({ id: "k2t", pts: [[K.cx, K.t], [K.cx, T.cy], [T.l, T.cy]], arrow: true });
    } else {
      var x = Math.max(T.r, A.r, Gb.r, K.r) + 28;
      wires.push({ id: "t2a", pts: [[T.cx, T.b], [A.cx, A.t]], arrow: true });
      wires.push({ id: "a2g", pts: [[A.cx, A.b], [Gb.cx, Gb.t - 4]], arrow: true });
      wires.push({ id: "g2k", pts: [[Gb.cx, Gb.b], [K.cx, K.t]], arrow: true });
      wires.push({ id: "k2t", pts: [[K.r, K.cy], [x, K.cy], [x, T.cy], [T.r, T.cy]], arrow: true });
    }
    // telemetry → agents re-calibrated → held at the same certification gate → knowledge retained → telemetry
    lit("telemetry", 0);
    go("t2a", 0.45, 0.7); lit("agents", 1.15);
    go("a2g", 1.6, 0.45); steps.push({ gate: true, at: 2.05 });
    go("g2k", 2.9, 0.45); lit("knowledge", 3.35);
    go("k2t", 3.8, 0.8); lit("telemetry", 4.6);
    return { wires: wires, steps: steps };
  }

  function place(el, x, y) {
    if (!el) return;
    if (x === null) { el.style.left = el.style.top = ""; return; }
    el.style.left = x.toFixed(1) + "px"; el.style.top = y.toFixed(1) + "px";
  }

  /* ----------------------------------------------------------------- shared */
  function setup(root, plan) {
    var svg = mk(root, "svg", { class: "flowd__wires", "aria-hidden": "true", focusable: "false" });
    root.insertBefore(svg, root.firstChild);
    var node = function (n) { return root.querySelector('[data-node="' + n + '"]'); };
    var bar = root.querySelector("[data-gate-bar]");
    var anim = null, inView = false, model = null, wireById = {};

    // Each step gets its own pulse/glow element: a Motion sequence that animated one element twice would
    // tween it between the two uses (a signal sliding backwards, a card staying lit).
    var made = [];
    function stop() {
      if (anim) { try { anim.stop(); } catch (e) { /* done */ } anim = null; }
      made.forEach(function (n) { n.remove(); });
      made = [];
    }
    function start() {
      stop();
      if (!M || reduced.matches || !model) return;
      var seq = [];
      model.steps.forEach(function (s) {
        var n;
        if (s.wire) {
          var w = wireById[s.wire];
          if (!w) return;
          n = mk(svg, "path", { d: d(w.pts), class: "flowd__pulse", "stroke-dasharray": COMET + " " + (w.len + COMET), "stroke-dashoffset": COMET });
          seq.push([n, { strokeDashoffset: [COMET, -w.len] }, { at: s.at, duration: s.dur, ease: "linear" }]);
        } else if (s.gate) {
          if (!bar) return;
          n = document.createElement("span"); n.className = "dg-lit dg-lit--gate"; bar.appendChild(n);
          seq.push([n, { opacity: [0, 1, 0] }, { at: s.at, duration: 0.9, ease: "easeInOut" }]);
        } else {
          var el = typeof s.lit === "string" ? node(s.lit) : s.lit;
          if (!el) return;
          n = document.createElement("span"); n.className = "dg-lit"; el.appendChild(n);
          seq.push([n, { opacity: [0, 1, 0] }, { at: s.at, duration: 1.1, ease: "easeOut" }]);
        }
        n.setAttribute("aria-hidden", "true");
        made.push(n);
      });
      if (seq.length) anim = M.animate(seq, { repeat: Infinity, repeatDelay: 1.2 });
    }
    function build() {
      stop();
      var o = root.getBoundingClientRect();
      if (o.width < 10) return;   // in a hidden tab
      svg.innerHTML = "";
      svg.setAttribute("width", o.width); svg.setAttribute("height", o.height);
      svg.setAttribute("viewBox", "0 0 " + o.width + " " + o.height);
      model = plan(root, node);
      wireById = {};
      model.wires.forEach(function (w) {
        var p = mk(svg, "path", { d: d(w.pts), class: "flowd__wire" + (w.soft ? " flowd__wire--soft" : "") });
        w.len = p.getTotalLength();
        if (w.arrow) {
          var a = w.pts[w.pts.length - 2], b = w.pts[w.pts.length - 1];
          var dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
          dx /= m; dy /= m;
          var bx = b[0] - dx * 7, by = b[1] - dy * 7;
          mk(svg, "path", { class: "flowd__head", d: d([[bx - dy * 4, by + dx * 4], b, [bx + dy * 4, by - dx * 4]]) });
        }
        wireById[w.id] = w;
      });
      if (inView) start();
    }

    var queued = false;
    var rebuild = function () {
      if (queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; build(); });
    };
    if ("ResizeObserver" in window) new ResizeObserver(rebuild).observe(root);
    window.addEventListener("resize", rebuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    build();

    if (M && M.inView) {
      M.inView(root, function () {
        inView = true; start();
        return function () { inView = false; stop(); };
      }, { amount: "some", margin: "-20% 0px -20% 0px" }); // any part within the middle of the screen: a share of the diagram's own height fails when it is taller than the screen
    }
  }

  var km = document.querySelector('[data-flowd="km"]');
  if (km) setup(km, planKm);
  var cert = document.querySelector('[data-flowd="cert"]');
  if (cert) setup(cert, planCert);
  var loop = document.querySelector('[data-flowd="loop"]');
  if (loop) setup(loop, planLoop);
})();
