// WhatsApp helpers — mismas reglas que la app HTML original.

export function buildWAUrl(phone: string, msg: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const final = digits.length === 9 ? "34" + digits : digits;
  return `https://wa.me/${final}?text=${encodeURIComponent(msg)}`;
}

export function openWA(phone: string, msg: string) {
  if (typeof window === "undefined") return;
  window.open(buildWAUrl(phone, msg), "_blank", "noopener,noreferrer");
}

export function generateToken(): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${t}${r}`;
}
