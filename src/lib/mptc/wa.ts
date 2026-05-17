// WhatsApp helpers — mismas reglas que la app HTML original.

function normalizePhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 9 ? "34" + digits : digits;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function buildWAUrl(phone: string, msg: string) {
  const final = normalizePhone(phone);
  const text = encodeURIComponent(msg);
  // En escritorio, wa.me redirige a api.whatsapp.com que a veces responde con
  // cabeceras que el navegador bloquea (ERR_BLOCKED_BY_RESPONSE). Vamos
  // directos a web.whatsapp.com en desktop y a wa.me en móvil.
  if (isMobile()) {
    return `https://wa.me/${final}?text=${text}`;
  }
  return `https://web.whatsapp.com/send?phone=${final}&text=${text}`;
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
