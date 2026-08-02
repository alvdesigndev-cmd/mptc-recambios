import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, syncProfileToSettings, normalizeEmail } from "@/lib/mptc/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/mptc/profiles";
import { pickPostLoginPath } from "@/lib/mptc/redirect";

import {
  clearSavedCredentials,
  readSavedCredentials,
  writeSavedCredentials,
  type LoginProfile,
} from "@/lib/mptc/credentials-transfer";

// Guardamos email, contraseña y perfil cuando el usuario marca "Guardar mis
// credenciales". La contraseña se cifra con AES-GCM usando una clave no
// exportable propia del dispositivo (ver `device-crypto`) y se descifra al
// abrir la app para poder entrar automáticamente.
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

async function loadRemembered(): Promise<{ email: string | null; password: string | null; profile: LoginProfile | null }> {
  if (typeof window === "undefined") return { email: null, password: null, profile: null };
  try {
    window.localStorage.removeItem(LEGACY_REMEMBER_KEY);
    const saved = await readSavedCredentials();
    if (!saved) return { email: null, password: null, profile: null };
    return { email: saved.email, password: saved.password, profile: saved.profile };
  } catch { return { email: null, password: null, profile: null }; }
}

async function saveRemembered(email: string, password: string, profile: LoginProfile) {
  await writeSavedCredentials({ email, password, profile });
}

function clearRemembered() {
  clearSavedCredentials();
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

// Roles de taller válidos (deben coincidir con los prefijos aceptados por el
// trigger `handle_new_user` en la base de datos).
const ALLOWED_TALLER_ROLES: Role[] = ["taller-1", "taller-2", "taller-3", "taller-4", "taller-5"];

// Deriva el rol a partir del prefijo del taller_id ("taller-3-xxx" → "taller-3").
// Devuelve null si el taller_id no cumple con el patrón permitido.
function deriveRoleFromTallerId(id: string): Role | null {
  const m = /^(taller-[1-5])(?:-.*)?$/.exec(id || "");
  if (!m) return null;
  const r = m[1] as Role;
  return ALLOWED_TALLER_ROLES.includes(r) ? r : null;
}

interface TallerOption {
  value: string; // taller_id
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
  // Perfil de acceso elegido en el login: sirve para validar el rol real de la
  // cuenta y redirigir al panel correspondiente.
  const [loginProfile, setLoginProfile] = useState<LoginProfile>("taller");
  // Acceso automático con credenciales guardadas.
  const [autoLogin, setAutoLogin] = useState(false);


  const roleFallback = (r: Role | undefined | null) =>
    r === "admin" ? "/admin/talleres" : r === "pena" ? "/pena" : "/app";

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("disabled") === "1") {
      setError("Tu taller ha sido desactivado. Contacta con el administrador.");
    }

    let cancelled = false;

    (async () => {
      // Prefill del email, contraseña (descifrada) y perfil recordados.
      const saved = await loadRemembered();
      if (cancelled) return;
      if (saved.email) { setEmail(saved.email); setRemember(true); }
      if (saved.password) { setPassword(saved.password); }
      if (saved.profile) setLoginProfile(saved.profile);

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        const p = await syncProfileToSettings();
        if (cancelled) return;
        navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
        return;
      }
      // Sin sesión activa: si hay credenciales guardadas entramos solos.
      if (!saved.email || !saved.password) return;
      setAutoLogin(true);
      try {
        const { error } = await signIn(saved.email, saved.password);
        if (error) throw error;
        const p = await syncProfileToSettings();
        if (cancelled) return;
        navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
      } catch {
        // Credenciales caducadas: las limpiamos y dejamos el formulario manual.
        clearRemembered();
        setPassword("");
        if (!cancelled) setError("Tus credenciales guardadas ya no son válidas. Vuelve a introducirlas.");
      } finally {
        if (!cancelled) setAutoLogin(false);
      }
    })();


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
      // Talleres dinámicos (no predefinidos): sólo se aceptan si su taller_id
      // sigue el patrón "taller-N-..." (N = 1..5). Esto refleja la validación
      // del trigger `handle_new_user`, que rechaza cualquier taller_id que no
      // comience por el prefijo del rol. Los que no cumplan quedan fuera del
      // desplegable para evitar que el usuario seleccione opciones no válidas.
      for (const t of rows as any[]) {
        if (PREDEFINED.some((p) => p.id === t.taller_id)) continue;
        const role = deriveRoleFromTallerId(t.taller_id);
        if (!role) continue;
        opts.push({ value: t.taller_id, label: t.nombre, role, tallerId: t.taller_id });
      }
      setOptions(opts);
      if (opts.length) setSelected(opts[0].value);
      else setSelected("");
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === "forgot") {
        if (!email) throw new Error("Introduce tu email");
        const redirectTo = typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
        if (error) throw error;
        setInfo("Te hemos enviado un correo con un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).");
        return;
      }
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        if (remember) await saveRemembered(email, password, loginProfile); else clearRemembered();
        const p = await syncProfileToSettings();
        const role = p?.role;
        const isTaller = !!role && role !== "admin" && role !== "pena";
        const matches =
          (loginProfile === "admin" && role === "admin") ||
          (loginProfile === "pena" && role === "pena") ||
          (loginProfile === "taller" && isTaller);

        if (!matches) {
          await supabase.auth.signOut();
          const nombre = role === "admin" ? "Administrador" : role === "pena" ? "Grupo Peña" : "Taller";
          throw new Error(`Esta cuenta no es de tipo ${loginProfile === "admin" ? "Administrador" : loginProfile === "pena" ? "Grupo Peña" : "Taller"}. Es una cuenta de ${nombre}.`);
        }
        navigate({ to: pickPostLoginPath(roleFallback(role)) as any, replace: true });
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
          if (!opt) throw new Error("Selecciona un taller válido");
          // Validación cliente: el taller_id debe coincidir con el prefijo
          // del rol permitido. Esto refleja la comprobación del trigger en
          // la base de datos y evita enviar una petición condenada a fallar.
          const derived = deriveRoleFromTallerId(opt.value);
          if (!derived || derived !== opt.role) {
            throw new Error("El taller seleccionado no es válido para el rol asignado.");
          }
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
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border-strong bg-surface p-5 sm:p-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-3 text-lg font-bold sm:text-xl">
            {mode === "login" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">MPTC · Taller Conectado</p>
        </header>

        {mode === "login" && (
          <div>
            <span className="text-sm text-muted-foreground">Acceder como</span>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([
                { v: "taller", label: "Taller" },
                { v: "admin", label: "Administrador" },
                { v: "pena", label: "Grupo Peña" },
              ] as const).map((o) => (

                <button
                  key={o.v}
                  type="button"
                  aria-pressed={loginProfile === o.v}
                  onClick={() => { setError(null); setLoginProfile(o.v); }}
                  className={`truncate rounded-lg border px-3 py-2 text-[13px] font-medium leading-tight transition sm:px-2 ${
                    loginProfile === o.v
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}




        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input type="text" inputMode="email" autoCapitalize="none" spellCheck={false} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </label>
        {mode !== "forgot" && (
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
        )}

        {mode === "login" && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => { setRemember(e.target.checked); if (!e.target.checked) clearRemembered(); }}
                className="h-4 w-4 rounded border-border"
              />
              Guardar mis credenciales y entrar automáticamente
            </label>
            <p className="pl-6 text-[11px] text-muted-foreground/80">
              La próxima vez accederás directo a tu panel en este dispositivo.
            </p>
          </div>
        )}

        {autoLogin && (
          <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-muted-foreground">
            Accediendo con tus credenciales guardadas…
          </p>
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
                    required
                    disabled={!options || options.length === 0}
                    className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm disabled:opacity-60">
                    {options === null && <option value="">Cargando talleres…</option>}
                    {options && options.length === 0 && <option value="">No hay talleres disponibles</option>}
                    {(options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                {options && options.length === 0 && (
                  <p className="text-xs text-destructive">
                    No hay talleres activos válidos. Contacta con el administrador antes de crear la cuenta.
                  </p>
                )}

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

        <button type="submit" disabled={loading || autoLogin}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">

          {loading
            ? "Procesando…"
            : mode === "login"
              ? "Entrar"
              : mode === "signup"
                ? "Crear cuenta"
                : "Enviar enlace de recuperación"}
        </button>

        {mode === "login" && (
          <button type="button"
            onClick={() => { setError(null); setInfo(null); setPassword(""); setMode("forgot"); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground">
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button type="button"
          onClick={() => {
            setError(null); setInfo(null);
            if (mode === "forgot") setMode("login");
            else setMode(mode === "login" ? "signup" : "login");
          }}
          className="w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "login"
            ? "¿No tienes cuenta? Crear una"
            : mode === "signup"
              ? "Ya tengo cuenta"
              : "Volver al inicio de sesión"}
        </button>
      </form>
    </div>
  );
}
