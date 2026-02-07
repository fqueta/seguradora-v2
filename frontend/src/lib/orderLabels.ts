export const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    ready: "Pronto",
    delivered: "Entregue",
    canceled: "Cancelado",
  };
  return map[s] ?? s;
};

