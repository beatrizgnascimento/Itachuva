// Configuracao central de risco do Itachuva.
// Escala canonica de 5 niveis (RF03/RF04): nenhum, baixo, medio, alto, extremo.
// Reune cores (RF02/RNP02), rotulos e recomendacoes de seguranca (RF05) num unico lugar
// para manter o mapa, o card de detalhes e o modal de relato sempre consistentes.

export const RISK_LEVELS = [
  {
    key: "nenhum",
    value: 1,
    label: "Nenhum",
    color: "#94a3b8",
    // RF05 - recomendacoes automaticas de seguranca
    recomendacao: "Condicoes normais. Nenhuma acao necessaria.",
    badgeClass: "bg-slate-100 text-slate-600",
    textClass: "text-slate-500",
  },
  {
    key: "baixo",
    value: 2,
    label: "Baixo",
    color: "#22c55e",
    recomendacao: "Risco leve. Fique atento as atualizacoes do tempo.",
    badgeClass: "bg-emerald-100 text-emerald-700",
    textClass: "text-safe",
  },
  {
    key: "medio",
    value: 3,
    label: "Medio",
    color: "#f59e0b",
    recomendacao: "Evite areas alagadicas e tenha cautela nas vias.",
    badgeClass: "bg-amber-100 text-amber-700",
    textClass: "text-sun",
  },
  {
    key: "alto",
    value: 4,
    label: "Alto",
    color: "#f97316",
    recomendacao: "Evite esta via. Procure rotas alternativas.",
    badgeClass: "bg-orange-100 text-orange-700",
    textClass: "text-orange-600",
  },
  {
    key: "extremo",
    value: 5,
    label: "Extremo",
    color: "#ef4444",
    recomendacao: "Saia desta regiao e retorne para casa imediatamente.",
    badgeClass: "bg-red-100 text-red-700",
    textClass: "text-alert",
  },
];

const BY_KEY = RISK_LEVELS.reduce((acc, level) => {
  acc[level.key] = level;
  return acc;
}, {});

const BY_VALUE = RISK_LEVELS.reduce((acc, level) => {
  acc[level.value] = level;
  return acc;
}, {});

// Aceita variacoes antigas/acentuadas vindas do backend ou de dados legados.
const ALIASES = {
  none: "nenhum",
  nenhum: "nenhum",
  fraco: "baixo",
  baixo: "baixo",
  low: "baixo",
  medio: "medio",
  "médio": "medio",
  medium: "medio",
  alto: "alto",
  forte: "alto",
  high: "alto",
  extremo: "extremo",
  extreme: "extremo",
};

export function normalizeRiskKey(raw) {
  if (raw === null || raw === undefined) {
    return "nenhum";
  }

  if (typeof raw === "number") {
    return BY_VALUE[raw]?.key || "nenhum";
  }

  const cleaned = String(raw).trim().toLowerCase();
  return ALIASES[cleaned] || (BY_KEY[cleaned] ? cleaned : "nenhum");
}

export function getRiskLevel(raw) {
  return BY_KEY[normalizeRiskKey(raw)] || BY_KEY.nenhum;
}

export function getRiskColor(raw) {
  return getRiskLevel(raw).color;
}

export function getRiskLabel(raw) {
  return getRiskLevel(raw).label;
}

export function getRecomendacao(raw) {
  return getRiskLevel(raw).recomendacao;
}
