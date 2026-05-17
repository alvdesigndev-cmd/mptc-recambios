import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loadSettings, type AppSettings } from "./profiles";

export function useSettings(opts?: { requireTaller?: boolean }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    const s = loadSettings();
    if (!s) { navigate({ to: "/" }); return; }
    if (opts?.requireTaller && s.role === "pena") { navigate({ to: "/pena" }); return; }
    setSettings(s);
  }, [navigate, opts?.requireTaller]);
  return settings;
}
