import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { getRiskColor, getRiskLabel } from "../lib/risco";

const center = [-22.4247, -45.4601];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function MapEvents({ onMapClick, onMapPick, picking, shouldIgnoreMapClick }) {
  useMapEvents({
    click(event) {
      if (picking) {
        onMapPick?.(event.latlng);
        return;
      }
      if (shouldIgnoreMapClick?.()) {
        return;
      }
      onMapClick?.();
    },
  });

  return null;
}

export default function MapaInterativo({
  position,
  className = "",
  onFeatureClick,
  onMapClick,
  onCurrentLocationClick,
  onMapReady,
  searchTarget,
  picking = false,
  onMapPick,
  reportPoint,
}) {
  const [geoData, setGeoData] = useState(null);
  const ignoreNextMapClickRef = useRef(false);

  const currentPos = position ? [position.latitude, position.longitude] : center;

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

    fetch(`${API_BASE}/api/previsao`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar previsao: ${response.status}`);
        }

        return response.json();
      })
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
      const color = getRiskColor(feature?.properties?.grau_risco);
      return {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.45,
      };
    },
    [],
  );

  const onEachFeature = useMemo(
    () => (feature, layer) => {
      const props = feature?.properties || {};
      const chuva = props.chuva_mm ?? "-";
      const temp = props.temperatura ?? "-";
      const umidade = props.umidade ?? "-";
      const risco = getRiskLabel(props.grau_risco);
      layer.bindTooltip(
        `Risco: ${risco} | Chuva: ${chuva} mm | Temp: ${temp} C | Umidade: ${umidade}%`,
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
    <div className={`map-shell ${className} ${picking ? "cursor-crosshair" : ""}`.trim()}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        ref={(map) => {
          // react-leaflet v4 removeu whenCreated; o ref expoe a instancia do Leaflet.
          if (map) {
            onMapReady?.(map);
          }
        }}
        className="h-full w-full"
      >
        <MapEvents
          onMapClick={onMapClick}
          onMapPick={onMapPick}
          picking={picking}
          shouldIgnoreMapClick={shouldIgnoreMapClick}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={currentPos}
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
          center={currentPos}
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
        {searchTarget ? (
          <CircleMarker
            center={[searchTarget.latitude, searchTarget.longitude]}
            radius={9}
            pathOptions={{
              color: "#7c3aed",
              fillColor: "#7c3aed",
              fillOpacity: 0.9,
            }}
          />
        ) : null}
        {reportPoint ? (
          <CircleMarker
            center={[reportPoint.latitude, reportPoint.longitude]}
            radius={10}
            pathOptions={{
              color: "#db2777",
              fillColor: "#db2777",
              fillOpacity: 0.85,
              weight: 3,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
