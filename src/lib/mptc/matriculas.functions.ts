export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  data?: Record<string, unknown>;
  error?: string;
};

export async function lookupPlate({ data }: { data: { `plate`: string } }): Promise<PlateLookupResult> {
  const plate = data.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plate.length < 4) return { ok: false, plate, error: "Matrícula inválida" };

  try {
    const targetUrl = `https://api-license-plate-spain.p.rapidapi.com/es?plate=${encodeURIComponent(plate)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    const res = await fetch(proxyUrl, {
      headers: {
        "x-rapidapi-key": "828a4daeeemsh70039a30f2d1de2p13f5a3jsn9d8c314d8463",
        "x-rapidapi-host": "api-license-plate-spain.p.rapidapi.com",
      }
    });

    if (!res.ok) return { ok: false, plate, error: `Error ${res.status}` };

    const wrapper = await res.json();
    const json = JSON.parse(wrapper.contents);
    const item = Array.isArray(json) ? json[0] : json;

    return { ok: true, plate, data: item };
  } catch (e) {
    return { ok: false, plate, error: "No se pudo consultar la matrícula" };
  }
}
