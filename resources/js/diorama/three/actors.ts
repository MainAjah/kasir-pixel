/**
 * Sprite aktor diorama 3D (Tahap 5H a2) dari logika `DioramaWorld` yang ada,
 * tanpa menulis ulang logika jalan, antrean, maupun gerak.
 *
 * Karakter pemilik dipakai apa adanya: gambar dari `reference-loader`, gerak
 * "cara 1" yang sudah disetujui (`motionFrame`, `transformFrame`, cermin), dan
 * aturan pemilihan karakter, arah, serta aksi yang sama dengan Canvas
 * (`customerCharacter`, `headingOf`, `customerAction`). Di 3D tidak ada
 * resample: 1 piksel gambar = 1 piksel dalam (lihat sprite-quad.ts).
 *
 * Murni: gambar asli diberikan lewat `matrixOf`, jadi bisa dites di Node.
 */
import type { Customer } from '../actors/customer';
import type { DioramaWorld } from '../engine/world';
import {
    customerAction,
    customerCharacter,
    headingOf,
} from '../render/placeholder-renderer';
import type { Heading } from '../render/placeholder-renderer';
import type { Furniture } from '../scenes/store-scene';
import {
    FOOT_X,
    FOOT_Y,
    FRAME_W,
    buildCustomerFrame,
    frameAt,
    variantForLook,
    variantKey,
} from '../sprites/customer-sprite';
import { mirror } from '../sprites/pixels';
import type { PixelMatrix } from '../sprites/pixels';
import {
    motionFrame,
    referenceByKey,
    referenceFlip,
    referenceFrameSize,
    transformFrame,
} from '../sprites/reference-sprite';
import { leafTexture } from '../assets/procedural/leaf';
import { plantTop } from './build-furniture';
import type { Vec3 } from './camera-math';

export type BuiltSprite = { matrix: PixelMatrix; footX: number; footY: number };

export type ActorSprite = {
    /** Kunci bingkai di atlas karakter (bingkai sama = kunci sama). */
    key: string;
    /** Membuat bingkai bila belum ada di atlas. */
    build: () => BuiltSprite;
    /** Titik pijak di dunia. */
    foot: Vec3;
    /** Melayang di atas lantai (piksel). */
    hover: number;
    /** 0…1, memudar di ambang pintu seperti di Canvas. */
    alpha: number;
};

export type MatrixLookup = (key: string) => PixelMatrix | null;

/** Titik pijak aktor di tile (fx, fy): tengah ubin di lantai. */
export function footOf(fx: number, fy: number): Vec3 {
    return [fx + 0.5, 0, fy + 0.5];
}

/** Sprite satu pelanggan, dengan aturan yang sama dengan `drawCustomer` di Canvas. */
export function customerSprite(
    world: Pick<DioramaWorld, 'time'>,
    customer: Customer,
    matrixOf: MatrixLookup,
    headings: Map<number, Heading>,
): ActorSprite | null {
    const alpha = Math.max(0, Math.min(1, customer.fx + 1));

    if (customer.state === 'hilang' || alpha <= 0) {
        return null;
    }

    const action = customerAction(customer);
    const frame = frameAt(action, world.time, customer.id * 0.37);
    const heading = headingOf(customer, headings.get(customer.id));
    headings.set(customer.id, heading);
    const character = customerCharacter(customer);
    const src = character ? matrixOf(character.key) : null;
    const foot = footOf(customer.fx, customer.fy);

    if (character && src) {
        const movingLeft = heading.left;
        const flip = referenceFlip(character, movingLeft);
        const size = referenceFrameSize(src);

        return {
            key: `ref|${character.key}|${action}|${frame}|${flip ? 1 : 0}|${movingLeft ? 1 : 0}`,
            build: () => {
                const m = transformFrame(
                    src,
                    motionFrame(character, action, frame, movingLeft),
                );

                return {
                    matrix: flip ? mirror(m) : m,
                    footX: flip ? size.width - 1 - size.footX : size.footX,
                    footY: size.footY,
                };
            },
            foot,
            hover: character.hover,
            alpha,
        };
    }

    // Pelanggan buatan kode (giliran kedelapan), sama dengan Canvas.
    const side = heading.front ? 'depan' : 'belakang';
    const flip = heading.front ? !heading.left : heading.left;
    const variant = variantForLook(customer.look);

    return {
        key: `pelanggan|${variantKey(variant)}|${side}|${action}|${frame}|${flip ? 1 : 0}`,
        build: () => {
            const m = buildCustomerFrame(variant, side, action, frame);

            return {
                matrix: flip ? mirror(m) : m,
                footX: flip ? FRAME_W - 1 - FOOT_X : FOOT_X,
                footY: FOOT_Y,
            };
        },
        foot,
        hover: 0,
        alpha,
    };
}

/**
 * Zombie penjaga kasir berdiri diam di tempatnya (langkah a2): gerak "diam"
 * yang sudah ada, menghadap menurut arah hadap kasir di logika.
 */
export function zombieSprite(
    world: Pick<DioramaWorld, 'time' | 'cashier'>,
    matrixOf: MatrixLookup,
): ActorSprite | null {
    const zombie = referenceByKey('zombie');
    const src = matrixOf('zombie');

    if (!zombie || !src) {
        return null;
    }

    const cashier = world.cashier;
    const movingLeft = cashier.facing === 'sw' || cashier.facing === 'nw';
    const flip = referenceFlip(zombie, movingLeft);
    const frame = frameAt('diam', world.time);
    const size = referenceFrameSize(src);

    return {
        key: `ref|zombie|diam|${frame}|${flip ? 1 : 0}`,
        build: () => {
            const m = transformFrame(src, motionFrame(zombie, 'diam', frame));

            return {
                matrix: flip ? mirror(m) : m,
                footX: flip ? size.width - 1 - size.footX : size.footX,
                footY: size.footY,
            };
        },
        foot: footOf(cashier.fx, cashier.fy),
        hover: 0,
        alpha: 1,
    };
}

/** Ukuran rimbun daun di atas pot (texel = piksel). */
export const LEAF_SIZE = { w: 32, h: 24 } as const;

/** Rimbun daun tanaman pot: sprite tetap, dua baris bawahnya masuk ke bibir pot. */
export function plantSprite(item: Furniture, seed: number): ActorSprite {
    return {
        key: `daun|${item.id}`,
        build: () => ({
            matrix: leafTexture(LEAF_SIZE.w, LEAF_SIZE.h, seed),
            footX: LEAF_SIZE.w / 2,
            footY: LEAF_SIZE.h - 3,
        }),
        foot: plantTop(item),
        hover: 0,
        alpha: 1,
    };
}

/** Semua sprite aktor yang tampil di bingkai ini. */
export function actorSprites(
    world: DioramaWorld,
    matrixOf: MatrixLookup,
    headings: Map<number, Heading>,
): ActorSprite[] {
    const sprites: ActorSprite[] = [];
    const zombie = zombieSprite(world, matrixOf);

    if (zombie) {
        sprites.push(zombie);
    }

    for (const customer of world.customers) {
        const s = customerSprite(world, customer, matrixOf, headings);

        if (s) {
            sprites.push(s);
        }
    }

    // Arah hadap pelanggan yang sudah pergi tidak perlu diingat lagi.
    const present = new Set(world.customers.map((c) => c.id));

    for (const id of headings.keys()) {
        if (!present.has(id)) {
            headings.delete(id);
        }
    }

    return sprites;
}
