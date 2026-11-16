/* Service cubes (What We Do) — built the same way as the lifecycle ring (ring.js): a canvas scene drawn
   on Motion's frameloop, with HTML pills (the ARIA tablist) riding the projected geometry.
   Four wireframe cubes stand on a woven ribbon that runs the width of the page. The selected cube turns a
   quarter on a spring, lifts and glows orange, the ribbon warms around it, and once it settles a connector
   drops from it to the panel below.
   API: window.NohvumCubes.create(root, { initial, name(i), onChange(i) }) → { select(i, opts), active() } */
(function () {
  "use strict";

  function create(root, opts) {
    var Motion = window.Motion;
    if (!root || !Motion) return null;
    opts = opts || {};
    var animate = Motion.animate, motionValue = Motion.motionValue, frame = Motion.frame,
        hover = Motion.hover, press = Motion.press, stagger = Motion.stagger;

    var cv = root.querySelector(".cubes__canvas");
    var ctx = cv.getContext("2d");
    var anchors = Array.prototype.slice.call(root.querySelectorAll(".ring__anchor"));
    var btns = anchors.map(function (a) { return a.querySelector(".ring-pill"); });
    var live = root.querySelector(".cubes__live");
    var N = btns.length, TAU = Math.PI * 2, DEG = Math.PI / 180;

    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var tr = function (o) { return reduced ? { duration: 0 } : o; };
    var ROTATE = { type: "spring", visualDuration: 0.85, bounce: 0.12 };
    var FOCUS = { type: "spring", visualDuration: 0.7, bounce: 0 };
    var POP = { type: "spring", visualDuration: 0.3, bounce: 0.3 };

    // palette: the ring's (site tokens: ink #171717, orange #f15a29)
    var T = { strand: [118, 112, 106], hot: [241, 90, 41], white: [255, 255, 255], alpha: 0.3 };
    var rgba = function (c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; };
    var mix = function (g) {
      return [Math.round(lerp(T.strand[0], T.hot[0], g)), Math.round(lerp(T.strand[1], T.hot[1], g)), Math.round(lerp(T.strand[2], T.hot[2], g))];
    };

    // animated state
    var intro = motionValue(reduced ? 1 : 0);
    var heatV = btns.map(function () { return motionValue(0); });    // selected glow, per cube
    var liftV = btns.map(function () { return motionValue(0); });    // selected cube rises
    var spinV = btns.map(function () { return motionValue(0); });    // quarter turns
    var hoverAmt = btns.map(function () { return motionValue(0); });
    var spinTarget = btns.map(function () { return 0; });
    var active = null, hoverIdx = null, t = 0, visible = true;
    var link = motionValue(0), linkOn = false;

    var pState = btns.map(function () { return { h: false, p: false }; });
    function pillScale(i) {
      var s = pState[i];
      animate(btns[i], { scale: (active === i ? 1.08 : 1) * (s.h ? 1.04 : 1) * (s.p ? 0.95 : 1) }, tr(POP));
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

    /* ------------------------------------------------------------------ geometry
       World units are CSS pixels, centred on the canvas: x right, y up, z away from the viewer.
       The camera looks down at E degrees with a perspective (F), as the ring does. */
    var E = 28 * DEG, ce = Math.cos(E), se = Math.sin(E), F = 9000;   // long lens: the row spans the page, so cubes at the ends must not lean
    var W = 0, H = 0, dpr = 1, compact = false;
    var D = 0, C = 0, CX = 0, CY = 0, PILL_Y = 0, DROP = 40;
    var Q = [0, 0, 0, 0];
    function project(x, y, z) {
      var yy = y * ce + z * se, zz = -y * se + z * ce, p = F / (F + zz);
      Q[0] = CX + x * p; Q[1] = CY - yy * p; Q[2] = zz; Q[3] = p;
      return Q;
    }
    var cubeX = function (i) { return (i - (N - 1) / 2) * D; };

    function resize() {
      var r = root.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      compact = W < 720; root.classList.toggle("is-compact", compact);
      var edge = clamp(W * 0.022, 16, 32);
      D = (W - 2 * edge) / N;
      var pillH = compact ? 30 : 38;
      DROP = Math.max(compact ? 26 : 34, H * 0.09);
      // the cube's on-screen height is about 3.1 half-sides (vertical edges plus the lid's diagonal)
      C = Math.max(12, Math.min(D * (compact ? 0.25 : 0.21), (H - DROP - pillH - (compact ? 40 : 64)) / 3.25));
      CX = W / 2;
      CY = H - DROP - C * (ce + Math.SQRT2 * se) - 6;
      PILL_Y = Math.max(pillH / 2 + 4, CY - C * (ce + Math.SQRT2 * se) - (compact ? 22 : 38) - pillH / 2);
      if (!visible || reduced) draw();
    }

    // ribbon samples
    var M = 260, K = 16, CH = 4;
    var px = new Float32Array(M + 1), py = new Float32Array(M + 1), pz = new Float32Array(M + 1);

    function heatAtU(u) {
      var g = 0, d;
      for (var i = 0; i < N; i++) {
        var h = Math.max(heatV[i].get(), 0.6 * hoverAmt[i].get());
        if (h < 0.01) continue;
        d = u - i; g = Math.max(g, h * Math.exp(-d * d / 0.16));
      }
      if (!reduced && active === null) {   // before a selection: a soft pulse travels along the ribbon
        var pt = ((t * 0.45) % (N + 1.5)) - 0.75;
        d = u - pt; g = Math.max(g, 0.5 * Math.exp(-d * d / 0.2));
      }
      return g;
    }

    function glow(x, y, r, a) {
      var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(T.hot, a)); gr.addColorStop(1, rgba(T.hot, 0));
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // cube corners: bit 0 → x, bit 1 → y, bit 2 → z
    var EDGES = [];
    for (var a0 = 0; a0 < 8; a0++) for (var b0 = 0; b0 < 3; b0++) { var a1 = a0 | (1 << b0); if (a1 !== a0) EDGES.push([a0, a1]); }
    var VX = new Float32Array(8), VY = new Float32Array(8), VZ = new Float32Array(8), SX = new Float32Array(8), SY = new Float32Array(8), SZ = new Float32Array(8);
    var cubeScreen = btns.map(function () { return { x: 0, y: 0, top: 0, bottom: 0 }; });

    function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

    function drawCube(i, drawn) {
      var pop = clamp((drawn - 0.15 - i * 0.14) * 4, 0, 1);
      if (pop <= 0) return;
      var heat = heatV[i].get(), hv = hoverAmt[i].get(), lift = liftV[i].get();
      var g = Math.max(heat, 0.45 * hv);
      var col = mix(g);
      var ang = 45 * DEG + spinV[i].get(), ca = Math.cos(ang), sa = Math.sin(ang);
      var x0 = cubeX(i), y0 = lift * C * 0.22, c = C * lerp(0.92, 1, pop) * (1 + 0.05 * lift);
      var k, q;

      // floor: a dotted grid on the ground plane, fixed at 45°, fading outwards
      ctx.setLineDash([1.2, 4]); ctx.lineWidth = 1;
      var c45 = Math.cos(45 * DEG), s45 = c45, R = 2.2 * C;
      for (var gi = -2; gi <= 2; gi++) {
        var o = gi * C, fa = (0.26 - 0.06 * Math.abs(gi)) * pop;
        ctx.strokeStyle = rgba(T.strand, fa);
        for (var dir = 0; dir < 2; dir++) {
          var ax = dir ? o : -R, az = dir ? -R : o, bx = dir ? o : R, bz = dir ? R : o;
          q = project(x0 + ax * c45 - az * s45, -C, ax * s45 + az * c45); var qx = q[0], qy = q[1];
          q = project(x0 + bx * c45 - bz * s45, -C, bx * s45 + bz * c45);
          line(qx, qy, q[0], q[1]);
        }
      }
      ctx.setLineDash([]);

      // glow behind the selected (and hovered) cube
      q = project(x0, y0, 0);
      var ga = 0.2 * heat + 0.08 * hv;
      if (ga > 0.005) glow(q[0], q[1], Math.min(D * 0.62, H * 0.55), ga * pop);

      for (k = 0; k < 8; k++) {
        var lx = (k & 1 ? 1 : -1) * c, ly = (k & 2 ? 1 : -1) * c, lz = (k & 4 ? 1 : -1) * c;
        VX[k] = x0 + lx * ca - lz * sa; VY[k] = y0 + ly; VZ[k] = lx * sa + lz * ca;
        q = project(VX[k], VY[k], VZ[k]); SX[k] = q[0]; SY[k] = q[1]; SZ[k] = q[2];
      }
      // edges at the far bottom corner are hidden behind the faces; they fade out as the cube turns
      var zmin = Infinity, zmax = -Infinity;
      for (k = 0; k < 8; k += 1) if (!(k & 2)) { zmin = Math.min(zmin, SZ[k]); zmax = Math.max(zmax, SZ[k]); }
      var hidden = new Float32Array(8);
      for (k = 0; k < 8; k++) if (!(k & 2)) hidden[k] = smooth(0.72, 0.98, (SZ[k] - zmin) / Math.max(1, zmax - zmin));

      var baseA = (0.62 + 0.38 * g) * pop;
      ctx.lineWidth = 1.1 + 0.3 * g; ctx.lineCap = "round";
      EDGES.forEach(function (e) {
        var vis = 1 - Math.max(hidden[e[0]], hidden[e[1]]);
        if (vis < 0.02) return;
        var front = clamp((c * 1.8 - (SZ[e[0]] + SZ[e[1]]) / 2) / (c * 3.6), 0, 1);
        ctx.strokeStyle = rgba(col, baseA * vis * (0.7 + 0.3 * front));
        line(SX[e[0]], SY[e[0]], SX[e[1]], SY[e[1]]);
      });

      // side faces: a band at mid-height, the lower half layered; only faces that turn towards the viewer
      var faces = [[0, 4, -1, 0], [1, 5, 1, 0], [0, 1, 0, -1], [4, 5, 0, 1]];   // bottom corners (y = −1), local normal
      ctx.lineWidth = 0.9 + 0.2 * g;
      faces.forEach(function (f) {
        var nz = f[2] * sa + f[3] * ca;                     // normal's depth component after the turn
        var w = clamp(-nz * 1.6, 0, 1);
        if (w < 0.02) return;
        var A = f[0], B = f[1];
        for (var s = 0; s <= 7; s++) {
          var yy = y0 + (s === 0 ? 0 : -c + c * s / 8);
          var qa = project(VX[A], yy, VZ[A]); var ax2 = qa[0], ay2 = qa[1];
          var qb = project(VX[B], yy, VZ[B]);
          ctx.strokeStyle = rgba(col, baseA * w * (s === 0 ? 1 : 0.55 + 0.45 * g));
          line(ax2, ay2, qb[0], qb[1]);
        }
      });

      // lid: an inset square
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(col, baseA * 0.8);
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (p, n) {
        var lx2 = p[0] * c * 0.55, lz2 = p[1] * c * 0.55;
        var qq = project(x0 + lx2 * ca - lz2 * sa, y0 + c, lx2 * sa + lz2 * ca);
        if (n) ctx.lineTo(qq[0], qq[1]); else ctx.moveTo(qq[0], qq[1]);
      });
      ctx.closePath(); ctx.stroke();

      // stem from the lid's centre up to the pill, with the ring's node marker where it meets the cube
      q = project(x0, y0 + c, 0);
      var tx = q[0], ty = q[1], sc = q[3];
      var cs = cubeScreen[i];
      cs.x = tx; cs.y = ty; cs.top = Math.min(SY[0], SY[1], SY[2], SY[3], SY[4], SY[5], SY[6], SY[7]);
      cs.bottom = Math.max(SY[0], SY[1], SY[4], SY[5]);
      var pillBottom = PILL_Y + (compact ? 15 : 19);
      if (ty - pillBottom > 4) {
        ctx.strokeStyle = rgba(col, (0.5 + 0.5 * g) * pop); ctx.lineWidth = 1 + 0.25 * g;
        line(tx, pillBottom, tx, ty);
      }
      var rr = (compact ? 3.6 : 4.6) * clamp(sc, 0.85, 1.2) * pop, focus = Math.max(heat, 0.6 * hv);
      ctx.fillStyle = rgba(T.hot, 0.14 + 0.18 * focus); ctx.beginPath(); ctx.arc(tx, ty, rr + (3 + 4 * focus) * pop, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(T.white, 1); ctx.beginPath(); ctx.arc(tx, ty, rr, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(T.hot, 1); ctx.beginPath(); ctx.arc(tx, ty, rr * 0.5, 0, TAU); ctx.fill();

      var el = anchors[i];
      el.style.transform = "translate(" + tx.toFixed(1) + "px," + PILL_Y.toFixed(1) + "px) translate(-50%,-50%)";
      el.style.zIndex = active === i ? 200 : 100;
    }

    function draw() {
      if (W <= 0) return;
      var drawn = intro.get(), i, j, k;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // ribbon: K strands woven along the row, pinched at each cube, fading at the page edges
      var x0 = -W / 2, x1 = W / 2, rw = C * 0.6, heat = new Float32Array(M + 1);
      for (j = 0; j <= M; j++) heat[j] = heatAtU((x0 + (x1 - x0) * j / M - cubeX(0)) / D);
      ctx.lineCap = "round";
      for (k = 0; k < K; k++) {
        var sk = -1 + 2 * k / (K - 1);
        for (j = 0; j <= M; j++) {
          var x = x0 + (x1 - x0) * j / M, u = (x - cubeX(0)) / D;
          var pinch = Math.pow(Math.abs(Math.sin(Math.PI * u)), 0.85) * 0.96 + 0.04;
          var yc = -C * 0.42 + C * 0.2 * Math.sin(TAU * u * 0.5 + 0.6) + C * 0.03 * Math.sin(3 * u + t * 0.7);
          var psi = TAU * u * 0.5 + t * 0.22 + sk * 0.55, off = sk * rw * pinch;
          var q = project(x, yc + Math.sin(psi) * off * 0.55, Math.cos(psi) * off);
          px[j] = q[0]; py[j] = q[1]; pz[j] = q[2];
        }
        for (var c = 0; c < M; c += CH) {
          var mid = c + (CH >> 1), f = mid / M;
          var reveal = clamp((drawn - f) * 6, 0, 1);
          if (reveal <= 0) continue;
          var xm = px[mid], g = heat[mid];
          var um = (x0 + (x1 - x0) * f - cubeX(0)) / D, du = Math.abs(um - Math.round(clamp(um, 0, N - 1)));
          var edgeFade = smooth(0, W * 0.09, xm) * smooth(0, W * 0.09, W - xm);
          var inCube = lerp(0.25, 1, smooth(0.1, 0.32, du));
          var front = clamp((rw - pz[mid]) / (2 * rw), 0, 1);
          var a = Math.min(1, T.alpha * (0.45 + 0.8 * front) + g * 0.5) * reveal * edgeFade * inCube;
          if (a < 0.01) continue;
          ctx.strokeStyle = rgba(mix(g), a.toFixed(3));
          ctx.lineWidth = 0.55 + 0.55 * front;
          ctx.beginPath(); ctx.moveTo(px[c], py[c]);
          for (var n1 = 1; n1 <= CH && c + n1 <= M; n1++) ctx.lineTo(px[c + n1], py[c + n1]);
          ctx.stroke();
        }
      }

      for (i = 0; i < N; i++) drawCube(i, drawn);

      // connector: once the turn settles, a line drops from the selected cube to the bottom edge,
      // right above the panel it has opened
      if (active !== null) {
        var settled = Math.abs(spinTarget[active] - spinV[active].get()) < 0.06 && liftV[active].get() > 0.85;
        if (settled !== linkOn) { linkOn = settled; animate(link, settled ? 1 : 0, tr(settled ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0.12 })); }
        var lk = link.get();
        if (lk > 0.01) {
          var lx = cubeScreen[active].x, ly0 = cubeScreen[active].bottom + 8, ly1 = H - 4;
          var yEnd = ly0 + (ly1 - ly0) * lk;
          var lg = ctx.createLinearGradient(0, ly0, 0, ly1);
          lg.addColorStop(0, rgba(T.hot, 0.95)); lg.addColorStop(1, rgba(T.hot, 0.55));
          ctx.strokeStyle = lg; ctx.lineWidth = 1.25;
          line(lx, ly0, lx, yEnd);
          if (lk > 0.96) {
            ctx.fillStyle = rgba(T.hot, 1);
            ctx.beginPath(); ctx.arc(lx, ly1, 3.5 * (lk - 0.96) / 0.04, 0, TAU); ctx.fill();
          }
        }
      }
    }

    /* ------------------------------------------------------------------ selection */
    function select(i, o) {
      o = o || {};
      if (active === i && !o.force) return;
      var prev = active;
      active = i;
      for (var j = 0; j < N; j++) {
        var on = j === i;
        if (o.instant || reduced) { heatV[j].jump(on ? 1 : 0); liftV[j].jump(on ? 1 : 0); }
        else {
          animate(heatV[j], on ? 1 : 0, { duration: on ? 0.55 : 0.4, ease: [0.22, 1, 0.36, 1] });
          animate(liftV[j], on ? 1 : 0, FOCUS);
        }
        btns[j].setAttribute("aria-selected", on ? "true" : "false");
        btns[j].tabIndex = on ? 0 : -1;
      }
      if (!(o.instant || reduced)) { spinTarget[i] += Math.PI / 2; animate(spinV[i], spinTarget[i], ROTATE); }
      if (prev !== null) pillScale(prev);
      pillScale(i);
      if (live && opts.name) live.textContent = opts.name(i) + " selected";
      if (o.instant || reduced) { link.jump(1); linkOn = true; draw(); }
    }
    function userSelect(i) { i = (i + N) % N; select(i); if (opts.onChange) opts.onChange(i); }

    root.addEventListener("keydown", function (e) {
      if (!e.target.closest(".ring-pill")) return;
      var cur = active === null ? 0 : active, to = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") to = cur + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = cur - 1;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = N - 1;
      if (to === null) return;
      e.preventDefault();
      userSelect(to);
      btns[(to + N) % N].focus();
    });

    // pointer: hover a cube to warm it, click to select it
    function cubeAt(x, y) {
      for (var i = 0; i < N; i++) {
        var cs = cubeScreen[i];
        if (Math.abs(x - cs.x) < C * 1.5 && y > cs.top - 8 && y < cs.bottom + 8) return i;
      }
      return null;
    }
    cv.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var r = root.getBoundingClientRect(), n = cubeAt(e.clientX - r.left, e.clientY - r.top);
      root.style.cursor = n !== null ? "pointer" : "";
      if (n !== hoverIdx && btns.indexOf(document.activeElement) < 0) setHover(n);
    });
    cv.addEventListener("pointerleave", function () { root.style.cursor = ""; if (btns.indexOf(document.activeElement) < 0) setHover(null); });
    cv.addEventListener("click", function (e) {
      var r = root.getBoundingClientRect(), n = cubeAt(e.clientX - r.left, e.clientY - r.top);
      if (n !== null && n !== active) userSelect(n);
    });

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(root);
    else window.addEventListener("resize", resize);
    resize();

    // one render loop on Motion's frameloop; it idles while the scene is off screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    }
    frame.render(function (f) {
      if (!visible) return;
      t += reduced ? 0 : Math.min(0.05, f.delta / 1000);
      draw();
    }, true);

    // opening: the ribbon draws across the page while the cubes arrive in order, the pills pop in,
    // then the initial service turns, lifts and drops its connector
    var initial = opts.initial || 0;
    btns.forEach(function (b, j) { b.setAttribute("aria-selected", j === initial ? "true" : "false"); b.tabIndex = j === initial ? 0 : -1; });
    if (reduced) {
      select(initial, { instant: true, force: true });
    } else {
      btns.forEach(function (b) { b.style.opacity = "0"; });
      var started = false;
      var start = function () {
        if (started) return; started = true;
        animate(intro, 1, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
        animate(btns, { opacity: [0, 1], scale: [0.8, 1] }, { type: "spring", visualDuration: 0.45, bounce: 0.3, delay: stagger(0.12, { startDelay: 0.2 }) });
        setTimeout(function () { if (active === null) select(initial); }, 900);
      };
      if (window.Nohvum && window.Nohvum.onceInView) window.Nohvum.onceInView(root, start, 0.3);
      else start();
    }

    return {
      select: function (i, o) { select((i + N) % N, o); },
      active: function () { return active; }
    };
  }

  window.NohvumCubes = { create: create };
})();
