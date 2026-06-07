// Geocodificacao de enderecos via Nominatim (OpenStreetMap), restrita a regiao
// de Itajuba-MG. Servico publico e gratuito: respeitar ~1 req/s e enviar um
// identificador no parametro de contato (boa pratica de uso da API).

// Bounding box da regiao monitorada (lon_oeste, lat_sul, lon_leste, lat_norte).
const ITAJUBA_VIEWBOX = {
  lonWest: -45.55,
  latSouth: -22.5,
  lonEast: -45.38,
  latNorth: -22.35,
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeEndereco(query) {
  const termo = String(query || "").trim();
  if (!termo) {
    return null;
  }

  const params = new URLSearchParams({
    q: termo,
    format: "json",
    addressdetails: "0",
    limit: "1",
    countrycodes: "br",
    // bounded=1 + viewbox restringe os resultados a regiao de Itajuba (RF/escopo).
    bounded: "1",
    viewbox: `${ITAJUBA_VIEWBOX.lonWest},${ITAJUBA_VIEWBOX.latNorth},${ITAJUBA_VIEWBOX.lonEast},${ITAJUBA_VIEWBOX.latSouth}`,
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Falha na geocodificacao: ${response.status}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const [first] = results;
  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    label: first.display_name,
  };
}
