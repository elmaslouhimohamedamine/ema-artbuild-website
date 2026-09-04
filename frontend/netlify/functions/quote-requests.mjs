const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

const escapeHtml = (value) => String(value).trim().replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

export default async function handler(request) {
  if (request.method !== "POST") return json({ detail: "Méthode non autorisée." }, 405);

  const resendKey = process.env.RESEND_API_KEY;
  const sender = process.env.SENDER_EMAIL;
  const recipient = process.env.QUOTE_RECIPIENT_EMAIL;
  if (!resendKey || !sender || !recipient) {
    return json({ detail: "L'envoi des demandes n'est pas encore configuré." }, 503);
  }

  try {
    const form = await request.formData();
    const fields = Object.fromEntries(["full_name", "phone", "email", "city", "project_type", "budget", "message", "locale"].map((key) => [key, String(form.get(key) || "").trim()]));
    if (!fields.full_name || !fields.phone || !fields.email || !fields.city || !fields.project_type || !fields.message) {
      return json({ detail: "Veuillez renseigner tous les champs obligatoires." }, 422);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      return json({ detail: "Veuillez renseigner une adresse email valide." }, 422);
    }

    let totalSize = 0;
    const attachments = [];
    for (const file of form.getAll("attachments")) {
      if (!(file instanceof File) || !file.name) continue;
      if (!ALLOWED_TYPES.has(file.type)) return json({ detail: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés." }, 415);
      const buffer = await file.arrayBuffer();
      totalSize += buffer.byteLength;
      if (buffer.byteLength > MAX_FILE_SIZE || totalSize > MAX_TOTAL_SIZE) {
        return json({ detail: "Les pièces jointes sont limitées à 10 Mo au total (5 Mo par fichier)." }, 413);
      }
      attachments.push({ filename: file.name, content: Buffer.from(buffer).toString("base64") });
    }

    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;color:#171717;max-width:680px;margin:auto"><tr><td style="padding:32px;background:#171717;color:#F5F2EC"><strong style="letter-spacing:2px">EMA ARTBUILD</strong><br><span style="font-size:13px">NOUVELLE DEMANDE DE DEVIS</span></td></tr><tr><td style="padding:32px;background:#F5F2EC"><p><strong>Nom & prénom</strong><br>${escapeHtml(fields.full_name)}</p><p><strong>Téléphone</strong><br>${escapeHtml(fields.phone)}</p><p><strong>Email</strong><br>${escapeHtml(fields.email)}</p><p><strong>Ville</strong><br>${escapeHtml(fields.city)}</p><p><strong>Type de projet</strong><br>${escapeHtml(fields.project_type)}</p><p><strong>Budget estimatif</strong><br>${escapeHtml(fields.budget || "À définir")}</p><p><strong>Description du projet</strong><br>${escapeHtml(fields.message).replace(/\n/g, "<br>")}</p></td></tr></table>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender, to: [recipient], reply_to: fields.email, subject: `Nouvelle demande de devis — ${fields.full_name}`, html, attachments }),
    });
    if (!response.ok) {
      console.error("Resend rejected quote request", response.status, await response.text());
      return json({ detail: "La demande n'a pas pu être envoyée. Veuillez réessayer." }, 502);
    }
    return json({ message: "Merci, votre demande a bien été envoyée." }, 201);
  } catch (error) {
    console.error("Quote request failed", error);
    return json({ detail: "La demande n'a pas pu être envoyée. Veuillez réessayer." }, 502);
  }
}