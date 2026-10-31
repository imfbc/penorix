/* Navigation, language toggle, reveal and in-view behavior. No scroll listeners: IntersectionObserver only. */
(function () {
  var cfg = window.PENORIX_CONFIG || {};
  var I = window.PenorixI18n;

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
    var reveals = document.querySelectorAll(".reveal, .stagger");
    if ("IntersectionObserver" in window) {
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

    // Film plays only while visible
    document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
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

/* Gifts journey: hairline icons on a conveyor. One outline morphs paper > pen > gift box > plane
   while it passes Inquire, Proof, Sample, Produce, Deliver. Five items are always on the rail. */
(function () {
  var rail = document.querySelector(".journey");
  if (!rail) return;
  var NS = "http://www.w3.org/2000/svg";
  var DUR = 24000, N = 5, NODES = [0.1, 0.3, 0.5, 0.7, 0.9];
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // each detail: path data, then [drawIn start, drawIn end, drawOut start, drawOut end] in item progress
  var DETAIL = [
    { d: "M42 42a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", t: [0.02, 0.07, 0.34, 0.46] },
    { d: "M46 56H74", t: [0.04, 0.08, 0.34, 0.46] }, { d: "M46 64H74", t: [0.08, 0.12, 0.34, 0.46] },
    { d: "M46 72H74", t: [0.12, 0.16, 0.34, 0.46] }, { d: "M46 80H62", t: [0.16, 0.19, 0.34, 0.46] },
    { d: "M61 78a11 11 0 1 0 22 0a11 11 0 1 0 -22 0", t: [0.24, 0.31, 0.34, 0.46] },
    { d: "M67 78.5l4 4 8-9", t: [0.28, 0.33, 0.34, 0.46] },
    { d: "M36 53V46.5H60V53", t: [0.44, 0.56, 0.62, 0.72] }, { d: "M66 53.5V66.5", t: [0.46, 0.56, 0.62, 0.72] },
    { d: "M31 56V64", t: [0.46, 0.56, 0.62, 0.72] }, { d: "M93 54L110 60L93 66", t: [0.48, 0.58, 0.62, 0.72] },
    { d: "M33 35H87V44H33Z", t: [0.64, 0.74, 0.8, 0.9] }, { d: "M56.5 35V77", t: [0.66, 0.76, 0.8, 0.9] },
    { d: "M63.5 35V77", t: [0.66, 0.76, 0.8, 0.9] },
    { d: "M60 35C50 21 40 29 47 34C52 37 58 35 60 35", t: [0.68, 0.78, 0.8, 0.9] },
    { d: "M60 35C70 21 80 29 73 34C68 37 62 35 60 35", t: [0.68, 0.78, 0.8, 0.9] },
    { d: "M24 52L19 35H34L46 52", t: [0.82, 0.92, 2, 2] }, { d: "M50 68L38 88H53L74 68", t: [0.84, 0.94, 2, 2] },
    { d: "M60.4 58a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0", t: [0.86, 0.94, 2, 2] },
    { d: "M68.4 58a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0", t: [0.87, 0.95, 2, 2] },
    { d: "M76.4 58a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0", t: [0.88, 0.96, 2, 2] }
  ];
  // body outline as a rounded rectangle: [progress, width, height, radius]
  var SHAPES = [[0.34, 44, 58, 4], [0.58, 66, 13, 6.5], [0.76, 46, 34, 3], [0.92, 74, 16, 8]];

  function bodyAt(p) {
    var a = SHAPES[0], b = SHAPES[0], t = 0, i;
    if (p <= SHAPES[0][0]) { a = b = SHAPES[0]; }
    else if (p >= SHAPES[3][0]) { a = b = SHAPES[3]; }
    else {
      for (i = 0; i < 3; i++) if (p >= SHAPES[i][0] && p < SHAPES[i + 1][0]) { a = SHAPES[i]; b = SHAPES[i + 1]; t = ease((p - a[0]) / (b[0] - a[0])); }
    }
    var w = lerp(a[1], b[1], t), h = lerp(a[2], b[2], t), r = Math.min(lerp(a[3], b[3], t), w / 2, h / 2);
    var x = 60 - w / 2, y = 60 - h / 2;
    return "M" + (x + r) + " " + y + "H" + (x + w - r) + "A" + r + " " + r + " 0 0 1 " + (x + w) + " " + (y + r) +
      "V" + (y + h - r) + "A" + r + " " + r + " 0 0 1 " + (x + w - r) + " " + (y + h) +
      "H" + (x + r) + "A" + r + " " + r + " 0 0 1 " + x + " " + (y + h - r) +
      "V" + (y + r) + "A" + r + " " + r + " 0 0 1 " + (x + r) + " " + y + "Z";
  }

  var nodes = Array.prototype.slice.call(rail.querySelectorAll(".journey__nodes i"));
  var items = [];
  for (var k = 0; k < N; k++) {
    var wrap = document.createElement("div"); wrap.className = "jx";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 120 120");
    var fly = document.createElementNS(NS, "g");
    var body = document.createElementNS(NS, "path"); body.setAttribute("class", "jx-body"); fly.appendChild(body);
    var parts = DETAIL.map(function (d) {
      var el = document.createElementNS(NS, "path"); el.setAttribute("d", d.d); el.setAttribute("pathLength", "1");
      el.style.strokeDasharray = "1"; el.style.strokeDashoffset = "1"; fly.appendChild(el); return { el: el, t: d.t };
    });
    svg.appendChild(fly); wrap.appendChild(svg); rail.appendChild(wrap);
    items.push({ wrap: wrap, fly: fly, body: body, parts: parts });
  }

  var W = rail.clientWidth, S = 150;
  function measure() { W = rail.clientWidth; S = items[0].wrap.offsetWidth || 150; }
  measure(); window.addEventListener("resize", measure);

  function frame(now) {
    var glow = [0, 0, 0, 0, 0];
    items.forEach(function (it, i) {
      var p = ((now / DUR) + i / N) % 1;
      var x = (-0.102 + 1.02 * p) * W - S / 2 + 4.5;
      var inA = seg(p, 0, 0.06), outA = 1 - seg(p, 0.97, 1);
      it.wrap.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      var g = 0;
      NODES.forEach(function (n, ni) { var v = Math.exp(-Math.pow((p - n) / 0.045, 2)); if (v > glow[ni]) glow[ni] = v; if (v > g) g = v; });
      it.wrap.style.opacity = (inA * outA * (0.55 + 0.45 * g)).toFixed(3);
      it.body.setAttribute("d", bodyAt(p));
      it.parts.forEach(function (pt) {
        var d = seg(p, pt.t[0], pt.t[1]) * (1 - seg(p, pt.t[2], pt.t[3]));
        pt.el.style.strokeDashoffset = (1 - d).toFixed(3);
      });
      var f = ease(seg(p, 0.88, 0.99)), u = 120 / S;
      it.fly.setAttribute("transform", "translate(" + (f * 0.2 * W * u).toFixed(1) + " " + (-f * 46 * u).toFixed(1) + ") rotate(" + (-9 * f).toFixed(1) + " 60 60)");
    });
    nodes.forEach(function (n, ni) { n.style.setProperty("--g", glow[ni].toFixed(3)); });
  }

  var raf = 0, t0 = performance.now() + DUR * 0.04;
  function loop(now) { frame(now - t0); raf = requestAnimationFrame(loop); }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(rail);
  } else start();
  frame(DUR * 0.04);
})();
