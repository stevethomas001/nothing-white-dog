// Receives the contact form and forwards it to the inbox server-side,
// so the recipient address never appears in the public page.
const TO = process.env.CONTACT_TO || "steve@edge.com.au";
const SITE = "https://nothing-white-dog.vercel.app";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const { email = "", message = "" } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email) || !message.trim() || message.length > 5000) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }
  try {
    const r = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(TO), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: SITE,
        Referer: SITE + "/",
      },
      body: JSON.stringify({
        email,
        message,
        _subject: "New message from your website",
        _replyto: email,
        _template: "table",
        _captcha: "false",
      }),
    });
    const text = await r.text();
    let d = {};
    try { d = JSON.parse(text); } catch (_) {}
    const ok = d.success === true || d.success === "true";
    if (!ok) console.error("FormSubmit rejected", r.status, text.slice(0, 500));
    return res.status(ok ? 200 : 502).json({ ok, info: d.message || null });
  } catch (e) {
    console.error("FormSubmit request failed", e && e.message);
    return res.status(502).json({ ok: false });
  }
};
