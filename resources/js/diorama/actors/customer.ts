/**
 * State machine pelanggan (docs/diorama-rancangan.md bagian 4).
 *
 * muncul → masuk → ke_rak ⇄ ambil → ke_antrean → antre → dilayani → dipindai
 *        → bayar → ambil_kantong → keluar → hilang
 *
 * Pelanggan latar tidak antre: setelah rak terakhir langsung keluar.
 * Keputusan yang butuh keadaan toko (titik ambil, antrean, penjualan) diminta
 * lewat `CustomerContext`, yang diisi oleh DioramaWorld.
 */
import { facingOf, sameTile } from '../engine/iso';
import type { Facing, Tile } from '../engine/iso';
import type { PickPoint } from '../scenes/store-scene';

export type CustomerState =
    | 'muncul'
    | 'masuk'
    | 'ke_rak'
    | 'ambil'
    | 'ke_antrean'
    | 'antre'
    | 'dilayani'
    | 'dipindai'
    | 'bayar'
    | 'ambil_kantong'
    | 'keluar'
    | 'hilang';

/** Pembeli muncul dari transaksi nyata; latar hanya berkeliling saat sepi. */
export type CustomerKind = 'pembeli' | 'latar';

export type Customer = {
    id: number;
    kind: CustomerKind;
    saleId: number | null;
    /** Nomor variasi tampilan (warna gambar pengganti, sprite di 5C). */
    look: number;
    state: CustomerState;
    stateTime: number;
    timer: number;
    /** Posisi pecahan di grid; bilangan bulat saat berdiri di tengah tile. */
    fx: number;
    fy: number;
    path: Tile[];
    facing: Facing;
    /** 1 normal, CATCH_UP saat kejar ketinggalan. */
    speed: number;
    shelvesLeft: number;
    pick: PickPoint | null;
    carrying: number;
    hasBag: boolean;
};

export const WALK_SPEED = 2;
export const CATCH_UP = 3;
export const DURATION = {
    muncul: 0.3,
    ambil: 1,
    dilayani: 0.6,
    pindai: 0.7,
    bayar: 1,
    ambil_kantong: 0.6,
} as const;

/** Batas pindai yang diperlihatkan per pelanggan agar animasi tidak tertinggal. */
export const MAX_SCANS_SHOWN = 6;

/** State sebelum membayar: pelanggan masih bisa dikejarkan, dibatalkan, atau ditinggalkan. */
export const BEFORE_PAYING: readonly CustomerState[] = [
    'muncul',
    'masuk',
    'ke_rak',
    'ambil',
    'ke_antrean',
    'antre',
    'dilayani',
    'dipindai',
];

export type SaleProgress = {
    scansReceived: number;
    scansPlayed: number;
    itemLines: number;
    completed: boolean;
};

export interface CustomerContext {
    readonly doorInside: Tile;
    saleOf(customer: Customer): SaleProgress | null;
    claimPick(customer: Customer): PickPoint | null;
    releasePick(customer: Customer): void;
    joinQueue(customer: Customer): void;
    leaveQueue(customer: Customer): void;
    /** Slot antrean pelanggan dan apakah itu titik dilayani. */
    queueSlot(customer: Customer): { tile: Tile; front: boolean } | null;
    pathFrom(start: Tile, goal: Tile): Tile[] | null;
    exitPath(customer: Customer): Tile[];
    onServed(customer: Customer): void;
    onScan(customer: Customer): void;
    onPay(customer: Customer): void;
}

export function createCustomer(
    init: Pick<Customer, 'id' | 'kind' | 'saleId' | 'look' | 'shelvesLeft'> & {
        at: Tile;
        speed?: number;
    },
): Customer {
    return {
        id: init.id,
        kind: init.kind,
        saleId: init.saleId,
        look: init.look,
        state: 'muncul',
        stateTime: 0,
        timer: 0,
        fx: init.at.gx,
        fy: init.at.gy,
        path: [],
        facing: 'se',
        speed: init.speed ?? 1,
        shelvesLeft: init.shelvesLeft,
        pick: null,
        carrying: 0,
        hasBag: false,
    };
}

export function enter(
    customer: Customer,
    state: CustomerState,
    timer = 0,
): void {
    customer.state = state;
    customer.stateTime = 0;
    customer.timer = timer;
}

/** Jumlah pindai yang harus diperlihatkan untuk penjualan ini. */
export function scanTarget(sale: SaleProgress): number {
    const target = Math.max(
        sale.scansReceived,
        sale.completed ? sale.itemLines : 0,
    );

    return Math.min(target, MAX_SCANS_SHOWN);
}

/** Tile yang sedang dituju (langkah berjalan) atau tile tempat berdiri. */
export function anchorTile(customer: Customer): Tile {
    return customer.path.length > 0
        ? customer.path[0]
        : { gx: Math.round(customer.fx), gy: Math.round(customer.fy) };
}

export function isWalking(customer: Customer): boolean {
    return customer.path.length > 0;
}

/** Berjalan menyusuri jalur. Mengembalikan true bila jalur sudah habis (tiba). */
export function walk(customer: Customer, dt: number): boolean {
    let budget = WALK_SPEED * customer.speed * dt;

    while (budget > 0 && customer.path.length > 0) {
        const next = customer.path[0];
        const dx = next.gx - customer.fx;
        const dy = next.gy - customer.fy;
        const distance = Math.abs(dx) + Math.abs(dy);

        customer.facing = facingOf(
            Math.sign(dx),
            Math.sign(dy),
            customer.facing,
        );

        if (distance <= budget) {
            customer.fx = next.gx;
            customer.fy = next.gy;
            customer.path.shift();
            budget -= distance;
        } else {
            customer.fx += Math.sign(dx) * Math.min(budget, Math.abs(dx));
            customer.fy += Math.sign(dy) * Math.min(budget, Math.abs(dy));
            budget = 0;
        }
    }

    return customer.path.length === 0;
}

/** Ganti tujuan, mempertahankan langkah yang sedang berjalan agar tidak memotong diagonal. */
export function retarget(
    customer: Customer,
    goal: Tile,
    ctx: CustomerContext,
): void {
    const start = anchorTile(customer);
    const rest = ctx.pathFrom(start, goal) ?? [];

    customer.path = customer.path.length > 0 ? [start, ...rest] : rest;
}

function pathGoal(customer: Customer): Tile | null {
    return customer.path.at(-1) ?? null;
}

/** Keputusan setelah masuk atau setelah mengambil barang. */
function decideNext(customer: Customer, ctx: CustomerContext): void {
    if (customer.kind === 'pembeli' && ctx.saleOf(customer)?.completed) {
        customer.shelvesLeft = 0;
    }

    if (customer.shelvesLeft > 0) {
        const pick = ctx.claimPick(customer);

        if (pick) {
            customer.pick = pick;
            enter(customer, 'ke_rak');
            retarget(customer, pick, ctx);

            return;
        }
    }

    if (customer.kind === 'pembeli') {
        ctx.joinQueue(customer);
        enter(customer, 'ke_antrean');

        return;
    }

    startLeaving(customer, ctx);
}

/** Langsung keluar dari mana pun (ditinggalkan, dibatalkan, memberi tempat). */
export function startLeaving(customer: Customer, ctx: CustomerContext): void {
    if (customer.state === 'keluar' || customer.state === 'hilang') {
        return;
    }

    ctx.releasePick(customer);
    ctx.leaveQueue(customer);
    enter(customer, 'keluar');
    customer.path = ctx.exitPath(customer);
}

/** Kejar ketinggalan: transaksi sudah selesai, pelanggan bergegas ke kasir. */
export function catchUp(customer: Customer, ctx: CustomerContext): void {
    if (!BEFORE_PAYING.includes(customer.state)) {
        return;
    }

    customer.speed = CATCH_UP;
    customer.shelvesLeft = 0;

    if (customer.state === 'ke_rak') {
        ctx.releasePick(customer);
        ctx.joinQueue(customer);
        enter(customer, 'ke_antrean');
    } else if (customer.state === 'ambil') {
        customer.timer = Math.min(customer.timer, 0.2);
    }
}

export function stepCustomer(
    customer: Customer,
    dt: number,
    ctx: CustomerContext,
): void {
    customer.stateTime += dt;

    switch (customer.state) {
        case 'muncul':
            if (customer.stateTime >= DURATION.muncul) {
                enter(customer, 'masuk');
                customer.path = [ctx.doorInside];
            }

            break;

        case 'masuk':
            if (walk(customer, dt)) {
                decideNext(customer, ctx);
            }

            break;

        case 'ke_rak':
            if (walk(customer, dt) && customer.pick) {
                customer.facing = customer.pick.facing;
                enter(customer, 'ambil', DURATION.ambil / customer.speed);
            }

            break;

        case 'ambil':
            customer.timer -= dt;

            if (customer.timer <= 0) {
                customer.carrying += 1;
                customer.shelvesLeft -= 1;
                ctx.releasePick(customer);
                decideNext(customer, ctx);
            }

            break;

        case 'ke_antrean':
        case 'antre':
            stepQueue(customer, dt, ctx);

            break;

        case 'dilayani':
            if (customer.stateTime >= DURATION.dilayani / customer.speed) {
                enter(customer, 'dipindai');
            }

            break;

        case 'dipindai':
            stepScanning(customer, dt, ctx);

            break;

        case 'bayar':
            if (customer.stateTime >= DURATION.bayar) {
                customer.hasBag = true;
                enter(customer, 'ambil_kantong');
            }

            break;

        case 'ambil_kantong':
            if (customer.stateTime >= DURATION.ambil_kantong) {
                startLeaving(customer, ctx);
            }

            break;

        case 'keluar':
            if (walk(customer, dt)) {
                enter(customer, 'hilang');
            }

            break;

        case 'hilang':
            break;
    }
}

function stepQueue(customer: Customer, dt: number, ctx: CustomerContext): void {
    let slot = ctx.queueSlot(customer);

    if (slot === null) {
        // Antrean penuh (seharusnya tidak terjadi karena pembeli tampil paling banyak 5): coba lagi.
        ctx.joinQueue(customer);
        slot = ctx.queueSlot(customer);

        if (slot === null) {
            return;
        }
    }

    const goal = pathGoal(customer);
    const here = anchorTile(customer);

    if (goal ? !sameTile(goal, slot.tile) : !sameTile(here, slot.tile)) {
        retarget(customer, slot.tile, ctx);
    }

    if (!walk(customer, dt) || !sameTile(anchorTile(customer), slot.tile)) {
        return;
    }

    if (slot.front) {
        customer.facing = 'ne';
        enter(customer, 'dilayani');
        ctx.onServed(customer);
    } else {
        customer.facing = 'se';

        if (customer.state === 'ke_antrean') {
            enter(customer, 'antre');
        }
    }
}

function stepScanning(
    customer: Customer,
    dt: number,
    ctx: CustomerContext,
): void {
    const sale = ctx.saleOf(customer);

    if (sale === null) {
        startLeaving(customer, ctx);

        return;
    }

    customer.timer -= dt;

    if (customer.timer > 0) {
        return;
    }

    if (sale.scansPlayed < scanTarget(sale)) {
        sale.scansPlayed += 1;
        customer.timer = DURATION.pindai / customer.speed;
        ctx.onScan(customer);
    } else if (sale.completed) {
        enter(customer, 'bayar');
        ctx.onPay(customer);
    } else {
        customer.timer = 0;
    }
}
