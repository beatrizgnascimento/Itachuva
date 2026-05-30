import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

const center = [-22.4247, -45.4601];

const riskPalette = {
  alto: "#ef4444",
  medio: "#f59e0b",
  baixo: "#22c55e",
};

function MapEvents({ onMapClick, shouldIgnoreMapClick }) {
  useMapEvents({
    click(event) {
      if (shouldIgnoreMapClick?.()) {
        return;
      }
      onMapClick?.();
    },
  });

  return null;
}

export default function MapaInterativo({
  className = "",
  onFeatureClick,
  onMapClick,
  onCurrentLocationClick,
  onMapReady,
}) {
  const [geoData, setGeoData] = useState(null);
  const ignoreNextMapClickRef = useRef(false);

  const suppressNextMapClick = () => {
    ignoreNextMapClickRef.current = true;
  };

  const shouldIgnoreMapClick = () => {
    if (ignoreNextMapClickRef.current) {
      ignoreNextMapClickRef.current = false;
      return true;
    }
    return false;
  };

  useEffect(() => {
    let active = true;

    fetch("/data/mock_previsao.json")
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setGeoData(data);
        }
      })
      .catch((error) => {
        console.error("Falha ao carregar dados do mapa", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const geoStyle = useMemo(
    () => (feature) => {
      const risco = feature?.properties?.grau_risco || "baixo";
      return {
        color: riskPalette[risco] || riskPalette.baixo,
        weight: 2,
        fillColor: riskPalette[risco] || riskPalette.baixo,
        fillOpacity: 0.4,
      };
    },
    [],
  );

  const onEachFeature = useMemo(
    () => (feature, layer) => {
      const props = feature?.properties || {};
      const chuva = props.chuva_mm ?? "-";
      const temp = props.temperatura ?? "-";
      const risco = props.grau_risco || "-";
      layer.bindTooltip(
        `Risco: ${risco} | Chuva: ${chuva} mm | Temp: ${temp} C`,
        { sticky: true },
      );
      layer.on("click", (event) => {
        event.originalEvent?.stopPropagation?.();
        suppressNextMapClick();
        onFeatureClick?.(feature);
      });
    },
    [onFeatureClick],
  );

  return (
    <div className={`map-shell ${className}`.trim()}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        whenCreated={onMapReady}
        className="h-full w-full"
      >
        <MapEvents
          onMapClick={onMapClick}
          shouldIgnoreMapClick={shouldIgnoreMapClick}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={center}
          radius={20}
          eventHandlers={{
            click: (event) => {
              event.originalEvent?.stopPropagation?.();
              suppressNextMapClick();
              onCurrentLocationClick?.();
            },
          }}
          pathOptions={{
            color: "#e53935",
            fillColor: "#e53935",
            fillOpacity: 0.2,
          }}
        />
        <CircleMarker
          center={center}
          radius={8}
          eventHandlers={{
            click: (event) => {
              event.originalEvent?.stopPropagation?.();
              suppressNextMapClick();
              onCurrentLocationClick?.();
            },
          }}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 0.9,
          }}
        />
        {geoData ? (
          <GeoJSON
            data={geoData}
            style={geoStyle}
            onEachFeature={onEachFeature}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
