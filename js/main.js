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

/* Gifts journey: ONE hero pen travels the rail. As it passes each step its form changes:
   Inquire = blueprint outline with a size line, Proof = engraving placeholder + approval check,
   Sample = solid pen, Produce = laser engraves the name (a run of pens appears), Deliver = boxed and sent off.
   Five pens are always on the rail. Driven by requestAnimationFrame, paused when off screen. */
(function () {
  var rail = document.querySelector(".journey");
  if (!rail) return;
  var NS = "http://www.w3.org/2000/svg";
  var DUR = 26000, N = 5, NODES = [0.1, 0.3, 0.5, 0.7, 0.9];
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var back = function (t) { var c = 1.8; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  var D = {
    body: "M24 52Q24 47 29 47H132V73H29Q24 73 24 68Z", cone: "M140 47L176 54.5V65.5L140 73Z",
    tip: "M176 54.5L196 58.3L206 60L196 61.7L176 65.5Z", cap: "M14 53Q14 49 18 49H24V71H18Q14 71 14 67Z",
    clip: "M38 47V40Q38 36 42 36H94Q97 36 97 39.5V41.5H46V47Z", ring: "M132 46H140V74H132Z",
    b1: "M104 47H107V73H104Z", b2: "M113 47H116V73H113Z"
  };
  var CHROME = "url(#pg-chrome)", GRAPH = "url(#pg-graph)";
  var STATIC = '<path d="' + D.cap + '" fill="' + CHROME + '"/><path d="' + D.body + '" fill="' + GRAPH + '"/><path d="' + D.cone + '" fill="' + GRAPH + '"/>' +
    '<path d="' + D.ring + '" fill="' + CHROME + '"/><path d="' + D.tip + '" fill="' + CHROME + '"/><path d="' + D.b1 + '" fill="' + CHROME + '"/><path d="' + D.b2 + '" fill="' + CHROME + '"/>' +
    '<path d="' + D.clip + '" fill="' + CHROME + '"/><path d="M30 50.5H130" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" stroke-linecap="round"/>' +
    '<text x="46" y="63.6" textLength="54" lengthAdjust="spacingAndGlyphs" font-size="8" font-weight="500" fill="#d8dbde">YOUR NAME</text>';
  var defs = document.createElementNS(NS, "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.style.position = "absolute";
  defs.innerHTML = '<defs><linearGradient id="pg-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f6f7"/><stop offset=".45" stop-color="#9da2a7"/><stop offset=".55" stop-color="#d3d6d9"/><stop offset="1" stop-color="#7c8186"/></linearGradient>' +
    '<linearGradient id="pg-graph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d41"/><stop offset=".5" stop-color="#1d1f21"/><stop offset="1" stop-color="#121314"/></linearGradient>' +
    '<linearGradient id="pg-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>' +
    '<g id="pg-pen">' + STATIC + '</g></defs>';
  rail.appendChild(defs);

  var OUT = [D.body, D.cone, D.tip, D.cap, D.clip];
  function build(k) {
    var wrap = document.createElement("div"); wrap.className = "jx";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 220 120");
    svg.innerHTML =
      '<defs><clipPath id="pc' + k + '"><rect class="reveal" x="44" y="46" width="0" height="28"/></clipPath></defs>' +
      '<g class="fly"><g class="ghost-a" opacity="0"><use href="#pg-pen"/></g><g class="ghost-b" opacity="0"><use href="#pg-pen"/></g>' +
      '<g class="pen">' +
        '<g class="fill" opacity="0"><path d="' + D.body + '" fill="' + GRAPH + '"/><path d="' + D.cone + '" fill="' + GRAPH + '"/></g>' +
        '<g class="chrome" opacity="0"><path d="' + D.cap + '" fill="' + CHROME + '"/><path d="' + D.ring + '" fill="' + CHROME + '"/><path d="' + D.tip + '" fill="' + CHROME + '"/><path d="' + D.b1 + '" fill="' + CHROME + '"/><path d="' + D.b2 + '" fill="' + CHROME + '"/><path d="M30 50.5H130" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" stroke-linecap="round"/></g>' +
        '<g class="clipg" opacity="0"><path d="' + D.clip + '" fill="' + CHROME + '"/></g>' +
        '<g class="outline" fill="none" stroke="#dfe2e5" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">' +
          OUT.map(function (d) { return '<path class="ol" d="' + d + '" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'; }).join("") + '</g>' +
        '<g class="dim" fill="none" stroke="#c9ccCF" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
          ['M14 96H206', 'M14 91V101', 'M206 91V101', 'M21 93L14 96L21 99', 'M199 93L206 96L199 99'].map(function (d) { return '<path class="dl" d="' + d + '" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'; }).join("") + '</g>' +
        '<rect class="ph" x="44" y="55" width="58" height="11" rx="2" fill="none" stroke="#c9ccCF" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
        '<g clip-path="url(#pc' + k + ')"><text class="eng" x="46" y="63.6" textLength="54" lengthAdjust="spacingAndGlyphs" font-size="8" font-weight="500" fill="#d8dbde" opacity="0">YOUR NAME</text></g>' +
        '<rect class="beam" x="44" y="46" width="7" height="28" fill="url(#pg-beam)" opacity="0"/>' +
        '<g class="check" opacity="0"><circle cx="152" cy="28" r="10" fill="#121314" stroke="#e8eaec" stroke-width="1.3"/><path d="M147 28.5L151 32.5L158 24" fill="none" stroke="#e8eaec" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '</g>' +
      '<g class="box" opacity="0"><rect x="8" y="40" width="204" height="44" rx="3" fill="#141516" stroke="#c9ccCF" stroke-width="1.2"/><rect x="104" y="40" width="12" height="44" fill="#c9ccCF" fill-opacity=".85"/></g>' +
      '<g class="lid" opacity="0"><rect x="4" y="28" width="212" height="15" rx="3" fill="#1b1c1e" stroke="#e8eaec" stroke-width="1.2"/><rect x="104" y="28" width="12" height="15" fill="#e8eaec"/></g>' +
      '<g class="trail" opacity="0" stroke="#c9ccCF" stroke-width="1.2" stroke-linecap="round"><path d="M-10 52H-34"/><path d="M-6 62H-44"/><path d="M-10 72H-30"/></g>' +
      '</g>';
    wrap.appendChild(svg); rail.appendChild(wrap);
    var q = function (s) { return svg.querySelector(s); };
    return { wrap: wrap, fly: q(".fly"), ga: q(".ghost-a"), gb: q(".ghost-b"), fill: q(".fill"), chrome: q(".chrome"), clipg: q(".clipg"),
      ol: svg.querySelectorAll(".ol"), outline: q(".outline"), dim: q(".dim"), dl: svg.querySelectorAll(".dl"), ph: q(".ph"),
      reveal: q(".reveal"), eng: q(".eng"), beam: q(".beam"), check: q(".check"), box: q(".box"), lid: q(".lid"), trail: q(".trail") };
  }

  var nodes = Array.prototype.slice.call(rail.querySelectorAll(".journey__nodes i"));
  var items = []; for (var k = 0; k < N; k++) items.push(build(k));
  var W = rail.clientWidth, S = 220, H = 120;
  function measure() { W = rail.clientWidth; S = Math.max(70, Math.min(230, W * 0.175)); H = S * 120 / 220; items.forEach(function (it) { it.wrap.style.width = S + "px"; it.wrap.style.height = H + "px"; it.wrap.style.marginTop = (-H / 2) + "px"; }); }
  measure(); window.addEventListener("resize", measure);
  var tr = function (x, y, s) { return "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")" + (s === undefined ? "" : " translate(110 60) scale(" + s.toFixed(3) + ") translate(-110 -60)"); };

  function frame(now) {
    var glow = [0, 0, 0, 0, 0];
    items.forEach(function (it, i) {
      var p = ((now / DUR) + i / N) % 1, u = 220 / S;
      var cx = (-0.102 + 1.02 * p) * W + 4.5;
      var g = 0;
      NODES.forEach(function (n, ni) { var v = Math.exp(-Math.pow((p - n) / 0.05, 2)); if (v > glow[ni]) glow[ni] = v; if (v > g) g = v; });
      it.wrap.style.transform = "translate3d(" + (cx - S / 2).toFixed(1) + "px,0,0)";
      it.wrap.style.opacity = (seg(p, 0, 0.05) * (1 - seg(p, 0.97, 1)) * (0.6 + 0.4 * g)).toFixed(3);
      // A. blueprint
      var draw = seg(p, 0.02, 0.16);
      for (var a = 0; a < it.ol.length; a++) it.ol[a].style.strokeDashoffset = (1 - clamp(draw * 1.4 - a * 0.1)).toFixed(3);
      it.outline.setAttribute("opacity", (1 - 0.65 * seg(p, 0.4, 0.52)).toFixed(3));
      var dd = seg(p, 0.1, 0.21);
      for (a = 0; a < it.dl.length; a++) it.dl[a].style.strokeDashoffset = (1 - clamp(dd * 1.5 - a * 0.1)).toFixed(3);
      it.dim.setAttribute("opacity", (1 - seg(p, 0.24, 0.32)).toFixed(3));
      // B. proof
      var ph = seg(p, 0.2, 0.26) * (1 - seg(p, 0.5, 0.58)) * (1 - seg(p, 0.6, 0.62));
      it.ph.setAttribute("opacity", ph.toFixed(3));
      var ck = back(seg(p, 0.26, 0.33)), ckv = seg(p, 0.26, 0.28) * (1 - seg(p, 0.44, 0.5));
      it.check.setAttribute("opacity", ckv.toFixed(3));
      it.check.setAttribute("transform", "translate(152 28) scale(" + (0.4 + 0.6 * ck).toFixed(3) + ") translate(-152 -28)");
      // C. sample (solid)
      it.fill.setAttribute("opacity", (0.35 * seg(p, 0.2, 0.3) + 0.65 * seg(p, 0.38, 0.5)).toFixed(3));
      var ch = seg(p, 0.4, 0.52);
      it.chrome.setAttribute("opacity", ch.toFixed(3));
      it.clipg.setAttribute("opacity", ch.toFixed(3));
      it.clipg.setAttribute("transform", "translate(0 " + (-16 * (1 - ease(ch))).toFixed(1) + ")");
      // D. produce: laser engraving and a run of pens
      var lz = seg(p, 0.6, 0.7);
      it.reveal.setAttribute("width", (58 * lz).toFixed(1));
      it.eng.setAttribute("opacity", lz > 0 ? 1 : 0);
      it.beam.setAttribute("x", (44 + 58 * lz - 3).toFixed(1));
      it.beam.setAttribute("opacity", (seg(p, 0.6, 0.62) * (1 - seg(p, 0.69, 0.72))).toFixed(3));
      var run = ease(seg(p, 0.64, 0.74)), runOut = 1 - seg(p, 0.77, 0.81);
      it.ga.setAttribute("opacity", (0.34 * run * runOut).toFixed(3)); it.gb.setAttribute("opacity", (0.34 * run * runOut).toFixed(3));
      it.ga.setAttribute("transform", tr(0, -27 * run, 0.86)); it.gb.setAttribute("transform", tr(0, 27 * run, 0.86));
      // E. deliver: boxed and sent off
      var bx = ease(seg(p, 0.77, 0.86)), ld = ease(seg(p, 0.85, 0.92));
      it.box.setAttribute("opacity", seg(p, 0.77, 0.8).toFixed(3));
      it.box.setAttribute("transform", "translate(0 " + (56 * (1 - bx)).toFixed(1) + ")");
      it.lid.setAttribute("opacity", seg(p, 0.83, 0.86).toFixed(3));
      it.lid.setAttribute("transform", "translate(0 " + (-52 * (1 - ld)).toFixed(1) + ")");
      var f = ease(seg(p, 0.92, 0.99));
      it.fly.setAttribute("transform", "translate(" + (f * 0.2 * W * u).toFixed(1) + " " + (-f * 54 * u).toFixed(1) + ") rotate(" + (-7 * f).toFixed(1) + " 110 60)");
      it.trail.setAttribute("opacity", (Math.sin(Math.PI * seg(p, 0.92, 0.99)) * 0.8).toFixed(3));
      it.trail.setAttribute("transform", "translate(26 0)");
    });
    nodes.forEach(function (n, ni) { n.style.setProperty("--g", glow[ni].toFixed(3)); });
  }

  var raf = 0, t0 = performance.now() + DUR * 0.04;
  function loop(now) { frame(now - t0); raf = requestAnimationFrame(loop); }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(rail); else start();
  frame(DUR * 0.04);
})();
