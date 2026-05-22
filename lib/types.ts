export type ConteudoStatus = "extraido" | "criado" | "postado" | "pendente";

export interface MetricCard {
  label: string;
  value: number;
  status: ConteudoStatus;
}

export interface ScriptJob {
  id: string;
  nome: string;
  frequencia: string;
  ultimaExecucao: string;
  status: "ativo" | "pausado";
}
