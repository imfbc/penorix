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

/* 3D pen viewer. three.js is loaded from a CDN only when the section nears the viewport.
   The pen is built from lathe geometry (no model file). Drag or swipe to rotate; it spins slowly by itself. */
(function () {
  var host = document.querySelector("[data-pen3d]");
  if (!host) return;
  var section = host.closest(".hero3d") || host;
  var started = false;
  function load(cb) {
    if (window.THREE) return cb();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js";
    s.async = true; s.onload = cb;
    document.head.appendChild(s);
  }
  if (!("IntersectionObserver" in window)) { load(init); return; }
  new IntersectionObserver(function (es) { if (es[0].isIntersecting && !started) { started = true; load(init); } }, { rootMargin: "400px" }).observe(host);

  function init() {
    var T = window.THREE, canvas = host.querySelector("canvas"), renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(26, 2.5, 0.1, 100);

    // studio reflections: a dark room with softboxes, baked once into an environment map
    var env = new T.Scene(); env.background = new T.Color(0x030304);
    function panel(w, h, x, y, z, rx, ry, v) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    }
    panel(26, 12, 0, 11, 0, Math.PI / 2, 0, 3.2);
    panel(2.6, 26, -11, 0, 3, 0, Math.PI / 2, 7);
    panel(2.2, 26, 11, 0, 1, 0, Math.PI / 2, 4.5);
    panel(26, 8, 0, -11, 2, Math.PI / 2, 0, 0.7);
    panel(24, 14, 0, 0, -12, 0, 0, 0.5);
    scene.environment = new T.PMREMGenerator(renderer).fromScene(env, 0.03).texture;

    var chrome = new T.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.1 });
    // engraved barrel texture: PENORIX runs along the barrel
    var cv = document.createElement("canvas"); cv.width = 512; cv.height = 1400;
    var cx = cv.getContext("2d");
    cx.fillStyle = "#17181a"; cx.fillRect(0, 0, 512, 1400);
    cx.save(); cx.translate(128, 700); cx.rotate(-Math.PI / 2);
    cx.font = "600 66px Inter, Pretendard, Arial, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    if ("letterSpacing" in cx) cx.letterSpacing = "14px";
    cx.fillStyle = "rgba(0,0,0,.6)"; cx.fillText("PENORIX", 2, 2);
    cx.fillStyle = "#cdd0d3"; cx.fillText("PENORIX", 0, 0); cx.restore();
    var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
    var body = new T.MeshStandardMaterial({ color: 0xffffff, map: tex, metalness: 0.7, roughness: 0.42 });
    var plain = new T.MeshStandardMaterial({ color: 0x151617, metalness: 0.7, roughness: 0.42 });

    var pen = new T.Group(), V = function (r, y) { return new T.Vector2(r, y); };
    function lathe(pts, mat) { var m = new T.Mesh(new T.LatheGeometry(pts, 96), mat); pen.add(m); return m; }
    function ring(r, y, h, mat) { var m = new T.Mesh(new T.CylinderGeometry(r, r, h, 96), mat); m.position.y = y; pen.add(m); }
    lathe([V(0, 7.1), V(0.2, 7.08), V(0.36, 7.0), V(0.46, 6.82), V(0.5, 6.55), V(0.52, 6.3)], chrome);       // push cap
    ring(0.545, 6.2, 0.26, chrome);
    lathe([V(0.52, -2.9), V(0.52, 6.08)], body);                                                                // engraved barrel
    ring(0.56, -3.0, 0.28, chrome);
    var low = []; for (var t = 0; t <= 1.001; t += 0.05) low.push(V(0.52 - 0.27 * Math.pow(t, 0.85), -3.14 - 3.1 * t));
    lathe(low, plain);                                                                                           // tapered grip
    ring(0.285, -6.3, 0.22, chrome);
    lathe([V(0.255, -6.4), V(0.2, -6.68), V(0.13, -7.0), V(0.07, -7.28), V(0.0, -7.4)], chrome);                 // tip
    var sh = new T.Shape(); sh.moveTo(-0.2, 4.5); sh.lineTo(-0.2, 0.25); sh.quadraticCurveTo(-0.2, 0, 0, 0);
    sh.quadraticCurveTo(0.2, 0, 0.2, 0.25); sh.lineTo(0.2, 4.5); sh.lineTo(-0.2, 4.5);
    var cg = new T.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 12 });
    cg.rotateY(Math.PI / 2); cg.translate(0.5, 1.7, 0.0);
    pen.add(new T.Mesh(cg, chrome));
    var br = new T.Mesh(new T.BoxGeometry(0.2, 0.36, 0.4), chrome); br.position.set(0.52, 6.18, 0); pen.add(br);
    pen.position.y = -0.1;

    var spin = new T.Group(); spin.add(pen);
    var tilt = new T.Group(), offY = 0; tilt.add(spin); scene.add(tilt);
    var baseTilt = Math.PI / 2 - 0.95;
    tilt.rotation.z = -baseTilt; tilt.rotation.x = 0.16;
    var key = new T.DirectionalLight(0xffffff, 0.5); key.position.set(-6, 8, 10); scene.add(key);

    function resize() {
      var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      var fov = camera.fov * Math.PI / 180, th = 2 * Math.tan(fov / 2);
      var wide = camera.aspect > 1.1, dist = (wide ? 17 : 42) / th;
      camera.position.set(0, 0, dist); camera.updateProjectionMatrix();
      var visH = th * dist, visW = visH * camera.aspect;
      tilt.position.x = wide ? visW * 0.2 : 0; offY = wide ? -visH * 0.02 : visH * 0.25;
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener("resize", resize);

    // interaction: drag to roll the pen, vertical drag to tilt it; it eases back and keeps spinning
    var drag = false, lx = 0, ly = 0, vel = 0, idle = 0, rx = 0.16, tz = 0;
    canvas.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; ly = e.clientY; vel = 0; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return; var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      spin.rotation.y += dx * 0.012; vel = dx * 0.012;
      rx = Math.max(-0.5, Math.min(0.7, rx + dy * 0.004));
    });
    function up() { drag = false; idle = 1.4; }
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

    var raf = 0, last = 0, visible = true, ready = false;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (!drag) {
        if (idle > 0) { idle -= dt; spin.rotation.y += vel; vel *= 0.94; }
        else { vel += (0.5 * dt - vel) * 0.04; spin.rotation.y += vel; }
        rx += (0.16 - rx) * 0.01;
      }
      tz += dt; tilt.rotation.x = rx; tilt.rotation.z = -baseTilt + Math.sin(tz * 0.5) * 0.035; tilt.position.y = offY + Math.sin(tz * 0.8) * 0.12;
      renderer.render(scene, camera); if (!ready) { ready = true; section.classList.add("is-3d"); } raf = visible ? requestAnimationFrame(loop) : 0;
    }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }, { rootMargin: "100px" }).observe(host);
    raf = requestAnimationFrame(loop);
  }
})();
