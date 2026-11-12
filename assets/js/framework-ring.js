/* Framework lifecycle ring — ported from the "Delivery Loop" reference.
   A 3D ribbon loop of six stages is drawn on canvas; HTML pills (an ARIA tablist) ride the nodes.
   The selected stage always settles front-centre, and a connector drops from it to the hero's bottom
   edge, where the stage detail section below takes over (no card: the content lives on the page).
   API: window.NohvumRing.create(root, { initial, name(i), onChange(i) }) → { select(i, opts), active() } */
(function () {
  "use strict";
  var Motion = window.Motion;

  function create(root, opts) {
    if (!root || !Motion) return null;
    var animate = Motion.animate, motionValue = Motion.motionValue, frame = Motion.frame,
        hover = Motion.hover, press = Motion.press, stagger = Motion.stagger;

    var cv = root.querySelector(".ring__canvas");
    var ctx = cv.getContext("2d");
    var anchors = Array.prototype.slice.call(root.querySelectorAll(".ring__anchor"));
    var btns = anchors.map(function (a) { return a.querySelector(".ring-pill"); });
      var live = root.querySelector(".ring__live");
    var N = btns.length, TAU = Math.PI * 2;

    var nodeTheta = function (i) { return (120 - 60 * i) * Math.PI / 180; };   // Plan top-left, then clockwise
    var TH0 = nodeTheta(0);
    var wrap = function (a) { return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var tr = function (o) { return reduced ? { duration: 0 } : o; };
    var ROTATE = { type: "spring", visualDuration: 0.85, bounce: 0.12 };
    var FOCUS = { type: "spring", visualDuration: 0.7, bounce: 0 };
    var POP = { type: "spring", visualDuration: 0.3, bounce: 0.3 };
    var pad2 = function (n) { return String(n).padStart(2, "0"); };

    // palette (site tokens: ink #171717, orange #f15a29)
    var T = { strand: [118, 112, 106], hot: [241, 90, 41], ring: [255, 255, 255], alpha: 0.3 };

    // animated state
    var yaw = motionValue(reduced ? 0 : 0.9);
    var sel = motionValue(0);
    var intro = motionValue(reduced ? 1 : 0);
    var hoverAmt = btns.map(function () { return motionValue(0); });
    var yawTarget = 0, active = null, hoverIdx = null, t = 0;
    var dragging = false, visible = true;
    var link = motionValue(0), linkOn = false;   // connector from the front stage down to the content

    var pState = btns.map(function () { return { h: false, p: false }; });
    function pillScale(i) {
      var s = pState[i];
      var target = (active === i ? 1.08 : 1) * (s.h ? 1.04 : 1) * (s.p ? 0.95 : 1);
      animate(btns[i], { scale: target }, tr(POP));
    }
    function setHover(i) {
      hoverIdx = i;
      for (var j = 0; j < N; j++) animate(hoverAmt[j], j === i ? 1 : 0, tr({ duration: 0.3, ease: "easeOut" }));
    }
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { if (active !== i) userSelect(i); });
      hover(b, function () {
        pState[i].h = true; setHover(i); pillScale(i);
        return function () { pState[i].h = false; if (hoverIdx === i) setHover(null); pillScale(i); };
      });
      press(b, function () {
        pState[i].p = true; pillScale(i);
        return function () { pState[i].p = false; pillScale(i); };
      });
      b.addEventListener("focus", function () { setHover(i); });
      b.addEventListener("blur", function () { if (hoverIdx === i) setHover(null); });
    });

    // geometry
    var F = 5, K = 22, M = 288, CH = 4;
    var W = 0, H = 0, dpr = 1, compact = false, DROP = 84;
    var G = { nx: new Float32Array(N), ny: new Float32Array(N) };
    function params(s) {
      var E = lerp(23, 15, s) * Math.PI / 180;
      var baseS = Math.max(90, Math.min((W / 2 - (compact ? 30 : 104)) / 1.08, H * 0.82, 440));
      return { ce: Math.cos(E), se: Math.sin(E), S: baseS * lerp(1, 1.08, s), wave: 0.14 * s, rw: lerp(0.085, 0.125, s) };
    }
    var Q = [0, 0, 0, 0];
    function project(x, y, z, P, cx, cy) {
      var yy = y * P.ce + z * P.se, zz = -y * P.se + z * P.ce, p = F / (F + zz);
      Q[0] = cx + x * p * P.S; Q[1] = cy - yy * p * P.S; Q[2] = zz; Q[3] = p;
      return Q;
    }
    function centerY(th, P, yw) { return P.wave * Math.cos(2 * (th + yw)) + 0.016 * Math.sin(3 * th + t * 0.7); }
    function selectedCy() {
      var P = params(1);
      var front = project(0, -P.wave, -1, P, 0, 0)[1];
      return clamp(H - DROP - front, 0.18 * P.S + 56, H * 0.5);
    }

    function resize() {
      var r = root.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      compact = W < 620; root.classList.toggle("is-compact", compact);
      if (!visible || reduced) draw();
    }

    // draw buffers
    var px = new Float32Array(M), py = new Float32Array(M), pz = new Float32Array(M);
    var thS = new Float32Array(M), pinch = new Float32Array(M), heat = new Float32Array(M), hv = new Float32Array(N);
    for (var j0 = 0; j0 < M; j0++) {
      thS[j0] = TH0 + j0 / M * TAU;
      pinch[j0] = Math.pow(Math.abs(Math.sin(3 * (thS[j0] - TH0))), 0.85) * 0.96 + 0.04;
    }

    function heatAt(th, s) {
      var g = 0, d;
      if (active !== null) { d = wrap(th - nodeTheta(active)); g = s * Math.exp(-d * d / 0.2312); }
      for (var i = 0; i < N; i++) {
        if (hv[i] < 0.01 || i === active) continue;
        d = wrap(th - nodeTheta(i)); g = Math.max(g, 0.6 * hv[i] * Math.exp(-d * d / 0.1568));
      }
      if (!reduced) {
        var pt = TH0 - t * 0.35, amp = 0.55 * (1 - s);
        d = wrap(th - pt); g = Math.max(g, amp * Math.exp(-d * d / 0.405));
        d = wrap(th - pt - Math.PI); g = Math.max(g, amp * Math.exp(-d * d / 0.405));
      }
      return g;
    }

    function glow(x, y, r, a) {
      var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(" + T.hot + "," + a + ")"); gr.addColorStop(1, "rgba(" + T.hot + ",0)");
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function draw() {
      if (W <= 0) return;
      var s = sel.get(), yw = yaw.get(), drawn = intro.get();
      var i, th, te, q;
      for (i = 0; i < N; i++) hv[i] = hoverAmt[i].get();
      var P = params(s);
      var cx = W / 2, cy = lerp(H * 0.5, selectedCy(), s);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // node glows first, so they sit under the strands
      for (i = 0; i < N; i++) {
        th = nodeTheta(i); te = th + yw;
        q = project(Math.cos(te), centerY(th, P, yw), Math.sin(te), P, cx, cy);
        G.nx[i] = q[0]; G.ny[i] = q[1];
        var ga = (active === i ? 0.22 * s : 0) + 0.12 * hv[i];
        if (ga > 0.005) glow(q[0], q[1], Math.min(190, H - q[1] - 6, W * 0.42) * q[3], ga);
      }

      for (var jj = 0; jj < M; jj++) heat[jj] = heatAt(thS[jj], s);
      ctx.lineCap = "round";
      for (var k = 0; k < K; k++) {
        var sk = -1 + 2 * k / (K - 1);
        for (var j = 0; j < M; j++) {
          th = thS[j]; te = th + yw;
          var ct = Math.cos(te), st = Math.sin(te);
          var psi = 2 * th + t * 0.22 + sk * 0.55, cp = Math.cos(psi), sp = Math.sin(psi);
          var off = sk * P.rw * pinch[j];
          q = project(ct + ct * cp * off, centerY(th, P, yw) + sp * off, st + st * cp * off, P, cx, cy);
          px[j] = q[0]; py[j] = q[1]; pz[j] = q[2];
        }
        for (var c = 0; c < M; c += CH) {
          var f = (M - c - CH) / M;
          var reveal = clamp((drawn - f) * 24, 0, 1);
          if (reveal <= 0) continue;
          var mid = c + (CH >> 1), g = heat[mid];
          var front = clamp((1 - pz[mid]) / 2, 0, 1);
          var r = Math.round(lerp(T.strand[0], T.hot[0], g)), gg = Math.round(lerp(T.strand[1], T.hot[1], g)), b = Math.round(lerp(T.strand[2], T.hot[2], g));
          var a = Math.min(1, T.alpha * (0.4 + 0.8 * front) + g * 0.5) * reveal;
          ctx.strokeStyle = "rgba(" + r + "," + gg + "," + b + "," + a + ")";
          ctx.lineWidth = 0.55 + 0.55 * front;
          ctx.beginPath(); ctx.moveTo(px[c], py[c]);
          for (var n1 = 1; n1 <= CH; n1++) { var n = (c + n1) % M; ctx.lineTo(px[n], py[n]); }
          ctx.stroke();
        }
      }

      // nodes and pill anchors
      for (i = 0; i < N; i++) {
        th = nodeTheta(i); te = th + yw;
        q = project(Math.cos(te), centerY(th, P, yw), Math.sin(te), P, cx, cy);
        var pop = clamp((drawn - i / N) * 10, 0, 1);
        var isA = active === i, focus = isA ? s : 0.6 * hv[i];
        var rr = 5.2 * clamp(q[3], 0.8, 1.3) * pop;
        if (rr > 0.2) {
          ctx.fillStyle = "rgba(" + T.hot + "," + (0.14 + 0.18 * focus) + ")";
          ctx.beginPath(); ctx.arc(q[0], q[1], rr + (3 + 4 * focus) * pop, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgb(" + T.ring + ")"; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgb(" + T.hot + ")"; ctx.beginPath(); ctx.arc(q[0], q[1], rr * 0.5, 0, TAU); ctx.fill();
        }
        var fr = -Math.sin(te), fz = clamp((1 - q[2]) / 2, 0, 1);
        var below = smooth(0.25, 0.65, fr) * (1 - (isA ? s : 0));
        var dy = lerp(-32, 32, below) * clamp(q[3], 0.85, 1.15);
        var sc = clamp(0.78 + 0.2 * q[3], 0.85, 1.06);
        var el = anchors[i];
        el.style.transform = "translate(" + q[0].toFixed(1) + "px," + (q[1] + dy).toFixed(1) + "px) translate(-50%,-50%) scale(" + sc.toFixed(3) + ")";
        el.style.zIndex = isA ? 200 : Math.round(100 - q[2] * 50);
        el.style.opacity = isA ? 1 : (0.62 + 0.38 * fz).toFixed(3);
      }

      // connector: once the turn settles, a line drops from the front stage to the hero's bottom edge,
      // right above the detail section it has opened
      if (active !== null) {
        var settled = !dragging && s > 0.75 && Math.abs(wrap(yawTarget - yw)) < 0.12;
        if (settled !== linkOn) { linkOn = settled; animate(link, settled ? 1 : 0, tr(settled ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0.12 })); }
        var lk = link.get();
        if (lk > 0.01) {
          var x0 = G.nx[active], y0 = G.ny[active] + 9, y1 = H - 5;
          var yEnd = y0 + (y1 - y0) * lk;
          var lg = ctx.createLinearGradient(0, y0, 0, y1);
          lg.addColorStop(0, "rgba(" + T.hot + ",0.95)"); lg.addColorStop(1, "rgba(" + T.hot + ",0.55)");
          ctx.strokeStyle = lg; ctx.lineWidth = 1.25;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, yEnd); ctx.stroke();
          if (lk > 0.96) {
            ctx.fillStyle = "rgb(" + T.hot + ")";
            ctx.beginPath(); ctx.arc(x0, y1, 3.5 * (lk - 0.96) / 0.04, 0, TAU); ctx.fill();
          }
        }
      }
    }

    // selection: the chosen stage turns to the front (−90° on the ring) and the ring flattens into focus
    function select(i, o) {
      o = o || {};
      if (active === i && !o.force) return;
      var prev = active;
      active = i;
      yawTarget = yaw.get() + wrap((-Math.PI / 2 - nodeTheta(i)) - yaw.get());
      if (o.instant || reduced) { yaw.jump(yawTarget); sel.jump(1); }
      else { animate(yaw, yawTarget, ROTATE); animate(sel, 1, FOCUS); }
      btns.forEach(function (b, j) {
        b.setAttribute("aria-selected", j === i ? "true" : "false");
        b.tabIndex = j === i ? 0 : -1;
      });
      if (prev !== null) pillScale(prev);
      pillScale(i);
      if (live) live.textContent = opts.name(i) + " stage selected";
      if (o.instant || reduced) { link.jump(1); linkOn = true; draw(); }
    }
    function userSelect(i) { i = (i + N) % N; select(i); if (opts.onChange) opts.onChange(i); }

    root.addEventListener("keydown", function (e) {
      if (!e.target.closest(".ring-pill")) return;
      var to = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") to = active + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = active - 1;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = N - 1;
      if (to === null) return;
      e.preventDefault();
      userSelect(to);
      btns[(to + N) % N].focus();
    });

    // pointer: drag to spin (release snaps to the nearest stage), click a node to select it
    function nodeAt(x, y) {
      var best = null, bd = 18;
      for (var i = 0; i < N; i++) { var d = Math.hypot(G.nx[i] - x, G.ny[i] - y); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    var down = null;
    root.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".ring-pill")) return;
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, r: root.getBoundingClientRect(), moved: false, id: e.pointerId };
    });
    root.addEventListener("pointermove", function (e) {
      if (!down) {
        if (e.target === cv && e.pointerType === "mouse") {
          var r = root.getBoundingClientRect(), n = nodeAt(e.clientX - r.left, e.clientY - r.top);
          root.style.cursor = n !== null ? "pointer" : "";
          if (n !== hoverIdx && btns.indexOf(document.activeElement) < 0) setHover(n);
        }
        return;
      }
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
        down.moved = true; dragging = true; root.classList.add("is-dragging");
        yaw.stop();
        try { root.setPointerCapture(down.id); } catch (_) {}
      }
      if (down.moved) { yaw.set(yaw.get() + (e.clientX - down.lx) * 0.0065); down.lx = e.clientX; }
    });
    function endPointer(e) {
      if (!down) return;
      if (!down.moved) {
        var n = nodeAt(e.clientX - down.r.left, e.clientY - down.r.top);
        if (n !== null && n !== active) userSelect(n);
      } else {
        dragging = false; root.classList.remove("is-dragging");
        var v = yaw.getVelocity();
        var landing = yaw.get() + v * 0.3, best = 0, bd = Infinity;
        for (var i = 0; i < N; i++) { var d = Math.abs(wrap(-Math.PI / 2 - nodeTheta(i) - landing)); if (d < bd) { bd = d; best = i; } }
        if (best === active) { yawTarget = yaw.get() + wrap((-Math.PI / 2 - nodeTheta(best)) - yaw.get()); animate(yaw, yawTarget, tr(ROTATE)); }
        else userSelect(best);
      }
      down = null;
    }
    root.addEventListener("pointerup", endPointer);
    root.addEventListener("pointercancel", function (e) { if (down) { down.moved = true; endPointer(e); } });

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(root);
    else window.addEventListener("resize", resize);
    resize();

    // one render loop on Motion's frameloop; it idles while the ring is off screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    }
    frame.render(function (f) {
      if (!visible) return;
      if (!reduced) t += Math.min(0.05, f.delta / 1000);
      draw();
    }, true);

    // opening: the ribbon draws itself around the loop while it settles, labels arrive in order,
    // then the initial stage turns to the front and the connector drops to its content
    var initial = opts.initial || 0;
    if (reduced) {
      select(initial, { instant: true, force: true });
    } else {
      btns.forEach(function (b) { b.style.opacity = "0"; });
      var started = false;
      var start = function () {
        if (started) return; started = true;
        animate(yaw, 0, { type: "spring", visualDuration: 1.6, bounce: 0 });
        animate(intro, 1, { duration: 1.5, ease: [0.22, 1, 0.36, 1] });
        animate(btns, { opacity: [0, 1], scale: [0.8, 1] }, { type: "spring", visualDuration: 0.45, bounce: 0.3, delay: stagger(0.12, { startDelay: 0.1 }) });
        setTimeout(function () { if (active === null) select(initial); }, 900);
      };
      if (window.Nohvum && window.Nohvum.onceInView) window.Nohvum.onceInView(root, start, 0.3);
      else start();
      // keep the tablist's state right before the intro reaches it
      btns.forEach(function (b, j) { b.setAttribute("aria-selected", j === initial ? "true" : "false"); b.tabIndex = j === initial ? 0 : -1; });
    }

    return {
      select: function (i, o) { select((i + N) % N, o); },
      active: function () { return active; }
    };
  }

  window.NohvumRing = { create: create };
})();
