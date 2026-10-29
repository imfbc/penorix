/* Navigation, language toggle, reveal and in-view behavior. No scroll listeners: IntersectionObserver only. */
(function () {
  var cfg = window.PENORIX_CONFIG || {};
  var I = window.PenorixI18n;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(function () {
    I.apply();

    // Language toggle
    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      b.addEventListener("click", function () { I.set(I.get() === "en" ? "ko" : "en"); });
    });

    // Mobile menu
    var toggle = document.querySelector(".menu-toggle");
    var body = document.body;
    function setMenu(open) {
      body.classList.toggle("menu-open", open);
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
    }
    if (toggle) {
      toggle.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
      document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    }

    // Header turns solid once the top sentinel leaves the viewport
    var header = document.querySelector(".site-header");
    var sentinel = document.getElementById("top-sentinel");
    if (header && sentinel && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        header.classList.toggle("is-solid", !entries[0].isIntersecting);
      }).observe(sentinel);
    }

    // Reveal on enter
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reduced) {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { ro.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }

    // Precision: highlight the point nearest the middle of the viewport
    var points = document.querySelectorAll(".point");
    if (points.length && "IntersectionObserver" in window) {
      var po = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle("is-active", e.isIntersecting); });
      }, { rootMargin: "-40% 0px -40% 0px" });
      points.forEach(function (p) { po.observe(p); });
    }

    // Film plays only while visible, and not at all for reduced motion
    document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
      if (reduced) { v.removeAttribute("autoplay"); v.pause(); return; }
      if (!("IntersectionObserver" in window)) { v.play().catch(function () {}); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); });
      }, { threshold: 0.25 }).observe(v);
    });

    // Marketplace and contact links from config
    document.querySelectorAll("[data-link]").forEach(function (a) {
      var url = cfg[a.getAttribute("data-link") + "Url"];
      if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; a.removeAttribute("aria-disabled"); }
      else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); }
    });
    document.querySelectorAll("[data-email]").forEach(function (a) {
      var key = a.getAttribute("data-email");
      var addr = (cfg.regionEmails && cfg.regionEmails[key]) || cfg.contactEmail;
      a.href = "mailto:" + addr; a.textContent = addr;
    });
    document.querySelectorAll("[data-social]").forEach(function (a) {
      var url = cfg[a.getAttribute("data-social") + "Url"];
      if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; } else a.parentElement.hidden = true;
    });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    document.querySelectorAll("[data-legal]").forEach(function (el) { el.textContent = cfg.legalName || "PENORIX"; });
  });
})();
