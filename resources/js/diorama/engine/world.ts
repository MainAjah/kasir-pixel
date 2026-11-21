/**
 * Dunia diorama: semua keadaan toko mini dan aturan yang menggerakkannya.
 *
 * Murni (tanpa DOM): `handle(event)` menerima peristiwa ternormal dari DioramaFeed,
 * `update(dt)` memajukan waktu. Renderer hanya membaca `customers`, `cashier`,
 * `display`, dan `waitingCount`. Diorama tidak pernah menulis data aplikasi.
 */
import { Cashier } from '../actors/cashier';
import {
    BEFORE_PAYING,
    anchorTile,
    catchUp,
    createCustomer,
    startLeaving,
    stepCustomer,
} from '../actors/customer';
import type {
    Customer,
    CustomerContext,
    SaleProgress,
} from '../actors/customer';
import { STORE_SCENE, buildGrid } from '../scenes/store-scene';
import type { PickPoint, StoreScene } from '../scenes/store-scene';
import type { DioramaEvent, DioramaItem } from './feed';
import { bfs, inBounds, isWalkable } from './grid';
import type { Grid } from './grid';
import { tileKey } from './iso';
import type { Tile } from './iso';
import { QueueManager } from './queue';
import { between, createRng, pick } from './rng';
import type { Rng } from './rng';

export type SaleRecord = SaleProgress & {
    id: number;
    customerId: number | null;
    number: string | null;
    total: number;
    items: DioramaItem[];
    scanned: DioramaItem[];
    voided: boolean;
    abandoned: boolean;
};

export type WorldOptions = {
    scene?: StoreScene;
    seed?: number;
    /** Pelanggan latar muncul sendiri saat sepi. */
    autoBackground?: boolean;
    /** Total penjualan hari ini saat diorama dimuat (dari server di 5D). */
    dailyTotal?: number;
};

/** Paling banyak 5 pelanggan tampil; pembeli selebihnya menjadi "+N". */
export const MAX_VISIBLE = 5;
export const MAX_BACKGROUND = 2;
/** Jeda antarmunculnya pelanggan di pintu agar tidak bertumpuk. */
export const SPAWN_GAP = 0.8;
export const LOOKS = 6;

export class DioramaWorld implements CustomerContext {
    readonly scene: StoreScene;
    readonly grid: Grid;
    readonly queue: QueueManager;
    readonly cashier = new Cashier();
    readonly sales = new Map<number, SaleRecord>();
    customers: Customer[] = [];
    /** Penjualan yang pelanggannya belum tampil, urut waktu. */
    pending: number[] = [];
    openSaleId: number | null = null;
    dailyTotal: number;
    /** Layar pelanggan di meja kasir 1. */
    display: { total: number | null; number: string | null } = {
        total: null,
        number: null,
    };
    autoBackground: boolean;
    time = 0;

    private readonly rng: Rng;
    private readonly reserved = new Map<string, number>();
    private nextCustomerId = 1;
    private nextSaleId = 1;
    private spawnCooldown = 0;
    private backgroundTimer: number;

    constructor(options: WorldOptions = {}) {
        this.scene = options.scene ?? STORE_SCENE;
        this.grid = buildGrid(this.scene);
        this.queue = new QueueManager(this.scene.queueSlots);
        this.rng = createRng(options.seed ?? Date.now());
        this.autoBackground = options.autoBackground ?? false;
        this.dailyTotal = options.dailyTotal ?? 0;
        this.backgroundTimer = between(this.rng, 2, 5);
    }

    get doorInside(): Tile {
        return this.scene.door.inside;
    }

    /** Angka "+N": pembeli yang menunggu giliran tampil. */
    get waitingCount(): number {
        return this.pending.length;
    }

    get visibleCount(): number {
        return this.customers.length;
    }

    get backgroundCount(): number {
        return this.customers.filter((c) => c.kind === 'latar').length;
    }

    get buyerCount(): number {
        return this.customers.filter((c) => c.kind === 'pembeli').length;
    }

    handle(event: DioramaEvent): void {
        switch (event.type) {
            case 'sale.opened': {
                this.abandonOpenSale();
                const sale = this.newSale();
                this.openSaleId = sale.id;

                break;
            }

            case 'item.scanned': {
                const sale = this.openSale() ?? this.openImplicitSale();
                sale.scansReceived += 1;
                sale.scanned.push(event.item);

                break;
            }

            case 'sale.completed': {
                const sale = this.openSale() ?? this.newSale();
                this.openSaleId = null;
                sale.completed = true;
                sale.number = event.number;
                sale.total = event.total;
                sale.items = event.items;
                sale.itemLines = event.items.length;
                this.dailyTotal += event.total;

                const customer = this.customerOf(sale);

                if (customer) {
                    catchUp(customer, this);
                }

                break;
            }

            case 'sale.voided': {
                this.dailyTotal = Math.max(0, this.dailyTotal - event.total);
                this.cashier.cancel();

                const sale = [...this.sales.values()].find(
                    (s) => s.number === event.number,
                );

                if (sale) {
                    sale.voided = true;
                    this.dropSale(sale);
                }

                break;
            }

            case 'background':
                this.spawnBackground();

                break;
        }
    }

    update(dt: number): void {
        this.time += dt;
        this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);
        this.spawnPending();
        this.scheduleBackground(dt);

        for (const customer of this.customers) {
            stepCustomer(customer, dt, this);
        }

        for (const gone of this.customers.filter((c) => c.state === 'hilang')) {
            this.releasePick(gone);
            this.leaveQueue(gone);
        }

        this.customers = this.customers.filter((c) => c.state !== 'hilang');
        this.cashier.update(dt);
    }

    /** Pelanggan latar: hanya bila ada tempat, paling banyak 2. */
    spawnBackground(): boolean {
        if (
            this.backgroundCount >= MAX_BACKGROUND ||
            this.visibleCount >= MAX_VISIBLE ||
            this.pending.length > 0
        ) {
            return false;
        }

        this.spawn(null);

        return true;
    }

    /** Keadaan ringkas untuk panel debug dan tes. */
    snapshot() {
        return {
            time: this.time,
            dailyTotal: this.dailyTotal,
            waiting: this.pending.length,
            queue: [...this.queue.members],
            cashier: this.cashier.state,
            display: { ...this.display },
            customers: this.customers.map((c) => {
                const sale = this.saleOf(c);

                return {
                    id: c.id,
                    kind: c.kind,
                    state: c.state,
                    tile: { gx: Math.round(c.fx), gy: Math.round(c.fy) },
                    speed: c.speed,
                    sale: sale
                        ? {
                              number: sale.number,
                              scans: `${sale.scansPlayed}/${sale.scansReceived}`,
                              completed: sale.completed,
                              voided: sale.voided,
                              abandoned: sale.abandoned,
                          }
                        : null,
                };
            }),
        };
    }

    saleById(id: number | null): SaleRecord | null {
        return id === null ? null : (this.sales.get(id) ?? null);
    }

    // ---- CustomerContext ----------------------------------------------------

    saleOf(customer: Customer): SaleRecord | null {
        return this.saleById(customer.saleId);
    }

    claimPick(customer: Customer): PickPoint | null {
        const free = this.scene.pickPoints.filter(
            (p) => !this.reserved.has(tileKey(p.gx, p.gy)),
        );

        if (free.length === 0) {
            return null;
        }

        const chosen = pick(this.rng, free);
        this.reserved.set(tileKey(chosen.gx, chosen.gy), customer.id);

        return chosen;
    }

    releasePick(customer: Customer): void {
        if (customer.pick) {
            const key = tileKey(customer.pick.gx, customer.pick.gy);

            if (this.reserved.get(key) === customer.id) {
                this.reserved.delete(key);
            }

            customer.pick = null;
        }
    }

    joinQueue(customer: Customer): void {
        this.queue.join(customer.id);
    }

    leaveQueue(customer: Customer): void {
        this.queue.leave(customer.id);
    }

    queueSlot(customer: Customer): { tile: Tile; front: boolean } | null {
        const index = this.queue.indexOf(customer.id);

        return index === -1
            ? null
            : { tile: this.queue.slots[index], front: index === 0 };
    }

    pathFrom(start: Tile, goal: Tile): Tile[] | null {
        return bfs(this.grid, start, goal);
    }

    /** Lajur keluar: turun ke baris gy = 8, menyusurinya ke (0,8), lalu (0,7) dan keluar pintu. */
    exitPath(customer: Customer): Tile[] {
        const { inside, outside } = this.scene.door;
        const lane = this.scene.exitLaneGy;
        const start = anchorTile(customer);
        const walking = customer.path.length > 0 ? [start] : [];

        if (!inBounds(this.grid, start.gx, start.gy)) {
            return [outside];
        }

        const laneEntry = isWalkable(this.grid, start.gx, lane)
            ? { gx: start.gx, gy: lane }
            : { gx: 0, gy: lane };
        const legs = [
            bfs(this.grid, start, laneEntry) ?? [],
            bfs(this.grid, laneEntry, { gx: 0, gy: lane }) ?? [],
            bfs(this.grid, { gx: 0, gy: lane }, inside) ?? [],
        ];

        return [...walking, ...legs.flat(), outside];
    }

    onServed(): void {
        this.cashier.greet();
        this.display = { total: null, number: null };
    }

    onScan(customer: Customer): void {
        this.cashier.scan(customer.speed);
    }

    onPay(customer: Customer): void {
        const sale = this.saleOf(customer);
        this.cashier.receiveCoin();
        this.display = {
            total: sale?.total ?? 0,
            number: sale?.number ?? null,
        };
    }

    // ---- Bagian dalam ------------------------------------------------------

    private openSale(): SaleRecord | null {
        return this.saleById(this.openSaleId);
    }

    /** Diorama dimuat di tengah transaksi: pindai tanpa "dibuka" tetap memunculkan pelanggan. */
    private openImplicitSale(): SaleRecord {
        const sale = this.newSale();
        this.openSaleId = sale.id;

        return sale;
    }

    private newSale(): SaleRecord {
        const sale: SaleRecord = {
            id: this.nextSaleId++,
            customerId: null,
            number: null,
            total: 0,
            items: [],
            scanned: [],
            scansReceived: 0,
            scansPlayed: 0,
            itemLines: 0,
            completed: false,
            voided: false,
            abandoned: false,
        };

        this.sales.set(sale.id, sale);
        this.pending.push(sale.id);
        this.pruneSales();

        return sale;
    }

    /** Transaksi baru dibuka sebelum yang lama selesai: keranjang lama dikosongkan, pelanggannya pergi. */
    private abandonOpenSale(): void {
        const sale = this.openSale();
        this.openSaleId = null;

        if (sale && !sale.completed) {
            sale.abandoned = true;
            this.dropSale(sale);
        }
    }

    /** Pelanggan penjualan ini batal belanja: keluar tanpa kantong bila belum membayar. */
    private dropSale(sale: SaleRecord): void {
        this.pending = this.pending.filter((id) => id !== sale.id);

        if (this.openSaleId === sale.id) {
            this.openSaleId = null;
        }

        const customer = this.customerOf(sale);

        if (customer && BEFORE_PAYING.includes(customer.state)) {
            startLeaving(customer, this);
        }
    }

    private customerOf(sale: SaleRecord): Customer | null {
        return sale.customerId === null
            ? null
            : (this.customers.find((c) => c.id === sale.customerId) ?? null);
    }

    private spawnPending(): void {
        if (this.pending.length === 0) {
            return;
        }

        if (this.visibleCount >= MAX_VISIBLE) {
            // Penuh: pelanggan latar memberi tempat lebih dulu.
            const browsing = this.customers.find(
                (c) => c.kind === 'latar' && c.state !== 'keluar',
            );

            if (browsing) {
                startLeaving(browsing, this);
            }

            return;
        }

        if (this.spawnCooldown > 0) {
            return;
        }

        const saleId = this.pending.shift() ?? null;
        this.spawn(saleId);
    }

    private spawn(saleId: number | null): void {
        const sale = this.saleById(saleId);
        const kind = sale ? 'pembeli' : 'latar';
        const customer = createCustomer({
            id: this.nextCustomerId++,
            kind,
            saleId,
            look: Math.floor(this.rng() * LOOKS),
            shelvesLeft:
                kind === 'latar'
                    ? 2 + Math.floor(this.rng() * 2)
                    : 1 + Math.floor(this.rng() * 2),
            at: this.scene.door.outside,
        });

        if (sale) {
            sale.customerId = customer.id;

            if (sale.completed) {
                catchUp(customer, this);
            }
        }

        // Pelanggan yang muncul berdekatan (misalnya latar dari tombol) menunggu
        // di luar pintu sampai jedanya habis, supaya tidak masuk bertumpuk.
        customer.stateTime = -this.spawnCooldown;
        this.customers.push(customer);
        this.spawnCooldown += SPAWN_GAP;
    }

    private scheduleBackground(dt: number): void {
        const quiet = this.buyerCount === 0 && this.pending.length === 0;

        if (
            !this.autoBackground ||
            !quiet ||
            this.backgroundCount >= MAX_BACKGROUND
        ) {
            return;
        }

        this.backgroundTimer -= dt;

        if (this.backgroundTimer <= 0) {
            this.spawnBackground();
            this.backgroundTimer = between(this.rng, 6, 14);
        }
    }

    /** Simpan catatan penjualan secukupnya: yang masih punya pelanggan, tertunda, atau 50 terakhir. */
    private pruneSales(): void {
        if (this.sales.size <= 60) {
            return;
        }

        const active = new Set(this.customers.map((c) => c.saleId));
        const ids = [...this.sales.keys()];

        for (const id of ids.slice(0, ids.length - 50)) {
            if (
                !active.has(id) &&
                !this.pending.includes(id) &&
                id !== this.openSaleId
            ) {
                this.sales.delete(id);
            }
        }
    }
}
