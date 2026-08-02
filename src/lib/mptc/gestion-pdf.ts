// Exportación completa de una gestión a PDF: pasos del flujo, fechas,
// resumen de piezas y precio final. Todo en el navegador con jsPDF.
import { jsPDF } from "jspdf";
import type { Gestion } from "./types";
import { FASES, faseDeGestion } from "./fases";
import { parsePiezas, desglose } from "./presupuesto-pdf";
import { EVENTO_LABEL, type GestionEvento } from "./eventos";

const W = 210;
const M = 16;
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [110, 116, 128];

const eur = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fecha = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

export function buildGestionFilename(g: Gestion): string {
  const mat = (g.matricula || "sin-matricula").replace(/[^A-Za-z0-9]/g, "");
  const f = new Date(g.created_at || Date.now()).toISOString().slice(0, 10);
  return `gestion-${mat}-${f}.pdf`;
}

export interface GestionPdfOpts {
  taller?: string | null;
  mecanico?: string | null;
  /** Nombre legible de la avería (familia) y del trabajo (subfamilia). */
  categoriaLabel?: string | null;
  subfamiliaLabel?: string | null;
  eventos?: GestionEvento[];
}

/** Fecha del primer evento de un tipo (los eventos llegan de más nuevo a más antiguo). */
function fechaEvento(eventos: GestionEvento[], tipos: string[]): string | null {
  const list = eventos.filter((e) => tipos.includes(e.tipo));
  if (list.length === 0) return null;
  return list[list.length - 1]!.created_at;
}

/**
 * Genera el PDF de la gestión completa.
 * @param download si es true (por defecto) dispara la descarga en el navegador.
 */
export function downloadGestionPdf(
  g: Gestion,
  opts: GestionPdfOpts = {},
  download = true,
) {
  const eventos = opts.eventos ?? [];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fase = faseDeGestion(g);
  const { base, iva, total } = desglose(g.importe);
  const piezas = parsePiezas(g.piezas);
  let y = M;

  const ink = () => doc.setTextColor(...INK);
  const muted = () => doc.setTextColor(...MUTED);
  const salto = (min = 250) => {
    if (y > min) { doc.addPage(); y = M; }
  };

  // ---------- Cabecera ----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.taller || g.taller_nombre || "MPTC Recambios", M, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.mecanico ? `Mecánico: ${opts.mecanico}` : "Informe de gestión", M, 19.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORME DE GESTIÓN", W - M, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Creada: ${fecha(g.created_at)}`, W - M, 19.5, { align: "right" });
  doc.text(`Exportado: ${fecha(new Date().toISOString())}`, W - M, 25, { align: "right" });
  ink();
  y = 40;

  // Matrícula destacada
  doc.setFont("courier", "bold");
  doc.setFontSize(20);
  doc.text(g.matricula || "—", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  muted();
  doc.text(g.vehiculo || [g.marca, g.modelo].filter(Boolean).join(" ") || "Vehículo sin datos", M, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  ink();
  doc.text(
    fase.rechazado ? "RECHAZADO POR EL CLIENTE" : fase.label.toUpperCase(),
    W - M, y, { align: "right" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  muted();
  doc.text(`Estado: ${g.estado}`, W - M, y + 6, { align: "right" });
  ink();
  y += 16;

  const section = (title: string) => {
    salto(258);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    ink();
    doc.text(title.toUpperCase(), M, y);
    y += 2;
    doc.setDrawColor(210, 214, 220);
    doc.line(M, y, W - M, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const rows = (data: [string, string][], x: number, width: number) => {
    const start = y;
    let yy = y;
    for (const [k, v] of data) {
      muted();
      doc.text(k, x, yy);
      ink();
      const lines = doc.splitTextToSize(v || "—", width - 34) as string[];
      doc.text(lines, x + 34, yy);
      yy += 5.2 * Math.max(1, lines.length);
    }
    return yy - start;
  };

  // ---------- Progreso del flujo (pasos + fechas) ----------
  section("Progreso del flujo");
  const fechasFase: (string | null)[] = [
    g.created_at,
    fechaEvento(eventos, ["plantilla_enviada", "plantilla_reenviada"]),
    fechaEvento(eventos, ["aceptado"]),
    fechaEvento(eventos, ["pedido_confirmado", "pedido_enviado"]),
  ];
  FASES.forEach((f, i) => {
    salto(255);
    const done = i <= fase.index;
    const cy = y - 1.2;
    if (done) doc.setFillColor(...INK); else doc.setFillColor(220, 224, 230);
    doc.circle(M + 2, cy, 2, "F");
    doc.setFont("helvetica", done ? "bold" : "normal");
    ink();
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${f.label}`, M + 8, y);
    muted();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const fch = fechasFase[i];
    doc.text(done ? (fch ? fecha(fch) : "Completado") : "Pendiente", W - M, y, { align: "right" });
    ink();
    doc.setFontSize(10);
    y += 7;
  });
  if (fase.rechazado) {
    muted();
    doc.setFontSize(9);
    const fr = fechaEvento(eventos, ["rechazado"]);
    doc.text(`Rechazado por el cliente${fr ? ` el ${fecha(fr)}` : ""}.`, M + 8, y);
    ink();
    doc.setFontSize(10);
    y += 6;
  }
  y += 2;

  // ---------- Datos ----------
  section("Paso 1 · Vehículo");
  const half = (W - M * 2) / 2;
  const yV = y;
  const hL = rows(
    [
      ["Matrícula", g.matricula || "—"],
      ["Marca / Modelo", [g.marca, g.modelo].filter(Boolean).join(" ") || "—"],
      ["Motor", g.motor || "—"],
    ],
    M, half - 4,
  );
  y = yV;
  const hR = rows(
    [
      ["Km", g.km || "—"],
      ["Matriculación", g.fecha_matriculacion || "—"],
      ["VIN", g.vin || "—"],
    ],
    M + half, half,
  );
  y = yV + Math.max(hL, hR) + 6;

  section("Paso 2 · Cliente");
  y += rows(
    [
      ["Cliente", g.cliente_nombre || "—"],
      ["Teléfono", g.cliente_telefono || "—"],
      ["Fotos adjuntas", String((g.fotos || []).length)],
    ],
    M, W - M * 2,
  ) + 6;

  section("Paso 3 · Avería");
  y += rows(
    [
      ["Familia", opts.categoriaLabel || g.categoria || "—"],
      ["Trabajo", opts.subfamiliaLabel || g.subfamilia || "—"],
      ["Objeción", g.objecion || "—"],
      ["Descripción", g.descripcion || "—"],
    ],
    M, W - M * 2,
  ) + 6;

  // ---------- Piezas ----------
  section("Paso 4 · Resumen de piezas (consulta a Grupo Peña)");
  if (piezas.length === 0) {
    muted();
    doc.text("Sin piezas registradas.", M, y);
    ink();
    y += 7;
  } else {
    piezas.forEach((p, i) => {
      salto(250);
      const lines = doc.splitTextToSize(p, W - M * 2 - 14) as string[];
      const h = 5.2 * lines.length + 2;
      const alt = i % 2 === 0;
      doc.setFillColor(alt ? 246 : 255, alt ? 247 : 255, alt ? 249 : 255);
      doc.rect(M, y - 4, W - M * 2, h, "F");
      muted();
      doc.text(String(i + 1).padStart(2, "0"), M + 2, y);
      ink();
      doc.text(lines, M + 12, y);
      y += h;
    });
    y += 3;
  }

  // ---------- Precio final ----------
  salto(232);
  const boxX = W - M - 78;
  doc.setDrawColor(210, 214, 220);
  doc.roundedRect(boxX, y, 78, 30, 2, 2);
  const line = (label: string, value: string, yy: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (bold) ink(); else muted();
    doc.text(label, boxX + 5, yy);
    ink();
    doc.text(`${value} €`, boxX + 73, yy, { align: "right" });
  };
  doc.setFontSize(10);
  line("Base imponible", eur(base), y + 8);
  line("IVA (21%)", eur(iva), y + 15);
  doc.line(boxX + 4, y + 19, boxX + 74, y + 19);
  doc.setFontSize(12);
  line("PRECIO FINAL", eur(total), y + 26, true);
  doc.setFontSize(10);
  y += 38;

  // ---------- Plantilla enviada ----------
  if (g.mensaje) {
    section("Paso 5 · Plantilla enviada al cliente");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(g.mensaje, W - M * 2) as string[];
    for (const l of lines) {
      salto(275);
      doc.text(l, M, y);
      y += 4.4;
    }
    doc.setFontSize(10);
    y += 4;
  }

  // ---------- Historial ----------
  if (eventos.length > 0) {
    section("Historial de la gestión");
    doc.setFontSize(9);
    for (const e of [...eventos].reverse()) {
      salto(272);
      muted();
      doc.text(fecha(e.created_at), M, y);
      ink();
      const label = EVENTO_LABEL[e.tipo] || e.tipo;
      const txt = doc.splitTextToSize(
        label + (e.actor ? ` · ${e.actor}` : ""),
        W - M * 2 - 40,
      ) as string[];
      doc.text(txt, M + 40, y);
      y += 4.8 * Math.max(1, txt.length);
    }
    doc.setFontSize(10);
  }

  // ---------- Pie en todas las páginas ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 146, 158);
    doc.text(
      "Informe informativo de gestión. Precios con IVA incluido, sujetos a variación de tarifas del proveedor.",
      M, 287,
    );
    doc.text(`${p}/${pages}`, W - M, 287, { align: "right" });
  }

  const filename = buildGestionFilename(g);
  if (download) doc.save(filename);
  return { blob: doc.output("blob") as Blob, filename };
}
