export function cpfApplyMask(value: string) {
  // 1. Remove tudo que não for dígito
  const cleanValue = value.replace(/\D/g, "")

  // 2. Limita a 11 dígitos
  const truncatedValue = cleanValue.slice(0, 11)

  // 3. Aplica a formatação progressiva
  return truncatedValue
    .replace(/(\d{3})(\d)/, "$1.$2")       // Coloca ponto depois do 3º dígito
    .replace(/(\d{3})(\d)/, "$1.$2")       // Coloca ponto depois do 6º dígito
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2") // Coloca hífen antes dos últimos 2 dígitos
}