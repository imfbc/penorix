/* Quote and contact forms. Writes to Supabase over its REST API (no SDK, so the site stays static).
   With no Supabase config the form runs in a clearly labelled demo mode and saves nothing. */
(function () {
  var cfg = window.PENORIX_CONFIG || {};
  var I = window.PenorixI18n;
  var configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var MAX_FILE = 10 * 1024 * 1024;
  var FILE_EXT = ["png", "jpg", "jpeg", "svg", "pdf", "ai", "eps"];
  var MIN_FILL_MS = 2500; // a human takes longer than this to fill a form

  function sb(path, opts) {
    opts.headers = Object.assign({ apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + cfg.supabaseAnonKey }, opts.headers || {});
    return fetch(cfg.supabaseUrl.replace(/\/$/, "") + path, opts).then(function (r) {
      if (!r.ok) throw new Error("Supabase " + r.status);
      return r;
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16);
    });
  }

  function setError(field, key) {
    var wrap = field.closest(".field") || field.closest(".check");
    var out = wrap && wrap.querySelector(".field__error");
    if (wrap) wrap.classList.toggle("has-error", !!key);
    field.setAttribute("aria-invalid", key ? "true" : "false");
    if (out) { out.setAttribute("data-key", key || ""); out.textContent = key ? I.t(key) : ""; }
  }

  function check(el) {
    var v = (el.type === "checkbox" ? el.checked : el.value.trim());
    if (el.required && !v) return "err.required";
    if (el.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "err.email";
    if (el.name === "quantity" && v && !/^[1-9]\d{0,6}$/.test(v)) return "err.qty";
    if (el.type === "file" && el.files && el.files[0]) {
      var f = el.files[0], ext = (f.name.split(".").pop() || "").toLowerCase();
      if (FILE_EXT.indexOf(ext) === -1) return "err.file.type";
      if (f.size > MAX_FILE) return "err.file.size";
    }
    return "";
  }

  function init(form) {
    var kind = form.getAttribute("data-form");
    var started = Date.now();
    var status = form.querySelector(".form__status");
    var submit = form.querySelector('button[type="submit"]');
    var submitKey = submit.getAttribute("data-i18n");
    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-validate]"));

    var date = form.querySelector('input[type="date"]');
    if (date) date.min = new Date().toISOString().slice(0, 10);

    if (!configured) {
      var n = form.querySelector(".notice");
      if (n) n.hidden = false;
    }

    fields.forEach(function (el) {
      el.addEventListener("blur", function () { setError(el, check(el)); });
      el.addEventListener("input", function () { if (el.closest(".has-error")) setError(el, check(el)); });
      el.addEventListener("change", function () { if (el.closest(".has-error")) setError(el, check(el)); });
    });

    // Re-render visible error messages when the language changes
    document.addEventListener("penorix:lang", function () {
      form.querySelectorAll(".field__error[data-key]").forEach(function (o) {
        var k = o.getAttribute("data-key"); if (k) o.textContent = I.t(k);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.hp && form.hp.value) return; // honeypot
      var first = null;
      fields.forEach(function (el) { var k = check(el); setError(el, k); if (k && !first) first = el; });
      if (first) { first.focus(); return; }
      if (Date.now() - started < MIN_FILL_MS) return; // too fast to be a person

      status.hidden = true;
      submit.disabled = true;
      submit.textContent = I.t("f.sending");
      submit.removeAttribute("data-i18n");

      send(kind, form).then(function () {
        form.hidden = true;
        var ok = document.getElementById(kind + "-success");
        ok.hidden = false;
        ok.querySelector("h3").focus();
      }).catch(function (err) {
        if (window.console) console.error(err);
        status.textContent = I.t("err.send");
        status.hidden = false;
        status.setAttribute("data-i18n", "err.send");
      }).then(function () {
        submit.disabled = false;
        submit.setAttribute("data-i18n", submitKey);
        submit.textContent = I.t(submitKey);
      });
    });
  }

  function val(form, name) { var el = form.elements[name]; return el ? el.value.trim() : ""; }

  function send(kind, form) {
    if (!configured) {
      if (window.console) console.warn("[PENORIX] Demo mode: Supabase is not configured, submission was not saved.");
      return new Promise(function (res) { setTimeout(res, 700); });
    }
    var lang = I.get();
    if (kind === "contact") {
      return sb("/rest/v1/contact_messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ name: val(form, "name"), email: val(form, "email"), country: val(form, "country") || null, message: val(form, "message"), lang: lang })
      });
    }
    var file = form.elements.logo && form.elements.logo.files[0];
    var path = null;
    var upload = Promise.resolve();
    if (file) {
      var ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      path = uuid() + "/logo." + ext;
      upload = sb("/storage/v1/object/" + cfg.logoBucket + "/" + path, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
        body: file
      });
    }
    return upload.then(function () {
      return sb("/rest/v1/quote_requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          company: val(form, "company"), contact_name: val(form, "name"), email: val(form, "email"),
          country: val(form, "country"), quantity: parseInt(val(form, "quantity"), 10),
          model: val(form, "model") || null, color: val(form, "color") || null,
          engraving_text: val(form, "engraving") || null, logo_path: path,
          desired_date: val(form, "date") || null, message: val(form, "message") || null,
          lang: lang, source_page: location.pathname.split("/").pop() || "index.html"
        })
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-form]").forEach(init);
  });
})();
