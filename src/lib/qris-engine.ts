export interface EmvTlv {
  tag: string;
  length: number;
  value: string;
}

export interface MerchantQrisInfo {
  merchantName: string;
  merchantCity: string;
  nmid: string;
  pointOfInitiation: string;
  currencyCode: string;
  countryCode: string;
  amount: string | null;
  isValidCrc: boolean;
  isValidQris: boolean;
}

/**
 * Computes CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF, MSB-first).
 * Standard checksum required by EMVCo QRIS Tag 63.
 */
export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function encodeTlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Parses an EMVCo TLV string sequentially into { tag, length, value } nodes.
 */
export function parseEmvTlv(payload: string): EmvTlv[] {
  const trimmed = payload.trim();
  const nodes: EmvTlv[] = [];
  let cursor = 0;

  while (cursor + 4 <= trimmed.length) {
    const tag = trimmed.slice(cursor, cursor + 2);
    const lenStr = trimmed.slice(cursor + 2, cursor + 4);
    if (!/^\d{2}$/.test(lenStr)) {
      throw new Error(`Invalid EMVCo length field at offset ${cursor}: "${lenStr}"`);
    }
    const length = Number.parseInt(lenStr, 10);
    const valueStart = cursor + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > trimmed.length) {
      throw new Error(`Truncated EMVCo value for tag "${tag}" at offset ${cursor}`);
    }
    const value = trimmed.slice(valueStart, valueEnd);
    nodes.push({ tag, length, value });
    cursor = valueEnd;
  }

  if (cursor !== trimmed.length) {
    throw new Error(`Trailing unparsed bytes in EMVCo payload at offset ${cursor}`);
  }

  return nodes;
}

/**
 * Verifies the trailing Tag 63 CRC-16/CCITT checksum of an EMVCo QRIS string.
 */
export function verifyQrisCrc(payload: string): boolean {
  const trimmed = payload.trim();
  if (trimmed.length < 12) return false;
  try {
    const nodes = parseEmvTlv(trimmed);
    const last = nodes[nodes.length - 1];
    if (!last || last.tag !== '63' || last.length !== 4) {
      return false;
    }
    const bodyWithTag63Header = trimmed.slice(0, trimmed.length - 4);
    const expected = crc16Ccitt(bodyWithTag63Header);
    return last.value.toUpperCase() === expected;
  } catch {
    return false;
  }
}

/**
 * Extracts merchant metadata (Name, City, NMID, POI, Currency) from a raw QRIS payload.
 */
export function extractMerchantInfo(payload: string): MerchantQrisInfo {
  const fallback: MerchantQrisInfo = {
    merchantName: 'MERCHANT QRIS',
    merchantCity: 'INDONESIA',
    nmid: '-',
    pointOfInitiation: '11',
    currencyCode: '360',
    countryCode: 'ID',
    amount: null,
    isValidCrc: false,
    isValidQris: false,
  };

  const trimmed = payload.trim();
  if (!trimmed) return fallback;

  try {
    const nodes = parseEmvTlv(trimmed);
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.tag, node.value);
    }

    let nmid = '-';
    const candidateTagOrder = ['51', ...Array.from({ length: 20 }, (_, idx) => String(26 + idx))];
    for (const tagKey of candidateTagOrder) {
      const nestedRaw = map.get(tagKey);
      if (!nestedRaw) continue;
      try {
        const subNodes = parseEmvTlv(nestedRaw);
        const sub02 = subNodes.find((s) => s.tag === '02' && s.value.trim().length > 0);
        if (sub02) {
          nmid = sub02.value.trim();
          break;
        }
      } catch {
        // Ignore non-TLV subtags
      }
    }

    const isValidCrc = verifyQrisCrc(trimmed);
    const hasFormatIndicator = map.get('00') === '01';
    const hasMerchantName = Boolean(map.get('59'));

    return {
      merchantName: map.get('59') || fallback.merchantName,
      merchantCity: map.get('60') || fallback.merchantCity,
      nmid,
      pointOfInitiation: map.get('01') || '11',
      currencyCode: map.get('53') || '360',
      countryCode: map.get('58') || 'ID',
      amount: map.get('54') ?? null,
      isValidCrc,
      isValidQris: hasFormatIndicator && hasMerchantName && isValidCrc,
    };
  } catch {
    return fallback;
  }
}

/**
 * Converts a static Indonesian QRIS payload (Tag 01 = '11') into a dynamic QRIS payload:
 * - Sets Tag 01 to '12' (Dynamic)
 * - Injects Tag 54 with the exact integer Rupiah amount
 * - Recalculates Tag 63 (CRC16-CCITT 0xFFFF / 0x1021)
 */
export function convertStaticToDynamicQris(staticPayload: string, amountIdr: number): string {
  const roundedAmount = Math.round(amountIdr);
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
    throw new Error('Nominal transaksi harus lebih dari Rp 0 untuk QRIS Dinamis.');
  }

  const trimmed = staticPayload.trim();
  const nodes = parseEmvTlv(trimmed);
  const amountStr = String(roundedAmount);

  // Remove existing Tag 54 and Tag 63
  const filtered = nodes.filter((n) => n.tag !== '54' && n.tag !== '63');

  // Switch Tag 01 from '11' to '12' (or insert after Tag 00 if missing)
  const hasTag01 = filtered.some((n) => n.tag === '01');
  const withDynamicPoi: EmvTlv[] = [];
  for (const node of filtered) {
    if (node.tag === '01') {
      withDynamicPoi.push({ tag: '01', length: 2, value: '12' });
    } else {
      withDynamicPoi.push(node);
      if (node.tag === '00' && !hasTag01) {
        withDynamicPoi.push({ tag: '01', length: 2, value: '12' });
      }
    }
  }

  // Insert Tag 54 right after Tag 53 (Transaction Currency), or before Tag 58 (Country Code)
  const amountNode: EmvTlv = {
    tag: '54',
    length: amountStr.length,
    value: amountStr,
  };

  const tag53Index = withDynamicPoi.findIndex((n) => n.tag === '53');
  const tag58Index = withDynamicPoi.findIndex((n) => n.tag === '58');

  if (tag53Index !== -1) {
    withDynamicPoi.splice(tag53Index + 1, 0, amountNode);
  } else if (tag58Index !== -1) {
    withDynamicPoi.splice(tag58Index, 0, amountNode);
  } else {
    withDynamicPoi.push(amountNode);
  }

  const bodyWithoutCrc = withDynamicPoi.map((n) => encodeTlv(n.tag, n.value)).join('');
  const payloadWithCrcHeader = `${bodyWithoutCrc}6304`;
  const crc = crc16Ccitt(payloadWithCrcHeader);

  return `${payloadWithCrcHeader}${crc}`;
}

/**
 * Builds a valid sample Indonesian static EMVCo QRIS string for "TOSERBA LARIS JAYA".
 */
export function buildSampleStaticQris(): string {
  const tag26 = [
    encodeTlv('00', 'ID.CO.QRIS.WWW'),
    encodeTlv('01', '936009143102600891'),
    encodeTlv('02', 'ID10260089123'),
    encodeTlv('03', 'UMI'),
  ].join('');

  const tag51 = [
    encodeTlv('00', 'ID.CO.QRIS.WWW'),
    encodeTlv('02', 'ID10260089123'),
    encodeTlv('03', 'UMI'),
  ].join('');

  const tag62 = encodeTlv('07', 'A01');

  const body = [
    encodeTlv('00', '01'),
    encodeTlv('01', '11'),
    encodeTlv('26', tag26),
    encodeTlv('51', tag51),
    encodeTlv('52', '5812'),
    encodeTlv('53', '360'),
    encodeTlv('58', 'ID'),
    encodeTlv('59', 'TOSERBA LARIS JAYA'),
    encodeTlv('60', 'JAKARTA'),
    encodeTlv('61', '12190'),
    encodeTlv('62', tag62),
  ].join('');

  const withHeader = `${body}6304`;
  return `${withHeader}${crc16Ccitt(withHeader)}`;
}

export const SAMPLE_STATIC_QRIS = buildSampleStaticQris();
