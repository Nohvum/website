/* Nohvum — shared behaviour: mobile nav, scroll reveals, Formspree forms.
   Motion (window.Motion, vendored UMD build) drives entrances; every effect is skipped when the
   visitor prefers reduced motion, and content is never hidden unless html.js-motion is set. */
(function () {
  "use strict";

  var root = document.documentElement;
  var M = window.Motion;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var small = window.matchMedia("(max-width: 760px)");

  window.Nohvum = window.Nohvum || {};
  var N = window.Nohvum;
  N.motionOK = function () { return !!M && !reduce.matches; };
  N.ease = [0.22, 1, 0.36, 1];

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    var header = document.querySelector(".site-header");
    var setOpen = function (open) {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 900px)").addEventListener("change", function () { setOpen(false); });
  }

  /* ---------- Reveals ---------- */
  function show(el) { el.style.opacity = "1"; el.style.transform = "none"; }

  function revealOne(el) {
    var y = small.matches ? 8 : 16;
    var delay = parseFloat(el.getAttribute("data-reveal-delay") || "0");
    M.animate(el, { opacity: [0, 1], y: [y, 0] }, { duration: small.matches ? 0.45 : 0.6, delay: delay, ease: N.ease });
  }

  function revealGroup(group) {
    var kids = Array.prototype.slice.call(group.children);
    var y = small.matches ? 8 : 16;
    var gap = parseFloat(group.getAttribute("data-reveal-group") || "0.09");
    M.animate(kids, { opacity: [0, 1], y: [y, 0] }, { duration: small.matches ? 0.45 : 0.6, delay: M.stagger(small.matches ? 0.05 : gap), ease: N.ease });
  }

  N.initReveals = function (scope) {
    scope = scope || document;
    var singles = scope.querySelectorAll("[data-reveal]");
    var groups = scope.querySelectorAll("[data-reveal-group]");
    if (!N.motionOK()) {
      root.classList.remove("js-motion");
      return;
    }
    singles.forEach(function (el) {
      M.inView(el, function () { revealOne(el); }, { amount: 0.2 });
    });
    groups.forEach(function (g) {
      M.inView(g, function () { revealGroup(g); }, { amount: 0.15 });
    });
  };

  /* Run a callback once when an element first enters view (or immediately without motion). */
  N.onceInView = function (el, fn, amount) {
    if (!el) return;
    if (!M) { fn(); return; }
    M.inView(el, function () { fn(); }, { amount: amount == null ? 0.35 : amount });
  };

  /* ---------- Inline SVG loader ----------
     <img data-inline-svg src="assets/svg/x.svg" alt="…"> is swapped for the SVG markup so its parts can
     be animated. The <img> stays if the fetch fails. Resolves with the <svg> (or the <img>). */
  N.inlineSvg = function (img) {
    if (img.tagName.toLowerCase() === "svg") return Promise.resolve(img);
    if (img._inline) return img._inline;
    img._inline = fetch(img.getAttribute("src"))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        var doc = new DOMParser().parseFromString(txt, "image/svg+xml");
        var svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") throw new Error("not svg");
        svg = document.importNode(svg, true);
        svg.querySelectorAll("script, foreignObject").forEach(function (n) { n.remove(); });
        var alt = img.getAttribute("alt");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("class", (img.getAttribute("class") || "") + " inline-svg");
        if (alt) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", alt); }
        else { svg.setAttribute("aria-hidden", "true"); }
        svg.setAttribute("focusable", "false");
        img.replaceWith(svg);
        return svg;
      })
      .catch(function () { return img; });
    return img._inline;
  };

  /* Elements drawn in the brand orange inside an inline SVG. */
  N.orangeParts = function (svg) {
    var out = [];
    svg.querySelectorAll("*").forEach(function (el) {
      var cs = getComputedStyle(el);
      var s = (el.getAttribute("stroke") || "") + " " + (el.getAttribute("fill") || "") + " " + cs.stroke + " " + cs.fill;
      if (/#f15a29|#ff5b12|#ff5429|#ff6b2a|#ff6427|rgb\(241, 90, 41\)|rgb\(255, 91, 18\)|rgb\(255, 84, 41\)|rgb\(255, 107, 42\)/i.test(s) && el.tagName.toLowerCase() !== "g" && el.tagName.toLowerCase() !== "stop") out.push(el);
    });
    return out;
  };

  if (!M) root.classList.remove("js-motion");
  reduce.addEventListener("change", function () {
    if (reduce.matches) {
      root.classList.remove("js-motion");
      document.querySelectorAll("[data-reveal], [data-reveal-group] > *").forEach(show);
    }
  });

  /* ---------- Forms (Formspree) ----------
     <form data-formspree data-subject="Nohvum contact request" action="https://formspree.io/f/…" method="POST">
     Fields carry data-label for error copy; [data-count="max"] textareas get a live counter. */
  function fieldOf(input) { return input.closest(".field"); }

  function setError(input, msg) {
    var f = fieldOf(input);
    if (!f) return;
    var slot = f.querySelector(".field__error");
    if (msg) {
      f.setAttribute("data-invalid", "");
      input.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = msg;
    } else {
      f.removeAttribute("data-invalid");
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  }

  function validate(input) {
    var label = input.getAttribute("data-label") || "This field";
    var v = (input.value || "").trim();
    if (input.required && !v) return label + " is required.";
    if (v && input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter an email address like name@company.com.";
    if (v && input.type === "url") {
      try { var u = new URL(v); if (!/^https?:$/.test(u.protocol)) throw 0; }
      catch (e) { return "Enter a full link, starting with https://"; }
    }
    if (input.maxLength > 0 && v.length > input.maxLength) return label + " is too long.";
    return "";
  }

  document.querySelectorAll("textarea[data-count]").forEach(function (ta) {
    var out = document.getElementById(ta.getAttribute("data-count"));
    if (!out) return;
    var max = ta.maxLength;
    var update = function () { out.textContent = ta.value.length + "/" + max; };
    ta.addEventListener("input", update);
    update();
  });

  document.querySelectorAll("form[data-formspree]").forEach(function (form) {
    var status = form.querySelector(".form__status");
    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit ? submit.querySelector(".btn__label") : null;
    var idle = submitLabel ? submitLabel.textContent : "";
    var inputs = Array.prototype.slice.call(form.querySelectorAll("input:not([type=hidden]):not([name=_gotcha]), textarea, select"));
    var sending = false;

    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { if (input.value) setError(input, validate(input)); });
      input.addEventListener("input", function () { if (fieldOf(input) && fieldOf(input).hasAttribute("data-invalid")) setError(input, validate(input)); });
    });

    function setStatus(state, msg) {
      if (!status) return;
      status.setAttribute("data-state", state);
      status.textContent = msg;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var firstBad = null;
      inputs.forEach(function (input) {
        var msg = validate(input);
        setError(input, msg);
        if (msg && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); setStatus("error", "Check the highlighted fields."); return; }

      var data = new FormData(form);
      if (data.get("_gotcha")) return;
      data.delete("_gotcha");
      var name = (data.get("name") || "").toString().trim();
      data.set("_subject", (form.getAttribute("data-subject") || "Nohvum enquiry") + (name ? ": " + name : ""));

      sending = true;
      if (submit) { submit.disabled = true; submit.setAttribute("aria-disabled", "true"); }
      if (submitLabel) submitLabel.textContent = "Sending…";
      setStatus("sending", "Sending…");

      fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
        })
        .then(function (r) {
          if (r.ok) {
            var done = form.parentElement.querySelector(".form__sent");
            if (done) {
              form.hidden = true;
              done.hidden = false;
              done.setAttribute("tabindex", "-1");
              done.focus();
            } else {
              setStatus("sent", "Thank you. We have received your message.");
              form.reset();
            }
            return;
          }
          var errs = (r.body && r.body.errors) || [];
          var placed = false;
          errs.forEach(function (er) {
            var el = er.field && form.querySelector('[name="' + er.field + '"]');
            if (el) { setError(el, er.message); placed = true; }
          });
          setStatus("error", placed ? "Check the highlighted fields." : "That didn't go through. Your details are still here, so you can try again, or email shrey@nohvum.com.");
        })
        .catch(function () {
          setStatus("error", "We couldn't reach the server. Your details are still here, so you can try again, or email shrey@nohvum.com.");
        })
        .then(function () {
          sending = false;
          if (submit) { submit.disabled = false; submit.removeAttribute("aria-disabled"); }
          if (submitLabel) submitLabel.textContent = idle;
        });
    });
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { N.initReveals(); });
  else N.initReveals();
})();
