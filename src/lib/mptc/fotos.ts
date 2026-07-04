import { supabase } from "@/integrations/supabase/client";

const BUCKET = "fotos-gestiones";

/** Extract the object path within the bucket from either a stored public URL or a raw path. */
export function extractFotoPath(url: string): string | null {
  if (!url) return null;
  // Already a bucket path (no protocol)
  if (!/^https?:\/\//i.test(url)) {
    return url.replace(/^\/+/, "").replace(new RegExp(`^${BUCKET}/`), "").split("?")[0] || null;
  }
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0] || null;
}

/** Resolve stored foto URLs into fresh signed URLs (fallback: original URL). */
export async function resolveFotoUrls(urls: string[], expiresIn = 3600): Promise<string[]> {
  if (!urls?.length) return [];
  const paths = urls.map(extractFotoPath);
  const validPaths = paths.filter((p): p is string => !!p);
  if (!validPaths.length) return urls;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(validPaths, expiresIn);
  if (error || !data) return urls;
  const map = new Map<string, string>();
  data.forEach((row) => {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  });
  return urls.map((u, i) => {
    const p = paths[i];
    return (p && map.get(p)) || u;
  });
}
