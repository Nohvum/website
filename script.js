/* Nohvum coming-soon page: form phases and the hiring bubble.
   No framework. Everything below the CONFIG block is behaviour only. */
(function () {
  'use strict';

  /* ---- Placeholders to set before publishing (see README) ---- */
  var CONFIG = {
    // Where each form POSTs. Both go to the same Formspree form; the `form`
    // field and the `_subject` line tell contact requests and applications
    // apart in the inbox. Payload is JSON: {form, name, email, message} for
    // contact, {form, name, email, link, role} for hiring. Formspree uses the
    // `email` field as the Reply-To address. The same URL sits in each form's
    // `action` attribute in index.html as the no-JavaScript fallback.
    contactEndpoint: 'https://formspree.io/f/xjyvwaww',
    hiringEndpoint: 'https://formspree.io/f/xjyvwaww',
    // Privacy notice URL. Needed before collecting contact data.
    privacyUrl: '',
    // Show or hide the "We're Hiring!" bubble.
    showHiring: true,
    // Shown in the error line when a send fails.
    fallbackEmail: 'shrey@nohvum.com'
  };

  // Honeypot field name. `_gotcha` is also Formspree's own honeypot, so the
  // no-JavaScript path is covered server-side with the same input.
  var HONEYPOT = '_gotcha';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Phase switching: each [data-view] child of a [data-phase] root ---- */
  function setPhase(root, phase) {
    root.setAttribute('data-phase', phase);
    var views = root.querySelectorAll(':scope > [data-view]');
    for (var i = 0; i < views.length; i++) {
      views[i].hidden = views[i].getAttribute('data-view') !== phase;
    }
    var shown = root.querySelector(':scope > [data-view="' + phase + '"]');
    if (!shown) return;
    if (phase === 'sent') {
      var title = shown.querySelector('.sent__title');
      if (title) title.focus({ preventScroll: reduceMotion });
    } else if (phase === 'form') {
      var first = shown.querySelector('input, select, textarea');
      if (first) first.focus({ preventScroll: reduceMotion });
    }
  }

  /* ---- Validation (mirrors the browser's own rules, but styled) ---- */
  function validate(form) {
    var ok = true;
    var firstBad = null;
    var fields = form.querySelectorAll('.field');
    for (var i = 0; i < fields.length; i++) {
      var control = fields[i].querySelector('input, select, textarea');
      var valid = !control || control.checkValidity();
      fields[i].classList.toggle('is-invalid', !valid);
      if (!valid) { ok = false; if (!firstBad) firstBad = control; }
    }
    if (firstBad) firstBad.focus({ preventScroll: reduceMotion });
    return ok;
  }

  function showError(form, message) {
    var line = form.querySelector('[data-error]');
    if (!line) return;
    line.innerHTML = message;
    line.hidden = false;
  }
  function clearError(form) {
    var line = form.querySelector('[data-error]');
    if (line) { line.hidden = true; line.textContent = ''; }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- Sending ----
     Formspree answers 200 {next} on success. On failure it answers 4xx with
     {error, errors: [{code, field?, message}]}. Field errors (TYPE_EMAIL,
     REQUIRED_FIELD_EMPTY, ...) name the input; form errors (INACTIVE, BLOCKED,
     FORM_NOT_FOUND, ...) do not. */
  function send(endpoint, payload) {
    if (!endpoint) {
      console.warn('[nohvum] No endpoint configured for the "' + payload.form + '" form. Nothing was sent. Set CONFIG in script.js.');
      return Promise.resolve({ ok: true, skipped: true });
    }
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) return { ok: true };
      return res.json().catch(function () { return {}; }).then(function (body) {
        var err = new Error('HTTP ' + res.status + (body && body.error ? ': ' + body.error : ''));
        err.status = res.status;
        err.errors = (body && body.errors) || [];
        throw err;
      });
    });
  }

  /* Field-level rejections from the endpoint mark the field and say why.
     Anything else (network down, form inactive, blocked) falls back to the
     mailto line. */
  function describeFailure(form, err) {
    var errors = (err && err.errors) || [];
    var notes = [];
    for (var i = 0; i < errors.length; i++) {
      if (!errors[i].field) continue;
      var control = form.querySelector('[name="' + errors[i].field + '"]');
      var field = control && control.closest('.field');
      if (!field) continue;
      field.classList.add('is-invalid');
      var label = field.querySelector('.field__label');
      notes.push((label ? label.textContent + ': ' : '') + errors[i].message);
    }
    if (notes.length) return escapeHtml(notes.join('. ')) + '.';
    return 'Couldn’t send. Email <a href="mailto:' + CONFIG.fallbackEmail + '">' + CONFIG.fallbackEmail + '</a> instead.';
  }

  function subjectFor(payload) {
    var who = payload.name || payload.email || 'unknown';
    if (payload.form === 'hiring') {
      return 'Nohvum application: ' + who + (payload.role ? ' (' + payload.role + ')' : '');
    }
    return 'Nohvum contact request: ' + who;
  }

  function payloadFrom(form) {
    var data = new FormData(form);
    var out = { form: form.getAttribute('data-form') };
    data.forEach(function (value, key) {
      if (key === HONEYPOT) return; // honeypot, never sent
      // Selects send their visible label rather than the option value: the
      // payload lands in an inbox, and "Tech Lead" reads better than "tech-lead".
      var control = form.querySelector('[name="' + key + '"]');
      if (control && control.tagName === 'SELECT' && control.selectedIndex >= 0) {
        value = control.options[control.selectedIndex].text;
      }
      out[key] = typeof value === 'string' ? value.trim() : value;
    });
    out._subject = subjectFor(out);
    return out;
  }

  function wireForm(form, root, endpoint) {
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearError(form);
      if (!validate(form)) return;

      // Honeypot filled in: behave as if sent, send nothing.
      var trap = form.querySelector('input[name="' + HONEYPOT + '"]');
      if (trap && trap.value) { setPhase(root, 'sent'); return; }

      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      send(endpoint, payloadFrom(form)).then(function () {
        setPhase(root, 'sent');
      }).catch(function (err) {
        console.error('[nohvum] send failed', err);
        showError(form, describeFailure(form, err));
      }).then(function () {
        button.disabled = false;
        form.removeAttribute('aria-busy');
      });
    });

    // Drop the invalid mark as soon as the field is fixed.
    form.addEventListener('input', function (event) {
      var field = event.target.closest('.field');
      if (field && field.classList.contains('is-invalid') && event.target.checkValidity()) {
        field.classList.remove('is-invalid');
      }
    });
  }

  /* ---- Contact request (artboards 1a / 1b: opens in the "open" phase, no cancel) ---- */
  var request = document.getElementById('request');
  if (request) {
    wireForm(request.querySelector('form'), request, CONFIG.contactEndpoint);
  }

  /* ---- Hiring bubble: collapsed -> form -> sent ---- */
  var hiring = document.getElementById('hiring');
  if (hiring) {
    if (!CONFIG.showHiring) {
      hiring.hidden = true;
    } else {
      var hiringForm = hiring.querySelector('form');
      wireForm(hiringForm, hiring, CONFIG.hiringEndpoint);
      hiring.addEventListener('click', function (event) {
        var action = event.target.closest('[data-action]');
        if (!action) return;
        var name = action.getAttribute('data-action');
        if (name === 'open') setPhase(hiring, 'form');
        if (name === 'cancel') { clearError(hiringForm); setPhase(hiring, 'collapsed'); }
      });
      var role = hiring.querySelector('select[name="role"]');
      if (role) {
        role.addEventListener('change', function () {
          role.classList.toggle('is-placeholder', !role.value);
        });
      }
    }
  }

  /* ---- Privacy notice link ---- */
  var privacy = document.querySelector('[data-privacy-link]');
  if (privacy && CONFIG.privacyUrl) privacy.setAttribute('href', CONFIG.privacyUrl);
})();
