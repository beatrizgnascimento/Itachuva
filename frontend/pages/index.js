import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import CardDetalhes from "../components/CardDetalhes";
import ModalRelato from "../components/ModalRelato";
import { getRiskLevel } from "../lib/risco";
import { geocodeEndereco } from "../lib/geocode";

const MapaInterativo = dynamic(() => import("../components/MapaInterativo"), {
  ssr: false,
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ITAJUBA_CENTER = { latitude: -22.4247, longitude: -45.4601 };

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [climaData, setClimaData] = useState(null);
  const [position, setPosition] = useState(ITAJUBA_CENTER);
  // RNP08 - feedback visual e textual imediato para acoes de envio.
  const [feedback, setFeedback] = useState(null);
  // Busca por endereco (geocodificacao restrita a Itajuba).
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  // Relato em ponto escolhido no mapa.
  const [picking, setPicking] = useState(false);
  const [reportLocation, setReportLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/clima`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar clima: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setClimaData(data);
        }
      })
      .catch((error) => {
        console.error("Falha ao carregar clima", error);
      });

    return () => {
      active = false;
    };
  }, []);

  // RF04 - obter a posicao real do usuario para registrar a ocorrencia.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFeedback({
        type: "error",
        message: "Geolocalizacao nao suportada neste navegador.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (error) => {
        // Torna o motivo visivel para diagnostico (1=permissao, 2=indisponivel, 3=timeout).
        console.warn("Geolocalizacao indisponivel", error.code, error.message);
        setFeedback({
          type: "error",
          message: `GPS indisponivel (codigo ${error.code}: ${error.message}). Usando centro de Itajuba.`,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  // RNP08 - some o feedback automaticamente apos alguns segundos.
  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleSubmit = async (nivel, descricao, tipo) => {
    if (!nivel || sending) {
      return;
    }

    const loc = reportLocation || position;
    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nivel,
          descricao,
          tipo,
          origem: "frontend",
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao enviar relato: ${response.status}`);
      }

      setFeedback({
        type: "success",
        message: "Relato enviado! Sua regiao sera atualizada em ate 20 min.",
      });
      setModalOpen(false);
      setReportLocation(null);
    } catch (error) {
      console.error("Falha ao enviar relato", error);
      setFeedback({
        type: "error",
        message: "Nao foi possivel enviar o relato. Tente novamente.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const termo = searchQuery.trim();
    if (!termo || searching) {
      return;
    }

    setSearching(true);
    try {
      const result = await geocodeEndereco(termo);
      if (!result) {
        setSearchTarget(null);
        setFeedback({
          type: "error",
          message: "Endereco nao encontrado na regiao de Itajuba.",
        });
        return;
      }

      setSearchTarget(result);
      mapRef.current?.flyTo([result.latitude, result.longitude], 16);
    } catch (error) {
      console.error("Falha na busca de endereco", error);
      setFeedback({
        type: "error",
        message: "Nao foi possivel buscar o endereco. Tente novamente.",
      });
    } finally {
      setSearching(false);
    }
  };

  // Relatar usando a localizacao atual (GPS) do usuario.
  const openGpsReport = () => {
    setReportLocation(position);
    setPicking(false);
    setModalOpen(true);
  };

  // Entra no modo "escolher local no mapa".
  const startPicking = () => {
    setSelectedFeature(null);
    setReportLocation(null);
    setPicking(true);
  };

  // Usuario tocou num ponto do mapa para registrar a ocorrencia ali.
  const handleMapPick = (latlng) => {
    if (!latlng) {
      return;
    }
    setReportLocation({ latitude: latlng.lat, longitude: latlng.lng });
    setPicking(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setReportLocation(null);
  };

  const selectedProps = selectedFeature?.properties || null;
  // RF03 - risco do local selecionado ou da posicao atual, na escala de 5 niveis.
  const riskSource = selectedProps?.grau_risco ?? climaData?.grau_risco ?? "nenhum";
  const nivelAtual = getRiskLevel(riskSource);
  const displayedMetrics = selectedProps
      ? {
          temperatura: selectedProps.temperatura,
          chuva_mm: selectedProps.chuva_mm,
          umidade: selectedProps.umidade,
        }
      : {
          temperatura: climaData?.temperatura_c,
          chuva_mm: climaData?.chuva_mm,
          umidade: climaData?.umidade,
        };
  const hasDetalhes = Boolean(selectedProps);
  const activeLocation = reportLocation || position;
  const localLabel = reportLocation
    ? `Local escolhido: Lat ${activeLocation.latitude.toFixed(4)}, Lon ${activeLocation.longitude.toFixed(4)}`
    : `Sua localizacao: Lat ${activeLocation.latitude.toFixed(4)}, Lon ${activeLocation.longitude.toFixed(4)}`;
  const currentLocationProps = useMemo(() => {
    if (!climaData) {
      return null;
    }

    return {
      properties: {
        chuva_mm: climaData.chuva_mm,
        temperatura: climaData.temperatura_c,
        umidade: climaData.umidade,
        grau_risco: climaData.grau_risco,
      },
    };
  }, [climaData]);

  const cardMetricas = [
    {
      label: "Temperatura:",
      value:
        displayedMetrics.temperatura !== undefined &&
        displayedMetrics.temperatura !== null
          ? `${displayedMetrics.temperatura} C`
          : "-",
      icon: "/icons/thermometer.svg",
    },
    {
      label: "Chuva (mm):",
      value: displayedMetrics.chuva_mm ?? "-",
      icon: "/icons/cloud-rain.svg",
    },
    {
      label: "Umidade:",
      value:
        displayedMetrics.umidade !== undefined &&
        displayedMetrics.umidade !== null
          ? `${displayedMetrics.umidade}%`
          : "-",
      icon: "/icons/humidity.svg",
    },
  ];

  return (
    <div className="relative isolate h-screen w-full overflow-hidden bg-riverLight">
      <MapaInterativo
        className="absolute inset-0 z-0"
        onFeatureClick={(feature) => setSelectedFeature(feature)}
        onMapClick={() => setSelectedFeature(null)}
        onCurrentLocationClick={() => setSelectedFeature(currentLocationProps)}
        searchTarget={searchTarget}
        picking={picking}
        onMapPick={handleMapPick}
        reportPoint={reportLocation}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-40 flex flex-col">
        <header className="pointer-events-auto bg-gradient-to-b from-river to-river/90 text-white shadow-soft">
          <div className="flex items-center gap-3 px-4 py-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <div className="flex flex-col gap-1">
                <span className="h-0.5 w-4 rounded-full bg-white" />
                <span className="h-0.5 w-4 rounded-full bg-white" />
                <span className="h-0.5 w-4 rounded-full bg-white" />
              </div>
            </button>
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold tracking-[0.4em]">ITACHUVA</p>
              <p className="text-[11px] text-white/80">Itajuba-MG</p>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 00-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
          </div>
        </header>

        <div className="pointer-events-auto px-4 pt-3 md:max-w-sm md:px-6">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-float"
          >
            <span className="text-slate-400">&#x1F50D;</span>
            <input
              className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
              placeholder="Procurar endereco em Itajuba..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Procurar endereco"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg bg-river px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {searching ? "..." : "Buscar"}
            </button>
          </form>

          <CardDetalhes
            className="mt-3"
            riskLabel={riskSource}
            metricas={cardMetricas}
          />
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-44 z-40 flex flex-col gap-2">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-2xl font-semibold leading-none text-river shadow-float"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Aproximar"
          title="Aproximar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-2xl font-semibold leading-none text-river shadow-float"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Afastar"
          title="Afastar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {selectedProps ? (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 w-[92%] -translate-x-1/2 rounded-3xl bg-white/95 p-4 shadow-float md:bottom-6 md:max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Detalhes do local
          </p>
          <p className="mt-1 text-base font-semibold text-storm">
            {selectedProps.id ? `Area ${selectedProps.id}` : "Area monitorada"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Risco:</span>
            <span className={`font-semibold ${nivelAtual.textClass}`}>
              {nivelAtual.label.toUpperCase()}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" />
          {/* RF05 - recomendacao de seguranca para o local selecionado */}
          <p className="mt-2 text-xs leading-snug text-slate-600">
            {nivelAtual.recomendacao}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <img
                src="/icons/thermometer.svg"
                alt=""
                className="mx-auto h-5 w-5"
                aria-hidden="true"
              />
              <p className="mt-1 text-slate-400">Temperatura</p>
              <p className="mt-1 text-sm font-semibold text-storm">
                {displayedMetrics.temperatura ?? "-"} C
              </p>
            </div>
            <div>
              <img
                src="/icons/cloud-rain.svg"
                alt=""
                className="mx-auto h-5 w-5"
                aria-hidden="true"
              />
              <p className="text-slate-400">Chuvas (mm)</p>
              <p className="mt-1 text-sm font-semibold text-storm">
                {displayedMetrics.chuva_mm ?? "-"}
              </p>
            </div>
            <div>
              <img
                src="/icons/humidity.svg"
                alt=""
                className="mx-auto h-5 w-5"
                aria-hidden="true"
              />
              <p className="text-slate-400">Umidade</p>
              <p className="mt-1 text-sm font-semibold text-storm">
                {displayedMetrics.umidade !== undefined &&
                displayedMetrics.umidade !== null
                  ? `${displayedMetrics.umidade}%`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute bottom-4 left-4 z-40 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-float">
        Atualizado ha 2 min.
      </div>

      {/* RNP08 - feedback visual imediato de envio */}
      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-auto absolute left-1/2 top-40 z-50 w-[88%] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-float md:max-w-sm ${
            feedback.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-alert text-white"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Banner do modo de selecao de local no mapa */}
      {picking ? (
        <div className="pointer-events-auto absolute left-1/2 top-40 z-50 flex w-[88%] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-river px-4 py-3 text-sm font-semibold text-white shadow-float md:max-w-sm">
          <span>Toque no mapa para marcar o local do relato.</span>
          <button
            className="rounded-full bg-white/20 px-3 py-1 text-xs"
            onClick={() => setPicking(false)}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <div
        className={`pointer-events-auto absolute right-4 z-40 flex flex-col items-end gap-3 ${
          hasDetalhes ? "bottom-48" : "bottom-6"
        } md:bottom-6`}
      >
        {/* Escolher um ponto no mapa para relatar ali */}
        <button
          className="flex items-center gap-2"
          onClick={startPicking}
          aria-label="Escolher local no mapa para relatar"
        >
          <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-float">
            Escolher no mapa
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-river text-white shadow-float">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
        </button>

        {/* Relatar na localizacao atual (GPS) */}
        <button
          className="flex items-center gap-2"
          onClick={openGpsReport}
          aria-label="Relatar evento na minha localizacao"
        >
          <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-float">
            Relatar evento
          </span>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-alert text-xl font-bold text-white shadow-float">
            !
          </span>
        </button>
      </div>

      <ModalRelato
        open={modalOpen}
        sending={sending}
        localLabel={localLabel}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
