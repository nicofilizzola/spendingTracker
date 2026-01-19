export function formatEUR(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const fixed = amount.toFixed(2);
    return `€${fixed}`;
  }
}
