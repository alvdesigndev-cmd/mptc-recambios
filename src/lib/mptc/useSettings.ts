import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loadSettings, type AppSettings } from "./profiles";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "./auth";

export function useSettings(opts?: { requireTaller?: boolean }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/login" }); return; }
      let s = loadSettings();
      if (!s) {
        const p = await syncProfileToSettings();
        if (!p) { navigate({ to: "/login" }); return; }
        s = loadSettings();
      }
      if (!s || !active) return;
      if (opts?.requireTaller && s.role === "pena") { navigate({ to: "/pena" }); return; }
      setSettings(s);
    })();
    return () => { active = false; };
  }, [navigate, opts?.requireTaller]);
  return settings;
}
