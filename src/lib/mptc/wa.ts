// WhatsApp helpers — mismas reglas que la app HTML original.

function normalizePhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 9 ? "34" + digits : digits;
}

export function buildWAUrl(phone: string, msg: string) {
  const final = normalizePhone(phone);
  const text = encodeURIComponent(msg);
  // wa.me funciona tanto en móvil como en escritorio y redirige según el
  // dispositivo. Evitamos api.whatsapp.com y web.whatsapp.com porque algunos
  // navegadores los bloquean con ERR_BLOCKED_BY_RESPONSE al abrirlos así.
  return `https://wa.me/${final}?text=${text}`;
}

export function openWA(phone: string, msg: string) {
  if (typeof window === "undefined") return;
  window.open(buildWAUrl(phone, msg), "_blank");
}

export function generateToken(): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${t}${r}`;
}
