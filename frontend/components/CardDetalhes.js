import { getRiskLevel } from "../lib/risco";

export default function CardDetalhes({
  className = "",
  riskLabel = "nenhum",
  metricas = [
    { label: "Temperatura:", value: "24 C", icon: "/icons/thermometer.svg" },
    { label: "Chuva (mm):", value: "65.2", icon: "/icons/cloud-rain.svg" },
    { label: "Umidade:", value: "80%", icon: "/icons/humidity.svg" },
  ],
}) {
  const nivel = getRiskLevel(riskLabel);

  return (
    <div
      className={`rounded-2xl bg-white/95 px-5 py-3 shadow-float ${className}`.trim()}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
        Risco na sua posicao
      </p>
      <p className={`mt-1 text-sm font-bold ${nivel.textClass}`}>
        {nivel.label.toUpperCase()}
      </p>
      {/* RF05 - recomendacao automatica de seguranca conforme o nivel de risco */}
      <p className="mt-1 text-[12px] leading-snug text-slate-600">
        {nivel.recomendacao}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        {metricas.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1">
            <div className="flex h-6 items-center justify-center">
              {item.icon ? (
                <img
                  src={item.icon}
                  alt=""
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-storm">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
