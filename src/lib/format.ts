export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded).toLocaleString('id-ID');
  return rounded < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

export function formatTimeHHMM(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatDateId(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_ID[date.getMonth()] ?? 'Jan';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function shortInvoice(invoiceNumber: string): string {
  const match = invoiceNumber.match(/^#?INV-\d{8}-(\d+)$/i);
  if (match) {
    return `#INV-${match[1]}`;
  }
  return invoiceNumber.startsWith('#') ? invoiceNumber : `#${invoiceNumber}`;
}
