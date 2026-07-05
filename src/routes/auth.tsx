import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, syncProfileToSettings } from "@/lib/mptc/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/mptc/profiles";
import { pickPostLoginPath } from "@/lib/mptc/redirect";

// Solo guardamos el email para autocompletar en el próximo acceso.
// La contraseña la gestiona el navegador (password manager) mediante los
// atributos estándar `autoComplete` del formulario.
const REMEMBER_EMAIL_KEY = "mptc_remember_email_v1";
// Clave legacy que llegó a guardar email+contraseña ofuscados en base64;
// la limpiamos al arrancar para no dejar credenciales en localStorage.
const LEGACY_REMEMBER_KEY = "mptc_remember_v1";

function translateAuthError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("password is known to be weak") || m.includes("pwned") || m.includes("weak and easy to guess")) {
    return "La contraseña es demasiado débil o ha aparecido en filtraciones conocidas. Elige otra distinta.";
  }
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Debes confirmar tu email antes de iniciar sesión.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Ya existe una cuenta con ese email.";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many requests")) return "Demasiados intentos. Espera unos segundos e inténtalo de nuevo.";
  if (m.includes("network")) return "Error de red. Comprueba tu conexión e inténtalo de nuevo.";
  return msg;
}

function loadRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Migración: elimina la clave legacy que guardaba también la contraseña.
    window.localStorage.removeItem(LEGACY_REMEMBER_KEY);
    const v = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    return v && typeof v === "string" ? v : null;
  } catch { return null; }
}

function saveRememberedEmail(email: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(REMEMBER_EMAIL_KEY, email); } catch { /* noop */ }
}

function clearRememberedEmail() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(REMEMBER_EMAIL_KEY); } catch { /* noop */ }
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso · MPTC" },
      { name: "description", content: "Inicia sesión en MPTC Taller Conectado." },
    ],
  }),
  component: AuthPage,
});

const PREDEFINED: { role: Role; id: string; label: string }[] = [
  { role: "taller-1", id: "taller-1-mtc-recambios", label: "Taller 1" },
  { role: "taller-2", id: "taller-2-mtc-recambios", label: "Taller 2" },
  { role: "taller-3", id: "taller-3-tecniauto-express-marbella", label: "TecniAuto Express Marbella" },
  { role: "taller-4", id: "taller-4-mecanica-autofran", label: "Mecánica Autofran" },
  { role: "taller-5", id: "taller-5-boxes-team-marbella", label: "Boxes Team Marbella" },
];

interface TallerOption {
  value: string; // "pena" o taller_id
  label: string;
  role: Role;
  tallerId?: string; // override para talleres dinámicos
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"taller" | "pena">("taller");
  const [selected, setSelected] = useState<string>(""); // taller_id seleccionado (solo si accountType === "taller")
  const [tallerName, setTallerName] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [options, setOptions] = useState<TallerOption[] | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const roleFallback = (r: Role | undefined | null) =>
    r === "admin" ? "/admin/talleres" : r === "pena" ? "/pena" : "/app";

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("disabled") === "1") {
      setError("Tu taller ha sido desactivado. Contacta con el administrador.");
    }
    // Prefill del email recordado (la contraseña la autocompleta el navegador).
    const savedEmail = loadRememberedEmail();
    if (savedEmail) { setEmail(savedEmail); setRemember(true); }
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const p = await syncProfileToSettings();
      navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
    });
    supabase.from("talleres").select("taller_id,nombre,activo").then(({ data }) => {
      if (cancelled) return;
      const rows = (data || []).filter((t: any) => t.activo);
      const opts: TallerOption[] = [];
      // Talleres predefinidos que sigan activos: usan su rol propio.
      for (const p of PREDEFINED) {
        if (rows.some((t: any) => t.taller_id === p.id)) {
          const nombre = rows.find((t: any) => t.taller_id === p.id)?.nombre || p.label;
          opts.push({ value: p.id, label: nombre, role: p.role });
        }
      }
      // Talleres dinámicos (no predefinidos): usan role="taller-1" con override de taller_id.
      for (const t of rows as any[]) {
        if (PREDEFINED.some((p) => p.id === t.taller_id)) continue;
        opts.push({ value: t.taller_id, label: t.nombre, role: "taller-1", tallerId: t.taller_id });
      }
      // NOTA: la opción "Grupo Peña" ya no forma parte de este listado; ahora
      // se elige mediante el selector superior "Tipo de cuenta".
      setOptions(opts);
      if (opts.length) setSelected(opts[0].value);
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        if (remember) saveRememberedEmail(email); else clearRememberedEmail();
        const p = await syncProfileToSettings();
        navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
      } else {
        if (accountType === "pena") {
          const { error } = await signUp({
            email, password,
            role: "pena",
            tallerName: tallerName || "Grupo Peña",
            ciudad, mecanico,
          });
          if (error) throw error;
        } else {
          const opt = (options || []).find((o) => o.value === selected);
          if (!opt) throw new Error("Selecciona un taller");
          // opt.value ES siempre el taller_id definitivo en BD (talleres
          // predefinidos y dinámicos), así garantizamos que el perfil se
          // crea vinculado al taller seleccionado y no al fallback por rol.
          const { error } = await signUp({
            email, password,
            role: opt.role,
            tallerId: opt.value,
            tallerName: tallerName || opt.label,
            ciudad, mecanico,
          });
          if (error) throw error;
          setInfo(`Cuenta creada y vinculada a "${opt.label}" (taller_id: ${opt.value}). Inicia sesión para continuar.`);
          setMode("login");
          return;
        }
        setInfo("Cuenta creada como Grupo Peña. Inicia sesión para continuar.");
        setMode("login");
      }
    } catch (err: any) {
      setError(translateAuthError(err?.message || "No se pudo completar la acción"));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border-strong bg-surface p-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-3 text-xl font-bold">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">MPTC · Taller Conectado</p>
        </header>

        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Contraseña</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Recordar mi usuario en este dispositivo
          </label>
        )}

        {mode === "signup" && (
          <>
            <label className="block text-sm">
              <span className="text-muted-foreground">Tipo de cuenta</span>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as "taller" | "pena")}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                <option value="taller">Taller</option>
                <option value="pena">Grupo Peña (comercial)</option>
              </select>
            </label>

            {accountType === "taller" && (
              <>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Taller</span>
                  <select value={selected} onChange={(e) => setSelected(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    {(options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>

                {(() => {
                  const opt = (options || []).find((o) => o.value === selected);
                  if (!opt) return null;
                  return (
                    <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
                      <div>
                        Se guardará vinculado a <span className="font-medium text-foreground">{opt.label}</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-muted-foreground/80">taller_id:</span>{" "}
                        <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-foreground">{opt.value}</code>
                      </div>
                    </div>
                  );
                })()}

                <label className="block text-sm">
                  <span className="text-muted-foreground">Nombre del taller (opcional)</span>
                  <input value={tallerName} onChange={(e) => setTallerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Ciudad</span>
                    <input value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Mecánico</span>
                    <input value={mecanico} onChange={(e) => setMecanico(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
                  </label>
                </div>
              </>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {info && <p className="text-sm text-emerald-500">{info}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        <button type="button" onClick={() => { setError(null); setInfo(null); setMode(mode === "login" ? "signup" : "login"); }}
          className="w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "login" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
