/* About page: team profiles fade in one after another as whole cards (no transform on portraits). */
(function () {
  "use strict";
  var N = window.Nohvum;
  var team = document.querySelector("[data-team]");
  if (!team || !N) return;
  var cards = Array.prototype.slice.call(team.children);
  if (!N.motionOK()) { cards.forEach(function (c) { c.style.opacity = "1"; }); return; }
  N.onceInView(team, function () {
    window.Motion.animate(cards, { opacity: [0, 1] }, { duration: 0.7, delay: window.Motion.stagger(0.18), ease: N.ease });
  }, 0.2);
})();
