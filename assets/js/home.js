/* Homepage (and About's comparison): hero ring highlight, governed-loop sequence,
   approval-gate emphasis, principle icon details. Every effect plays once. */
(function () {
  "use strict";
  var N = window.Nohvum;
  var M = window.Motion;
  if (!N) return;
  var ease = N.ease;
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- Hero ring: an orange highlight walks Plan → … → Support → Plan, then settles ---------- */
  var ringImg = document.querySelector(".hero__ring");
  if (ringImg) {
    N.inlineSvg(ringImg).then(function (svg) {
      if (svg.tagName.toLowerCase() !== "svg" || !N.motionOK()) return;
      var order = ["plan", "build", "test", "deploy", "run", "support", "plan"];
      var milestones = svg.querySelector("#milestones");
      if (!milestones) return;
      var halo = document.createElementNS(SVGNS, "circle");
      halo.setAttribute("class", "halo");
      halo.setAttribute("r", "16");
      var first = svg.querySelector("#node-plan");
      halo.setAttribute("cx", first.getAttribute("cx"));
      halo.setAttribute("cy", first.getAttribute("cy"));
      milestones.parentNode.insertBefore(halo, milestones);

      var seq = [];
      var step = 0.62;
      order.forEach(function (id, i) {
        var node = svg.querySelector("#node-" + id);
        var label = svg.querySelector("#label-" + id + " text");
        if (!node) return;
        var at = 0.9 + i * step;
        node.style.transformBox = "fill-box";
        node.style.transformOrigin = "center";
        if (i > 0) {
          seq.push([halo, { cx: node.getAttribute("cx"), cy: node.getAttribute("cy") }, { at: at - 0.38, duration: 0.38, ease: [0.45, 0, 0.2, 1] }]);
        }
        seq.push([node, { scale: [1, 1.3, 1] }, { at: at, duration: 0.5, ease: "easeOut" }]);
        if (label) seq.push([label, { fill: ["#434640", "#d9401a", "#434640"] }, { at: at, duration: 0.6 }]);
      });
      seq.unshift([halo, { opacity: [0, 0.22] }, { at: 0.75, duration: 0.3 }]);
      seq.push([halo, { opacity: 0 }, { at: 0.9 + (order.length - 1) * step + 0.4, duration: 0.5 }]);
      M.animate(seq);
    });
  }

  /* ---------- Governed loop: model → stages with their approval checks → return path ---------- */
  var loop = document.querySelector("[data-loop]");
  if (loop) {
    var model = loop.querySelector("[data-loop-model]");
    var stages = loop.querySelectorAll("[data-loop-stage]");
    var gates = loop.querySelectorAll("[data-loop-gate]");
    var ret = loop.querySelector("[data-loop-return]");
    var finalGate = loop.querySelector("[data-loop-gate-final]");

    var trace = null;
    if (ret) {
      trace = document.createElementNS(SVGNS, "svg");
      trace.setAttribute("class", "loop__return-trace");
      trace.setAttribute("viewBox", "0 0 100 100");
      trace.setAttribute("preserveAspectRatio", "none");
      trace.setAttribute("aria-hidden", "true");
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", "M100 0V100H0V0");
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "#f15a29");
      p.setAttribute("stroke-width", "1.5");
      p.setAttribute("vector-effect", "non-scaling-stroke");
      p.setAttribute("pathLength", "1");
      p.setAttribute("stroke-dasharray", "1 1");
      p.setAttribute("stroke-dashoffset", "1");
      trace.appendChild(p);
      trace.style.opacity = "0";
      ret.appendChild(trace);
    }

    var lit = function (el, on) { if (el) el.classList.toggle("is-lit", on); };

    var play = function () {
      if (!N.motionOK() || !window.matchMedia("(min-width: 1100px)").matches) return;
      var t = 0;
      var timeline = [];
      timeline.push([0, function () { lit(model, true); }]);
      t = 450;
      for (var i = 0; i < stages.length; i++) {
        (function (i) {
          timeline.push([t, function () { lit(stages[i], true); if (i > 0) lit(stages[i - 1], false); if (i === 0) lit(model, false); }]);
          if (gates[i]) timeline.push([t + 260, function () { lit(gates[i], true); }]);
        })(i);
        t += 420;
      }
      timeline.push([t, function () {
        lit(stages[stages.length - 1], false);
        if (trace) {
          trace.style.opacity = "1";
          M.animate(trace.firstChild, { strokeDashoffset: [1, 0] }, { duration: 1.1, ease: [0.45, 0, 0.2, 1] });
        }
      }]);
      timeline.push([t + 550, function () { lit(finalGate, true); }]);
      timeline.push([t + 1400, function () {
        if (trace) M.animate(trace, { opacity: [1, 0] }, { duration: 0.6 });
        gates.forEach(function (g) { lit(g, false); });
        lit(finalGate, false);
      }]);
      timeline.forEach(function (e) { setTimeout(e[1], e[0]); });
    };
    N.onceInView(loop, play, 0.45);
  }

  /* ---------- Comparison: brief emphasis on the approval gate ---------- */
  document.querySelectorAll("[data-compare]").forEach(function (cmp) {
    var dot = cmp.querySelector("[data-compare-dot]");
    var label = cmp.querySelector("[data-compare-gate-label]");
    if (!dot) return;
    N.onceInView(cmp, function () {
      if (!N.motionOK()) return;
      var ring = document.createElement("span");
      ring.className = "gate-stack__ring";
      ring.setAttribute("aria-hidden", "true");
      dot.parentNode.appendChild(ring);
      M.animate([
        [dot, { scale: [1, 1.45, 1] }, { at: 0.5, duration: 0.7, ease: "easeInOut" }],
        [ring, { opacity: [0.5, 0], scale: [1, 3.2] }, { at: 0.5, duration: 1.1, ease: ease }],
        label ? [label, { color: ["#171717", "#d9401a", "#171717"] }, { at: 0.5, duration: 1.4 }] : [dot, {}, { at: 0.5 }]
      ]).then(function () { ring.remove(); });
    }, 0.5);
  });

  /* ---------- Principles: animate each icon's orange detail once ---------- */
  var principles = document.querySelector(".principles");
  if (principles) {
    var icons = Array.prototype.slice.call(principles.querySelectorAll("img[data-inline-svg]"));
    Promise.all(icons.map(N.inlineSvg)).then(function (svgs) {
      if (!N.motionOK()) return;
      var parts = svgs.map(function (s) { return s.tagName.toLowerCase() === "svg" ? N.orangeParts(s) : []; });
      parts.forEach(function (list) {
        list.forEach(function (el) { el.style.opacity = "0"; el.style.transformBox = "fill-box"; el.style.transformOrigin = "center"; });
      });
      N.onceInView(principles, function () {
        parts.forEach(function (list, i) {
          list.forEach(function (el) {
            var tag = el.tagName.toLowerCase();
            var delay = 0.55 + i * 0.18;
            if (tag === "path" || tag === "polyline" || tag === "line") {
              el.setAttribute("pathLength", "1");
              el.style.strokeDasharray = "1 1";
              M.animate(el, { opacity: [0, 1], strokeDashoffset: [1, 0] }, { delay: delay, duration: 0.6, ease: ease });
            } else {
              M.animate(el, { opacity: [0, 1], scale: [0.4, 1] }, { delay: delay + 0.2, duration: 0.4, ease: ease });
            }
          });
        });
      }, 0.3);
    });
  }
})();
