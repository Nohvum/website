/* About page: team profiles fade in together as whole cards (no transform on portraits). */
(function () {
  "use strict";
  var N = window.Nohvum;
  var team = document.querySelector("[data-team]");
  if (!team || !N) return;
  var cards = Array.prototype.slice.call(team.children);
  if (!N.motionOK()) { cards.forEach(function (c) { c.style.opacity = "1"; }); return; }
  /* Start watching only once the page has loaded and painted. A reload that lands on the
     cards would otherwise finish the fade before anything is on screen. */
  function start() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        /* Already on screen at load (a reload keeps the scroll position): hold briefly so the fade is seen. */
        var r = team.getBoundingClientRect();
        var delay = r.top < window.innerHeight && r.bottom > 0 ? 0.35 : 0;
        N.onceInView(team, function () {
          window.Motion.animate(cards, { opacity: [0, 1] }, { duration: 0.7, delay: delay, ease: N.ease });
        }, 0.2);
      });
    });
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
