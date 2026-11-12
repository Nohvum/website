/* Careers page: each "Apply" link jumps to the form (#apply) and pre-fills "Role of interest".
   Without JS the links still jump to the form. */
(function () {
  "use strict";
  var role = document.getElementById("ap-role");
  var name = document.getElementById("ap-name");
  if (!role) return;
  document.querySelectorAll("[data-apply-role]").forEach(function (link) {
    link.addEventListener("click", function () {
      role.value = link.getAttribute("data-apply-role");
      role.dispatchEvent(new Event("input", { bubbles: true }));
      // Let the anchor jump happen, then move focus into the form without scrolling again.
      setTimeout(function () {
        var target = name && !name.value ? name : role;
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      }, 0);
    });
  });
})();
