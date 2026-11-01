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
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(24, 2.5, 0.1, 100);

    // Photo-studio reflections: dark room, one big softbox and long strip lights, baked once into an environment map.
    var env = new T.Scene(); env.background = new T.Color(0x020203);
    function panel(w, h, x, y, z, rx, ry, v) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    }
    panel(26, 10, 0, 11, 1, Math.PI / 2, 0, 4.2);
    panel(3.2, 28, -11, 0, 2, 0, Math.PI / 2, 7.5);
    panel(2.4, 28, 11, 0, 0, 0, Math.PI / 2, 4.5);
    panel(30, 10, 0, -12, 0, Math.PI / 2, 0, 0.3);
    panel(28, 16, 0, 0, -13, 0, 0, 0.5);
    scene.environment = new T.PMREMGenerator(renderer).fromScene(env, 0.04).texture;

    // materials
    var chrome = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.05 });
    var satin = new T.MeshPhysicalMaterial({ color: 0xd9dcdf, metalness: 1, roughness: 0.24 });
    function tex(draw, srgb) {
      var c = document.createElement("canvas"); c.width = 1024; c.height = 2800; var x = c.getContext("2d"); draw(x);
      var t = new T.CanvasTexture(c); t.anisotropy = 16; if (srgb) t.encoding = T.sRGBEncoding; return t;
    }
    function engrave(x, base, ink, mode) {
      x.fillStyle = base; x.fillRect(0, 0, 1024, 2800);
      x.fillStyle = ink; x.font = "600 118px Inter, Pretendard, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
      if ("letterSpacing" in x) x.letterSpacing = "30px";
      [0, 1024].forEach(function (ox) { x.save(); x.translate(ox, 1480); x.rotate(-Math.PI / 2); x.fillText("PENORIX", 0, 0); x.restore(); });
    }
    var body = new T.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 1, roughness: 1, clearcoat: 0.55, clearcoatRoughness: 0.12, envMapIntensity: 1.0,
      map: tex(function (x) { engrave(x, "#0d0e10", "#dfe2e5"); }, true),
      metalnessMap: tex(function (x) { engrave(x, "#8c8c8c", "#ffffff"); }, false),
      roughnessMap: tex(function (x) { engrave(x, "#5c5c5c", "#444444"); }, false),
      bumpMap: tex(function (x) { engrave(x, "#ffffff", "#000000"); }, false), bumpScale: -0.7
    });
    var lacquer = new T.MeshPhysicalMaterial({ color: 0x0d0e10, metalness: 0.55, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.12 });

    var pen = new T.Group(), V = function (r, y) { return new T.Vector2(r, y); };
    function lathe(pts, mat) { var m = new T.Mesh(new T.LatheGeometry(pts, 128), mat); pen.add(m); return m; }
    function band(r, y0, y1, mat) { lathe([V(r, y0), V(r, y1)], mat); }
    function smooth(pts, n) { var c = new T.SplineCurve(pts.map(function (p) { return new T.Vector2(p[0], p[1]); })); return c.getPoints(n); }

    // push button: chamfered chrome plunger with a rounded crown
    lathe(smooth([[0, 7.16], [0.2, 7.15], [0.31, 7.11], [0.37, 7.03], [0.385, 6.9], [0.385, 6.6]], 40), chrome);
    lathe([V(0.385, 6.6), V(0.5, 6.58), V(0.5, 6.42)], satin);                                                  // button shoulder
    band(0.545, 6.42, 6.12, chrome);                                                                            // top ring
    lathe([V(0.545, 6.12), V(0.525, 6.1)], chrome);
    lathe([V(0.522, 6.1), V(0.522, 2.5)], body);                                                                // barrel (engraved)
    band(0.532, 2.5, 2.43, chrome);                                                                             // twist seam
    lathe([V(0.522, 2.43), V(0.522, -2.92)], body);
    // fine grooved collar
    var grooves = [V(0.5, -2.92)], gy = -2.92; for (var i = 0; i < 16; i++) { grooves.push(V(0.572, gy - 0.014), V(0.548, gy - 0.034)); gy -= 0.034; }
    grooves.push(V(0.5, gy)); lathe(grooves, satin);
    band(0.56, gy, gy - 0.1, chrome);
    var low = []; for (var t = 0; t <= 1.0001; t += 0.04) low.push(V(0.5 - 0.235 * Math.pow(t, 0.78) - 0.02 * t, gy - 0.1 - 2.75 * t));
    lathe(low, lacquer);                                                                                         // tapered grip
    var ly = gy - 0.1 - 2.75;
    band(0.285, ly, ly - 0.24, chrome);
    lathe(smooth([[0.262, ly - 0.24], [0.22, ly - 0.52], [0.145, ly - 0.84], [0.075, ly - 1.1], [0.03, ly - 1.2], [0, ly - 1.22]], 30), satin); // tip
    // sculpted clip: flat strap, flared at the end, with a rounded tip
    var sh = new T.Shape(); sh.moveTo(-0.17, 4.7); sh.lineTo(-0.15, 0.3); sh.quadraticCurveTo(-0.14, 0, 0, 0);
    sh.quadraticCurveTo(0.14, 0, 0.15, 0.3); sh.lineTo(0.17, 4.7); sh.lineTo(-0.17, 4.7);
    var cg = new T.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 5, curveSegments: 16 });
    cg.rotateY(Math.PI / 2); cg.translate(0.585, 1.55, 0);
    var cp = cg.attributes.position; for (var k = 0; k < cp.count; k++) { var yy = cp.getY(k) - 1.55; if (yy < 1.3) cp.setX(k, cp.getX(k) + 0.1 * Math.pow((1.3 - yy) / 1.3, 2)); }
    cg.computeVertexNormals(); pen.add(new T.Mesh(cg, chrome));
    var bridge = new T.Mesh(new T.BoxGeometry(0.2, 0.34, 0.34), chrome); bridge.position.set(0.555, 6.3, 0); pen.add(bridge);
    pen.position.y = -0.15;

    var spin = new T.Group(); spin.add(pen);
    var tilt = new T.Group(), par = new T.Group(), offY = 0; tilt.add(spin); par.add(tilt); scene.add(par);
    var baseTilt = Math.PI / 2 - 0.95;
    tilt.rotation.z = -baseTilt; tilt.rotation.x = 0.16; spin.rotation.y = -0.75;
    var key = new T.DirectionalLight(0xffffff, 0.35); key.position.set(-6, 8, 10); scene.add(key);
    var rim = new T.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(7, 4, -8); scene.add(rim);
    host.__pen = { spin: spin, tilt: tilt, render: function () { renderer.render(scene, camera); } };

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

    // interaction: drag to roll the pen, vertical drag to tilt it; hover adds a slight parallax; it keeps spinning slowly
    var drag = false, lx = 0, ly2 = 0, vel = 5, idle = 0, rx = 0.16, tz = 0, mx = 0, my = 0, tmx = 0, tmy = 0, intro = 0;
    canvas.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; ly2 = e.clientY; vel = 0; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5;
      if (!drag) return; var dx = e.clientX - lx, dy = e.clientY - ly2; lx = e.clientX; ly2 = e.clientY;
      spin.rotation.y += dx * 0.012; vel = dx * 0.012; rx = Math.max(-0.5, Math.min(0.7, rx + dy * 0.004));
    });
    canvas.addEventListener("pointerleave", function () { tmx = 0; tmy = 0; });
    function up() { drag = false; idle = 1.4; }
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

    var raf = 0, last = 0, visible = true, ready = false;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      intro = Math.min(1, intro + dt / 2.6); var ie = 1 - Math.pow(1 - intro, 3);
      if (!drag) {
        if (idle > 0) { idle -= dt; spin.rotation.y += vel; vel *= 0.94; }
        else { vel += (0.42 * dt - vel) * (intro < 1 ? 0.03 : 0.05); spin.rotation.y += vel * (intro < 1 ? 1 : 1); }
        rx += (0.16 - rx) * 0.01;
      }
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; tz += dt;
      par.rotation.y = mx * 0.28; par.rotation.x = my * 0.16;
      tilt.rotation.x = rx; tilt.rotation.z = -baseTilt + Math.sin(tz * 0.5) * 0.03;
      tilt.position.y = offY + Math.sin(tz * 0.8) * 0.1 + (1 - ie) * -1.4;
      var sc = 0.9 + 0.1 * ie; par.scale.set(sc, sc, sc);
      renderer.render(scene, camera); if (!ready) { ready = true; section.classList.add("is-3d"); } raf = visible ? requestAnimationFrame(loop) : 0;
    }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }, { rootMargin: "100px" }).observe(host);
    raf = requestAnimationFrame(loop);
  }
})();

/* Signing close-up: a pen draws a signature on white paper in a loop. Paper texture is in the SVG (filters). */
(function () {
  var host = document.querySelector(".signing__svg");
  if (!host) return;
  var p1 = host.querySelector(".sg-p1"), p2 = host.querySelector(".sg-p2"), pen = host.querySelector("#sg-pen"),
    shadow = host.querySelector("#sg-shadow"), contact = host.querySelector("#sg-contact"), ink = host.querySelector("#sg-ink-g");
  var L1 = p1.getTotalLength(), L2 = p2.getTotalLength(), T = 11.5, ANG = -58;
  p1.style.strokeDasharray = L1; p2.style.strokeDasharray = L2;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  var io = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  var out = function (x) { return 1 - Math.pow(1 - x, 3); };
  var S1 = p1.getPointAtLength(0), E1 = p1.getPointAtLength(L1), S2 = p2.getPointAtLength(0), E2 = p2.getPointAtLength(L2);

  function frame(t) {
    t = t % T;
    var w1 = io(seg(t, 0.9, 5.8)), w2 = io(seg(t, 6.5, 8.2));
    p1.style.strokeDashoffset = (L1 * (1 - w1)).toFixed(1); p2.style.strokeDashoffset = (L2 * (1 - w2)).toFixed(1);
    p1.style.opacity = w1 > 0 ? 1 : 0; p2.style.opacity = w2 > 0 ? 1 : 0;
    var x, y, lift = 0;
    if (t < 0.9) { var e = out(seg(t, 0, 0.9)); x = S1.x + 190 * (1 - e); y = S1.y - 140 * (1 - e); lift = 26 * (1 - e); }
    else if (t < 5.8) { var q = p1.getPointAtLength(L1 * w1); x = q.x; y = q.y; }
    else if (t < 6.5) { var m = io(seg(t, 5.8, 6.5)); x = E1.x + (S2.x - E1.x) * m; y = E1.y + (S2.y - E1.y) * m; lift = 22 * Math.sin(Math.PI * m); }
    else if (t < 8.2) { var q2 = p2.getPointAtLength(L2 * w2); x = q2.x; y = q2.y; }
    else { var o = io(seg(t, 8.2, 9.2)); x = E2.x + 200 * o; y = E2.y - 150 * o; lift = 28 * o; }
    var wob = t > 0.9 && t < 8.2 ? Math.sin(t * 37) * 0.35 : 0;
    pen.setAttribute("transform", "translate(" + (x + wob).toFixed(1) + " " + (y - lift * 0.4).toFixed(1) + ") rotate(" + ANG + ")");
    shadow.setAttribute("transform", "translate(" + (x + 20 + lift * 1.3).toFixed(1) + " " + (y + 30 + lift * 1.6).toFixed(1) + ") rotate(" + ANG + ")");
    shadow.setAttribute("opacity", (0.5 - lift * 0.008).toFixed(3));
    contact.setAttribute("cx", (x + 7).toFixed(1)); contact.setAttribute("cy", (y + 9).toFixed(1));
    contact.setAttribute("opacity", (0.4 * (1 - clamp(lift / 14))).toFixed(3));
    ink.style.opacity = (1 - seg(t, 9.6, 11)).toFixed(3);
  }
  host.__sign = frame;

  function fit() { var r = host.clientWidth / (host.clientHeight || 1); if (r < 1) { host.setAttribute("viewBox", "740 420 780 470"); host.setAttribute("preserveAspectRatio", "xMidYMid meet"); } else { host.setAttribute("viewBox", "0 0 1600 900"); host.setAttribute("preserveAspectRatio", "xMidYMid slice"); } }
  fit(); window.addEventListener("resize", fit);
  var raf = 0, t0 = 0;
  function loop(now) { if (!t0) t0 = now; frame((now - t0) / 1000); raf = requestAnimationFrame(loop); }
  frame(7.2);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { if (!raf) { t0 = 0; raf = requestAnimationFrame(loop); } } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(host); else raf = requestAnimationFrame(loop);
})();
