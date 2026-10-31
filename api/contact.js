// Contact form handler: sends the message via Resend from our own domain.
// The recipient and API key live only on the server, never in the page.
const TO = process.env.CONTACT_TO || "steve@edge.com.au";
const FROM = process.env.CONTACT_FROM || "Nuffin dog <noreply@edge.com.au>";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const { email = "", message = "", website = "" } = req.body || {};
  if (website) return res.status(200).json({ ok: true }); // honeypot: silently drop bots
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !String(message).trim() || String(message).length > 5000) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return res.status(500).json({ ok: false });
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: "New message from your website",
        text: "From: " + email + "\n\n" + message,
        html:
          '<p style="font-family:monospace"><b>From:</b> ' + esc(email) + "</p>" +
          '<p style="font-family:monospace;white-space:pre-wrap">' + esc(message) + "</p>",
      }),
    });
    if (!r.ok) {
      console.error("Resend rejected", r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Resend request failed", e && e.message);
    return res.status(502).json({ ok: false });
  }
};
