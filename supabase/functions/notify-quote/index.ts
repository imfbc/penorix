// Sends an email to the PENORIX team when a quote request or contact message is inserted.
// Triggered by a Supabase Database Webhook (INSERT on quote_requests and contact_messages).
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY   API key from resend.com
//   MAIL_FROM        verified sender, e.g. "PENORIX Website <notify@your-domain>"
//   NOTIFY_TO        fallback recipient(s), comma separated
//   NOTIFY_TO_US / NOTIFY_TO_KR / NOTIFY_TO_IN   optional per-country recipients
//   WEBHOOK_SECRET   shared secret; set the same value as the webhook header "x-webhook-secret"

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LABELS: Record<string, string> = {
  company: "Company", contact_name: "Name", name: "Name", email: "Email", country: "Country",
  quantity: "Quantity", model: "Model", color: "Color", engraving_text: "Engraving",
  logo_path: "Logo file (private bucket quote-logos)", desired_date: "Needed by", message: "Message", lang: "Language",
};

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-webhook-secret") !== secret) return new Response("forbidden", { status: 403 });

  const payload = await req.json();
  if (payload.type !== "INSERT" || !payload.record) return new Response("ignored");

  const rec = payload.record as Record<string, unknown>;
  const isQuote = payload.table === "quote_requests";
  const subject = isQuote
    ? `New quote request: ${rec.company} (${rec.quantity} pcs, ${rec.country})`
    : `New contact message from ${rec.name}`;

  const rows = Object.keys(LABELS)
    .filter((k) => rec[k] !== null && rec[k] !== undefined && rec[k] !== "")
    .map((k) => `<tr><td style="padding:4px 16px 4px 0;color:#666">${LABELS[k]}</td><td style="padding:4px 0">${esc(rec[k])}</td></tr>`)
    .join("");
  const html = `<table style="font-family:sans-serif;font-size:14px">${rows}</table>`;

  const country = String(rec.country ?? "");
  const to = (Deno.env.get(`NOTIFY_TO_${country}`) ?? Deno.env.get("NOTIFY_TO") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length) return new Response("no recipients configured", { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("MAIL_FROM"), to, reply_to: rec.email, subject, html }),
  });
  return new Response(await res.text(), { status: res.ok ? 200 : 502 });
});
