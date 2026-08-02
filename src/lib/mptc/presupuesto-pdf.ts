// Generación de un PDF de presupuesto (importe con IVA + listado de piezas)
// a partir de una gestión. Todo se hace en el navegador con jsPDF, sin backend.
import { jsPDF } from "jspdf";
import type { Gestion } from "./types";

const IVA_RATE = 0.21;

/** Parte el texto de piezas en líneas limpias (una por pieza). */
export function parsePiezas(piezas?: string | null): string[] {
  return (piezas || "")
    .split("\n")
    .map((l) => l.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean);
}

const eur = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** El importe guardado es con IVA incluido: desglosamos base e IVA. */
export function desglose(importe?: string | null) {
  const total = Number(String(importe ?? "").replace(",", ".")) || 0;
  const base = total / (1 + IVA_RATE);
  return { base, iva: total - base, total };
}

export interface PresupuestoPdfOpts {
  taller?: string | null;
  mecanico?: string | null;
  telefonoTaller?: string | null;
}

export function buildPresupuestoFilename(g: Gestion): string {
  const mat = (g.matricula || "sin-matricula").replace(/[^A-Za-z0-9]/g, "");
  const fecha = new Date(g.created_at || Date.now()).toISOString().slice(0, 10);
  return `presupuesto-${mat}-${fecha}.pdf`;
}

/** Genera y descarga el PDF del presupuesto de una gestión. */
export function downloadPresupuestoPdf(g: Gestion, opts: PresupuestoPdfOpts = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 16;
  const { base, iva, total } = desglose(g.importe);
  let y = M;

  // Cabecera
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.taller || g.taller_nombre || "MPTC Recambios", M, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [opts.mecanico, opts.telefonoTaller].filter(Boolean).join(" · ");
  doc.text(sub || "Presupuesto de reparación", M, 19.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PRESUPUESTO", W - M, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    new Date(g.created_at || Date.now()).toLocaleDateString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
    }),
    W - M, 19.5, { align: "right" },
  );
  doc.setTextColor(17, 24, 39);
  y = 42;

  // Datos vehículo / cliente
  const section = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), M, y);
    y += 2;
    doc.setDrawColor(210, 214, 220);
    doc.line(M, y, W - M, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const cols = (rows: [string, string][], x: number, width: number) => {
    const start = y;
    let yy = y;
    for (const [k, v] of rows) {
      doc.setTextColor(110, 116, 128);
      doc.text(k, x, yy);
      doc.setTextColor(17, 24, 39);
      const lines = doc.splitTextToSize(v || "—", width - 32);
      doc.text(lines, x + 32, yy);
      yy += 5.2 * Math.max(1, lines.length);
    }
    return yy - start;
  };

  section("Vehículo y cliente");
  const half = (W - M * 2) / 2;
  const hL = cols(
    [
      ["Matrícula", g.matricula || "—"],
      ["Vehículo", g.vehiculo || [g.marca, g.modelo].filter(Boolean).join(" ") || "—"],
      ["Motor", g.motor || "—"],
      ["Km", g.km || "—"],
    ],
    M, half - 4,
  );
  const yL = y;
  y = yL;
  const hR = cols(
    [
      ["Cliente", g.cliente_nombre || "—"],
      ["Teléfono", g.cliente_telefono || "—"],
      ["Avería", g.categoria || "—"],
      ["Trabajo", g.subfamilia || "—"],
    ],
    M + half, half,
  );
  y = yL + Math.max(hL, hR) + 6;

  // Listado de piezas
  section("Piezas y trabajos incluidos");
  const piezas = parsePiezas(g.piezas);
  if (piezas.length === 0) {
    doc.setTextColor(110, 116, 128);
    doc.text("Sin piezas registradas.", M, y);
    doc.setTextColor(17, 24, 39);
    y += 7;
  } else {
    piezas.forEach((p, i) => {
      if (y > 250) { doc.addPage(); y = M; }
      doc.setFillColor(i % 2 === 0 ? 246 : 255, i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 249 : 255);
      const lines = doc.splitTextToSize(p, W - M * 2 - 14);
      const h = 5.2 * lines.length + 2;
      doc.rect(M, y - 4, W - M * 2, h, "F");
      doc.setTextColor(110, 116, 128);
      doc.text(String(i + 1).padStart(2, "0"), M + 2, y);
      doc.setTextColor(17, 24, 39);
      doc.text(lines, M + 12, y);
      y += h;
    });
    y += 3;
  }

  if (y > 235) { doc.addPage(); y = M; }

  // Totales
  const boxX = W - M - 78;
  doc.setDrawColor(210, 214, 220);
  doc.roundedRect(boxX, y, 78, 30, 2, 2);
  doc.setFontSize(10);
  const line = (label: string, value: string, yy: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? 17 : 110, bold ? 24 : 116, bold ? 39 : 128);
    doc.text(label, boxX + 5, yy);
    doc.setTextColor(17, 24, 39);
    doc.text(`${value} €`, boxX + 73, yy, { align: "right" });
  };
  line("Base imponible", eur(base), y + 8);
  line("IVA (21%)", eur(iva), y + 15);
  doc.line(boxX + 4, y + 19, boxX + 74, y + 19);
  doc.setFontSize(12);
  line("TOTAL (IVA incl.)", eur(total), y + 26, true);
  y += 38;

  // Notas
  if (g.descripcion) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 116, 128);
    doc.text(doc.splitTextToSize(`Notas: ${g.descripcion}`, W - M * 2), M, y);
  }

  // Pie
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 146, 158);
  doc.text(
    "Presupuesto informativo. Precios con IVA incluido. Validez 15 días salvo variación de tarifas del proveedor.",
    M, 287,
  );

  const filename = buildPresupuestoFilename(g);
  doc.save(filename);
  return { blob: doc.output("blob") as Blob, filename };
}
