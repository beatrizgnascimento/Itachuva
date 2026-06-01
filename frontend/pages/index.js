import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import CardDetalhes from "../components/CardDetalhes";
import ModalRelato from "../components/ModalRelato";

const MapaInterativo = dynamic(() => import("../components/MapaInterativo"), {
  ssr: false,
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [climaData, setClimaData] = useState(null);
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

  const handleSubmit = async (nivel, descricao, tipo) => {
    if (!nivel || sending) {
      return;
    }

    setSending(true);
    try {
      await fetch(`${API_BASE}/api/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nivel,
          descricao,
          tipo,
          origem: "frontend",
          latitude: -22.4247,
          longitude: -45.4601,
        }),
      });
    } catch (error) {
      console.error("Falha ao enviar relato", error);
    } finally {
      setSending(false);
      setModalOpen(false);
    }
  };

  const selectedProps = selectedFeature?.properties || null;
  const climateRisk = climaData?.grau_risco?.toUpperCase();
  const selectedRisk = selectedProps?.grau_risco
    ? selectedProps.grau_risco.toUpperCase()
    : climateRisk || "ALTO";
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
      value: displayedMetrics.temperatura ?? "-",
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
          <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-float">
            <span className="text-slate-400">&#x1F50D;</span>
            <input
              className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
              placeholder="Procurar ponto..."
            />
          </div>

          <CardDetalhes
            className="mt-3"
            riskLabel={selectedRisk}
            metricas={cardMetricas}
          />
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-44 z-40 flex flex-col gap-2">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-river shadow-float"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom in"
        >
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01A1.65 1.65 0 009 5.09V5a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01A1.65 1.65 0 0019.91 12H20a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-river shadow-float"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Zoom out"
        >
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
            <path d="M12 2l4 10-4 10-4-10 4-10z" />
          </svg>
        </button>
      </div>

      {selectedProps ? (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 w-[92%] -translate-x-1/2 rounded-3xl bg-white/95 p-4 shadow-float md:bottom-6 md:max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Detalhes do local
          </p>
          <p className="mt-1 text-base font-semibold text-storm">
            Rua Dr. Silvestre Ferraz
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Risco:</span>
            <span className="font-semibold text-alert">{selectedRisk}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" />
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

      <button
        className={`pointer-events-auto absolute right-4 z-40 flex flex-col items-center gap-2 ${
          hasDetalhes ? "bottom-48" : "bottom-6"
        } md:bottom-6`}
        onClick={() => setModalOpen(true)}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-alert text-xl font-bold text-white shadow-float">
          !
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-float">
          Relatar evento
        </span>
      </button>

      <ModalRelato
        open={modalOpen}
        sending={sending}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
