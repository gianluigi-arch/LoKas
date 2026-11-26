# LoKas (LokalKas) Architecture Blueprint

**LoKas** (*short for LokalKas*) is an offline-first MSME (UMKM) Point-of-Sale and Dynamic QRIS web application built on **Next.js App Router**, **TypeScript**, **Tailwind CSS v4**, **Dexie.js (IndexedDB)**, **Zustand**, and a pure TypeScript **EMVCo QRIS Engine**.

---

## 1. Folder Structure

```text
./
├── ARCHITECTURE.md                  # System architecture, DB schema, & sync state machine
├── README.md                        # Technical case study & offline verification guide
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript strict config + @/* alias
├── next.config.ts                   # Next.js configuration
├── postcss.config.mjs               # Tailwind CSS v4 PostCSS plugin
├── public/
│   ├── manifest.json                # PWA web app manifest ("LoKas - LokalKas")
│   ├── sw.js                        # Offline-first Service Worker (lokas-cache-v2)
│   ├── icons/
│   │   └── icon.svg                 # LoKas Burnt Orange LK monogram vector icon
│   └── images/
│       ├── lokas-wordmark.png       # LoKas (LokalKas) full wordmark banner
│       └── products/                # Studio-lit MSME product thumbnails (.png)
└── src/
    ├── app/
    │   ├── layout.tsx               # Root layout (Plus Jakarta Sans, PWA registrar, viewport)
    │   ├── globals.css              # Tailwind v4 theme tokens & tabular-nums utilities
    │   ├── page.tsx                 # Kasir view (D-01 desktop split view & M-01 mobile grid)
    │   ├── laporan/
    │   │   └── page.tsx             # M-03 Daily Sales Report & sync queue manager
    │   ├── stok/
    │   │   └── page.tsx             # M-04 Quick Stock Stepper & QRIS image setup
    │   └── api/
    │       └── sync/
    │           └── route.ts         # POST /api/sync batch synchronization endpoint
    ├── components/
    │   ├── shared/
    │   │   ├── AppShell.tsx         # Responsive Left Nav Rail (desktop) / Bottom Nav (mobile)
    │   │   ├── NetworkBadge.tsx     # Online/Offline + Pending Queue pill badge
    │   │   ├── ProductIcon.tsx      # Monochrome vector product thumbnails
    │   │   └── ServiceWorkerRegistrar.tsx # Registers /sw.js and runs initial DB seeding
    │   ├── pos/
    │   │   ├── ProductCard.tsx      # Responsive product card (inline stepper on mobile)
    │   │   ├── DesktopCartPanel.tsx # D-01 right-hand cart & payment selector panel
    │   │   ├── MobileCartBar.tsx    # M-01 sticky floating checkout summary bar
    │   │   └── CartBottomSheet.tsx  # M-01B mobile itemized cart & discount bottom sheet
    │   └── qris/
    │       ├── PaymentModal.tsx     # M-02 Dynamic QRIS & Tunai payment flow + receipt
    │       └── QrisSetupModal.tsx   # jsQR image decoder + EMVCo payload editor & preview
    ├── hooks/
    │   ├── useCartStore.ts          # Zustand cart state, discount clamping, stock bounds
    │   ├── useNetworkSync.ts        # Online/offline listener + automatic/manual sync engine
    │   └── useShiftStore.ts         # Persisted active shift (Pagi/Siang/Malam) & cashier store
    └── lib/
        ├── db.ts                    # Dexie.js LoKasDB schema, seeding, atomic checkout
        ├── qris-engine.ts           # Pure TS EMVCo TLV parser, Dynamic QRIS builder, CRC16
        └── format.ts                # Rupiah currency, date/time, and invoice formatting
```

---

## 2. IndexedDB Schema (`LoKasDB`)

All operational POS data is stored locally in the browser via **Dexie.js** (`LoKasDB`, schema version `2`). The application never blocks checkout on network availability.

| Table | Primary Key & Indexes | Record Shape | Purpose |
| :--- | :--- | :--- | :--- |
| `merchant` | `id` | `{ id, storeName, shiftLabel, merchantName, merchantCity, nmid, staticQrisPayload, updatedAt }` | Stores active store identity (`Toserba Laris Jaya`) and raw static EMVCo QRIS payload (`'default'`). |
| `products` | `id, sku, category, name` | `{ id, sku, name, category, price, stock, icon, imageUrl, createdAt, updatedAt }` | Multi-category MSME product catalog with live inventory count and product thumbnails. |
| `transactions` | `id, invoiceNumber, createdAt, paymentMethod, syncStatus, shift` | `{ id, invoiceNumber, subtotal, discount, total, paymentMethod, cashReceived, changeAmount, dynamicQrisPayload, syncStatus, shift, cashierName, createdAt, syncedAt }` | Immutable offline-first order ledger (`PENDING` or `SYNCED`) tagged with active shift & cashier. |
| `transactionItems` | `id, transactionId, productId` | `{ id, transactionId, productId, productName, unitPrice, quantity, subtotal }` | Line items snapshot linked to each transaction. |

### Atomic Checkout Transaction (`executeAtomicCheckout`)
Uses `db.transaction('rw', db.products, db.transactions, db.transactionItems, ...)`:
1. Validates every cart item exists in `products` and has `stock >= quantity`.
2. Decrements `products.stock` atomically for each purchased item.
3. Generates sequential daily invoice number (`#INV-YYYYMMDD-NNN`).
4. Inserts the `transactions` row with `syncStatus: 'PENDING'` and all `transactionItems` rows.
5. Any validation failure rolls back the entire IndexedDB transaction cleanly.

---

## 3. EMVCo Dynamic QRIS Engine (`src/lib/qris-engine.ts`)

1. **TLV Parsing (`parseEmvTlv`)**: Sequentially reads `Tag (2 chars) + Length (2 digits) + Value (N chars)`.
2. **Merchant Extraction (`extractMerchantInfo`)**: Extracts `Tag 59` (Merchant Name), `Tag 60` (City), `Tag 51` / `Tags 26..45` subtag `02` (NMID), `Tag 01` (Point of Initiation), `Tag 53` (`360` IDR), and validates `Tag 63` CRC16.
3. **Static → Dynamic Conversion (`convertStaticToDynamicQris`)**:
   - Switches **Tag `01`** from `'11'` (Static) to `'12'` (Dynamic).
   - Strips any existing **Tag `54`** and **Tag `63`**.
   - Injects **Tag `54`** (`54` + 2-digit length + integer Rupiah string) immediately after **Tag `53`** (or before **Tag `58`**).
   - Appends `'6304'` and computes the 4-hex **CRC16-CCITT (`0x1021`, init `0xFFFF`, MSB-first)** checksum over the entire payload including `'6304'`.

---

## 4. Offline-First Sync State Machine & PWA Caching

```text
  [Cashier Checkout (Online or Offline)]
                  │
                  ▼ (Atomic Dexie Write: decrement stock + insert order)
          ┌───────────────┐
          │    PENDING    │ ◄───────┐
          └───────┬───────┘         │
                  │                 │ Network error / HTTP != 200
     Online event │                 │ (Keep in queue, retry later)
     or Manual    │                 │
     "Sync" click ▼                 │
          ┌───────────────┐         │
          │  SYNCING ...  ├─────────┘
          │ POST /api/sync│
          └───────┬───────┘
                  │ HTTP 200 OK ({ syncedIds, syncedAt })
                  ▼
          ┌───────────────┐
          │    SYNCED     │ (Updated in IndexedDB with syncedAt)
          └───────────────┘
```

### Service Worker (`public/sw.js` — `lokas-cache-v2`) Strategy
- **`/api/*` requests**: Network-only (never cached) so sync attempts genuinely fail when offline and preserve `PENDING` state accurately.
- **`/_next/static/*`, `/images/*`, `/icons/*` assets**: Cache-first for instant zero-latency offline JS/CSS and product thumbnail hydration.
- **Page navigations (`/`, `/stok`, `/laporan`)**: Network-first with automatic cache update and cache fallback, ensuring full multi-route reload and navigation while offline.
