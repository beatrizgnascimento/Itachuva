import { useEffect, useState } from "react";

const niveis = [
  { value: 1, label: "Nenhum", color: "bg-emerald-100 text-emerald-700" },
  { value: 2, label: "Fraco", color: "bg-lime-100 text-lime-700" },
  { value: 3, label: "Medio", color: "bg-amber-100 text-amber-700" },
  { value: 4, label: "Forte", color: "bg-orange-100 text-orange-700" },
  { value: 5, label: "Extremo", color: "bg-red-100 text-red-700" },
];

const tipos = [
  { value: "alagamento", label: "Alagamento" },
  { value: "chuva", label: "Chuva intensa" },
];

export default function ModalRelato({ open, sending, onClose, onSubmit }) {
  const [nivel, setNivel] = useState(null);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("alagamento");

  useEffect(() => {
    if (!open) {
      setNivel(null);
      setDescricao("");
      setTipo("alagamento");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    onSubmit?.(nivel, descricao.trim(), tipo);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relato-title"
    >
      <div className="w-full max-w-xl rounded-t-3xl bg-white p-6 shadow-float">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Relatar evento
            </p>
            <h2
              id="relato-title"
              className="mt-1 text-lg font-semibold text-storm"
            >
              Qual o tipo e a intensidade?
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {tipos.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tipo === item.value
                  ? "border-river bg-river/10 text-river"
                  : "border-slate-200 text-slate-500"
              }`}
              onClick={() => setTipo(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Qual a intensidade?
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {niveis.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition ${
                  nivel === item.value
                    ? "border-storm text-storm"
                    : "border-slate-200 text-slate-500"
                } ${item.color}`}
                onClick={() => setNivel(item.value)}
                aria-pressed={nivel === item.value}
              >
                <span className="text-sm font-bold">{item.value}</span>
                <span className="text-[10px] uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Observacao (opcional)
          </label>
          <textarea
            className="mt-2 h-20 w-full rounded-xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-600"
            placeholder="Ponto de referencia ou comentario rapido"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
            !
          </span>
          <span>Confirmar local: Av. BPS, 139 - Centro</span>
        </div>

        <button
          className="mt-5 w-full rounded-xl bg-river py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-float transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          onClick={handleSubmit}
          disabled={!nivel || sending}
        >
          {sending ? "Enviando..." : "Enviar relatorio"}
        </button>
      </div>
    </div>
  );
}
