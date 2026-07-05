import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveRedirectPath } from "@/lib/mptc/redirect";
import { Button } from "@/components/ui/button";

// Minimal typed wrapper for the Supabase OAuth beta namespace.
interface OAuthClientInfo {
  name?: string;
  client_id?: string;
}
interface OAuthDetails {
  client?: OAuthClientInfo | null;
  redirect_url?: string;
  redirect_to?: string;
}
interface OAuthResponse {
  data: OAuthDetails | null;
  error: { message: string } | null;
}
interface SupabaseAuthOAuth {
  getAuthorizationDetails: (id: string) => Promise<OAuthResponse>;
  approveAuthorization: (id: string) => Promise<OAuthResponse>;
  denyAuthorization: (id: string) => Promise<OAuthResponse>;
}
function oauthNs(): SupabaseAuthOAuth {
  return (supabase.auth as unknown as { oauth: SupabaseAuthOAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Guardamos la URL de consentimiento para volver aquí tras iniciar sesión.
      saveRedirectPath(location.pathname + location.searchStr);
      throw redirect({ to: "/auth" });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthNs().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-lg font-semibold">No se pudo cargar la autorización</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const ns = oauthNs();
    const { data, error } = approve
      ? await ns.approveAuthorization(authorization_id)
      : await ns.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("La autorización no devolvió una URL de redirección.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "una aplicación";

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Conectar {clientName} a tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Vas a permitir que <strong>{clientName}</strong> acceda a MPTC Recambios
          en tu nombre. Podrá consultar las gestiones y clientes de tu taller
          usando tus permisos.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Denegar
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            Autorizar
          </Button>
        </div>
      </div>
    </main>
  );
}
