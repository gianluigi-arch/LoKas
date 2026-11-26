import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { getLocalDateKey } from './format';
import {
  convertStaticToDynamicQris,
  extractMerchantInfo,
  SAMPLE_STATIC_QRIS,
} from './qris-engine';

export type ProductCategory =
  | 'Sembako & Ritel'
  | 'Minuman & Segar'
  | 'Kudapan & Siap Saji';

export type ShiftType = 'Pagi' | 'Siang' | 'Malam';

export type ProductIconKey =
  | 'iced-coffee'
  | 'toast'
  | 'matcha'
  | 'americano'
  | 'donut'
  | 'hot-chocolate'
  | 'croissant'
  | 'iced-tea'
  | 'snack-plate';

export type PaymentMethod = 'QRIS' | 'CASH';
export type SyncStatus = 'PENDING' | 'SYNCED';

export interface MerchantRecord {
  id: string;
  storeName: string;
  shiftLabel: string;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  staticQrisPayload: string;
  updatedAt: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  icon: ProductIconKey;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionRecord {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number | null;
  changeAmount: number | null;
  dynamicQrisPayload: string | null;
  syncStatus: SyncStatus;
  shift: ShiftType;
  cashierName: string;
  createdAt: number;
  syncedAt: number | null;
}

export interface TransactionItemRecord {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

class LoKasDB extends Dexie {
  merchant!: Table<MerchantRecord, string>;
  products!: Table<ProductRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  transactionItems!: Table<TransactionItemRecord, string>;

  constructor() {
    super('LoKasDB');

    this.version(1).stores({
      merchant: 'id',
      products: 'id, sku, category, name',
      transactions: 'id, invoiceNumber, createdAt, paymentMethod, syncStatus',
      transactionItems: 'id, transactionId, productId',
    });

    this.version(2)
      .stores({
        merchant: 'id',
        products: 'id, sku, category, name',
        transactions:
          'id, invoiceNumber, createdAt, paymentMethod, syncStatus, shift',
        transactionItems: 'id, transactionId, productId',
      })
      .upgrade((tx) =>
        tx
          .table('transactions')
          .toCollection()
          .modify((record: Partial<TransactionRecord>) => {
            if (!record.shift) record.shift = 'Pagi';
            if (!record.cashierName) record.cashierName = 'Rina';
          })
      );
  }
}

export const db = new LoKasDB();

let seedPromise: Promise<void> | null = null;

function timeToday(hours: number, minutes: number): number {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const now = Date.now();
    const existingMerchant = await db.merchant.get('default');
    const legacyCafeProduct = await db.products.get('prod-es-kopi-susu');
    const legacyFreshProduct =
      (await db.products.get('prod-es-teh')) ||
      (await db.products.get('prod-risol-mayo')) ||
      (await db.products.get('prod-keripik-balado'));
    const isLegacySeed =
      existingMerchant?.storeName === 'Kopi & Roti Tukuo' ||
      Boolean(legacyCafeProduct) ||
      Boolean(legacyFreshProduct);

    if (isLegacySeed) {
      await db.transaction(
        'rw',
        db.merchant,
        db.products,
        db.transactions,
        db.transactionItems,
        async () => {
          await db.merchant.clear();
          await db.products.clear();
          await db.transactions.clear();
          await db.transactionItems.clear();
        }
      );
    }

    const currentMerchant = await db.merchant.get('default');
    if (!currentMerchant) {
      const info = extractMerchantInfo(SAMPLE_STATIC_QRIS);
      await db.merchant.put({
        id: 'default',
        storeName: 'Toserba Laris Jaya',
        shiftLabel: 'Shift Pagi • Kasir: Rina',
        merchantName: info.merchantName,
        merchantCity: info.merchantCity,
        nmid: info.nmid,
        staticQrisPayload: SAMPLE_STATIC_QRIS,
        updatedAt: now,
      });
    }

    const productCount = await db.products.count();
    if (productCount === 0) {
      const initialProducts: ProductRecord[] = [
        {
          id: 'prod-beras-5kg',
          sku: 'SMB-001',
          name: 'Beras Premium 5kg',
          category: 'Sembako & Ritel',
          price: 72000,
          stock: 18,
          icon: 'snack-plate',
          imageUrl: '/images/products/beras-5kg.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-minyak-2l',
          sku: 'SMB-002',
          name: 'Minyak Goreng 2L',
          category: 'Sembako & Ritel',
          price: 36000,
          stock: 24,
          icon: 'americano',
          imageUrl: '/images/products/minyak-2l.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-gula-1kg',
          sku: 'SMB-003',
          name: 'Gula Pasir 1kg',
          category: 'Sembako & Ritel',
          price: 17500,
          stock: 4,
          icon: 'toast',
          imageUrl: '/images/products/gula-1kg.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-telur-1kg',
          sku: 'SMB-004',
          name: 'Telur Ayam 1kg',
          category: 'Sembako & Ritel',
          price: 29000,
          stock: 15,
          icon: 'donut',
          imageUrl: '/images/products/telur-1kg.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-teh-botol',
          sku: 'MNM-001',
          name: 'Teh Kemasan Botol 350ml',
          category: 'Minuman & Segar',
          price: 3500,
          stock: 40,
          icon: 'iced-tea',
          imageUrl: '/images/products/teh-botol.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-kopi-botol',
          sku: 'MNM-002',
          name: 'Kopi Kemasan Botol 200ml',
          category: 'Minuman & Segar',
          price: 5000,
          stock: 16,
          icon: 'iced-coffee',
          imageUrl: '/images/products/kopi-botol.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-air-mineral',
          sku: 'MNM-003',
          name: 'Air Mineral 600ml',
          category: 'Minuman & Segar',
          price: 4000,
          stock: 48,
          icon: 'americano',
          imageUrl: '/images/products/air-mineral.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-mie-cup',
          sku: 'KDP-001',
          name: 'Mie Instan Cup',
          category: 'Kudapan & Siap Saji',
          price: 5500,
          stock: 11,
          icon: 'snack-plate',
          imageUrl: '/images/products/mie-cup.png',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-roti-cokelat',
          sku: 'KDP-002',
          name: 'Roti Kemasan Cokelat',
          category: 'Kudapan & Siap Saji',
          price: 4500,
          stock: 20,
          icon: 'toast',
          imageUrl: '/images/products/roti-cokelat.png',
          createdAt: now,
          updatedAt: now,
        },
      ];
      await db.products.bulkPut(initialProducts);
    }

    const txCount = await db.transactions.count();
    if (txCount === 0) {
      const dateKey = getLocalDateKey(now);
      const txSeeds: Array<{
        tx: TransactionRecord;
        items: TransactionItemRecord[];
      }> = [
        {
          tx: {
            id: 'seed-tx-014',
            invoiceNumber: `#INV-${dateKey}-014`,
            subtotal: 108000,
            discount: 0,
            total: 108000,
            paymentMethod: 'QRIS',
            cashReceived: null,
            changeAmount: null,
            dynamicQrisPayload: convertStaticToDynamicQris(
              SAMPLE_STATIC_QRIS,
              108000
            ),
            syncStatus: 'PENDING',
            shift: 'Pagi',
            cashierName: 'Rina',
            createdAt: timeToday(12, 45),
            syncedAt: null,
          },
          items: [
            {
              id: 'seed-item-014-1',
              transactionId: 'seed-tx-014',
              productId: 'prod-beras-5kg',
              productName: 'Beras Premium 5kg',
              unitPrice: 72000,
              quantity: 1,
              subtotal: 72000,
            },
            {
              id: 'seed-item-014-2',
              transactionId: 'seed-tx-014',
              productId: 'prod-minyak-2l',
              productName: 'Minyak Goreng 2L',
              unitPrice: 36000,
              quantity: 1,
              subtotal: 36000,
            },
          ],
        },
        {
          tx: {
            id: 'seed-tx-013',
            invoiceNumber: `#INV-${dateKey}-013`,
            subtotal: 36000,
            discount: 0,
            total: 36000,
            paymentMethod: 'CASH',
            cashReceived: 50000,
            changeAmount: 14000,
            dynamicQrisPayload: null,
            syncStatus: 'PENDING',
            shift: 'Pagi',
            cashierName: 'Rina',
            createdAt: timeToday(12, 30),
            syncedAt: null,
          },
          items: [
            {
              id: 'seed-item-013-1',
              transactionId: 'seed-tx-013',
              productId: 'prod-telur-1kg',
              productName: 'Telur Ayam 1kg',
              unitPrice: 29000,
              quantity: 1,
              subtotal: 29000,
            },
            {
              id: 'seed-item-013-2',
              transactionId: 'seed-tx-013',
              productId: 'prod-teh-botol',
              productName: 'Teh Kemasan Botol 350ml',
              unitPrice: 3500,
              quantity: 2,
              subtotal: 7000,
            },
          ],
        },
        {
          tx: {
            id: 'seed-tx-012',
            invoiceNumber: `#INV-${dateKey}-012`,
            subtotal: 19000,
            discount: 0,
            total: 19000,
            paymentMethod: 'QRIS',
            cashReceived: null,
            changeAmount: null,
            dynamicQrisPayload: convertStaticToDynamicQris(
              SAMPLE_STATIC_QRIS,
              19000
            ),
            syncStatus: 'SYNCED',
            shift: 'Siang',
            cashierName: 'Budi',
            createdAt: timeToday(11, 50),
            syncedAt: timeToday(11, 51),
          },
          items: [
            {
              id: 'seed-item-012-1',
              transactionId: 'seed-tx-012',
              productId: 'prod-kopi-botol',
              productName: 'Kopi Kemasan Botol 200ml',
              unitPrice: 5000,
              quantity: 2,
              subtotal: 10000,
            },
            {
              id: 'seed-item-012-2',
              transactionId: 'seed-tx-012',
              productId: 'prod-roti-cokelat',
              productName: 'Roti Kemasan Cokelat',
              unitPrice: 4500,
              quantity: 2,
              subtotal: 9000,
            },
          ],
        },
        {
          tx: {
            id: 'seed-tx-011',
            invoiceNumber: `#INV-${dateKey}-011`,
            subtotal: 25500,
            discount: 0,
            total: 25500,
            paymentMethod: 'CASH',
            cashReceived: 30000,
            changeAmount: 4500,
            dynamicQrisPayload: null,
            syncStatus: 'SYNCED',
            shift: 'Siang',
            cashierName: 'Budi',
            createdAt: timeToday(11, 15),
            syncedAt: timeToday(11, 16),
          },
          items: [
            {
              id: 'seed-item-011-1',
              transactionId: 'seed-tx-011',
              productId: 'prod-gula-1kg',
              productName: 'Gula Pasir 1kg',
              unitPrice: 17500,
              quantity: 1,
              subtotal: 17500,
            },
            {
              id: 'seed-item-011-2',
              transactionId: 'seed-tx-011',
              productId: 'prod-air-mineral',
              productName: 'Air Mineral 600ml',
              unitPrice: 4000,
              quantity: 2,
              subtotal: 8000,
            },
          ],
        },
        {
          tx: {
            id: 'seed-tx-010',
            invoiceNumber: `#INV-${dateKey}-010`,
            subtotal: 47000,
            discount: 0,
            total: 47000,
            paymentMethod: 'QRIS',
            cashReceived: null,
            changeAmount: null,
            dynamicQrisPayload: convertStaticToDynamicQris(
              SAMPLE_STATIC_QRIS,
              47000
            ),
            syncStatus: 'PENDING',
            shift: 'Malam',
            cashierName: 'Sari',
            createdAt: timeToday(10, 40),
            syncedAt: null,
          },
          items: [
            {
              id: 'seed-item-010-1',
              transactionId: 'seed-tx-010',
              productId: 'prod-minyak-2l',
              productName: 'Minyak Goreng 2L',
              unitPrice: 36000,
              quantity: 1,
              subtotal: 36000,
            },
            {
              id: 'seed-item-010-2',
              transactionId: 'seed-tx-010',
              productId: 'prod-mie-cup',
              productName: 'Mie Instan Cup',
              unitPrice: 5500,
              quantity: 2,
              subtotal: 11000,
            },
          ],
        },
      ];

      await db.transaction('rw', db.transactions, db.transactionItems, async () => {
        await db.transactions.bulkPut(txSeeds.map((s) => s.tx));
        await db.transactionItems.bulkPut(txSeeds.flatMap((s) => s.items));
      });
    }
  })();

  return seedPromise;
}

export async function generateNextInvoiceNumber(): Promise<string> {
  const dateKey = getLocalDateKey(Date.now());
  const prefix = `#INV-${dateKey}-`;
  const todayTxs = await db.transactions
    .where('invoiceNumber')
    .startsWith(prefix)
    .toArray();

  let maxSeq = 0;
  if (todayTxs.length > 0) {
    maxSeq = todayTxs.reduce((max, t) => {
      const seq = Number.parseInt(t.invoiceNumber.slice(prefix.length), 10);
      return Number.isFinite(seq) && seq > max ? seq : max;
    }, 0);
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export interface CheckoutLineInput {
  productId: string;
  quantity: number;
}

export interface AtomicCheckoutParams {
  items: CheckoutLineInput[];
  discount: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number | null;
  dynamicQrisPayload?: string | null;
  invoiceNumber?: string;
  shift?: ShiftType;
  cashierName?: string;
}

/**
 * Executes an atomic IndexedDB transaction that validates and decrements product stock,
 * records the offline-first transaction as PENDING with active shift & cashier metadata,
 * and stores all line item snapshots.
 */
export async function executeAtomicCheckout(
  params: AtomicCheckoutParams
): Promise<TransactionRecord> {
  if (params.items.length === 0) {
    throw new Error('Keranjang belanja masih kosong.');
  }

  return db.transaction(
    'rw',
    db.products,
    db.transactions,
    db.transactionItems,
    async () => {
      const now = Date.now();
      const txId = uuidv4();
      const invoiceNumber =
        params.invoiceNumber || (await generateNextInvoiceNumber());

      let subtotal = 0;
      const itemRecords: TransactionItemRecord[] = [];

      for (const line of params.items) {
        if (line.quantity <= 0) {
          throw new Error('Jumlah item harus minimal 1.');
        }

        const product = await db.products.get(line.productId);
        if (!product) {
          throw new Error('Produk tidak ditemukan di database lokal.');
        }
        if (product.stock < line.quantity) {
          throw new Error(
            `Stok "${product.name}" tidak mencukupi (tersisa ${product.stock}).`
          );
        }

        await db.products.update(product.id, {
          stock: product.stock - line.quantity,
          updatedAt: now,
        });

        const lineSubtotal = product.price * line.quantity;
        subtotal += lineSubtotal;

        itemRecords.push({
          id: uuidv4(),
          transactionId: txId,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: line.quantity,
          subtotal: lineSubtotal,
        });
      }

      const clampedDiscount = Math.max(0, Math.min(params.discount, subtotal));
      const total = Math.max(0, subtotal - clampedDiscount);

      let cashReceived: number | null = null;
      let changeAmount: number | null = null;
      if (params.paymentMethod === 'CASH') {
        cashReceived = params.cashReceived ?? total;
        if (cashReceived < total) {
          throw new Error('Uang tunai yang diterima kurang dari total tagihan.');
        }
        changeAmount = cashReceived - total;
      }

      const transaction: TransactionRecord = {
        id: txId,
        invoiceNumber,
        subtotal,
        discount: clampedDiscount,
        total,
        paymentMethod: params.paymentMethod,
        cashReceived,
        changeAmount,
        dynamicQrisPayload:
          params.paymentMethod === 'QRIS'
            ? (params.dynamicQrisPayload ?? null)
            : null,
        syncStatus: 'PENDING',
        shift: params.shift ?? 'Pagi',
        cashierName: params.cashierName?.trim() || 'Rina',
        createdAt: now,
        syncedAt: null,
      };

      await db.transactions.add(transaction);
      await db.transactionItems.bulkAdd(itemRecords);

      return transaction;
    }
  );
}

export async function adjustProductStock(
  productId: string,
  delta: number
): Promise<void> {
  await db.transaction('rw', db.products, async () => {
    const product = await db.products.get(productId);
    if (!product) return;
    const nextStock = Math.max(0, product.stock + delta);
    await db.products.update(productId, {
      stock: nextStock,
      updatedAt: Date.now(),
    });
  });
}

export async function addProduct(input: {
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  stock: number;
  icon: ProductIconKey;
  imageUrl?: string;
}): Promise<ProductRecord> {
  const now = Date.now();
  const record: ProductRecord = {
    id: uuidv4(),
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category,
    price: Math.max(0, Math.round(input.price)),
    stock: Math.max(0, Math.round(input.stock)),
    icon: input.icon,
    imageUrl: input.imageUrl,
    createdAt: now,
    updatedAt: now,
  };
  await db.products.add(record);
  return record;
}

export async function updateMerchantQris(
  staticPayload: string
): Promise<MerchantRecord> {
  const info = extractMerchantInfo(staticPayload);
  if (!info.isValidQris) {
    throw new Error('Payload QRIS tidak valid atau checksum CRC16 tidak cocok.');
  }

  const existing = await db.merchant.get('default');
  const updated: MerchantRecord = {
    id: 'default',
    storeName: existing?.storeName ?? 'Toserba Laris Jaya',
    shiftLabel: existing?.shiftLabel ?? 'Shift Pagi • Kasir: Rina',
    merchantName: info.merchantName,
    merchantCity: info.merchantCity,
    nmid: info.nmid,
    staticQrisPayload: staticPayload.trim(),
    updatedAt: Date.now(),
  };
  await db.merchant.put(updated);
  return updated;
}

export async function updateMerchantShiftLabel(
  shift: ShiftType,
  cashierName: string
): Promise<void> {
  const existing = await db.merchant.get('default');
  const label = `Shift ${shift} • Kasir: ${cashierName.trim() || 'Rina'}`;
  if (existing) {
    await db.merchant.update('default', {
      shiftLabel: label,
      updatedAt: Date.now(),
    });
  }
}
