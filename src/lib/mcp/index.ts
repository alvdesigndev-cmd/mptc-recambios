import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGestiones from "./tools/list_gestiones";
import searchClientes from "./tools/search_clientes";
import getPerfil from "./tools/get_perfil";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mptc-recambios-mcp",
  title: "MPTC Recambios",
  version: "0.1.0",
  instructions:
    "Herramientas para consultar gestiones y clientes del taller del usuario autenticado en MPTC Recambios. Todas las lecturas están restringidas al taller del usuario mediante RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGestiones, searchClientes, getPerfil],
});
