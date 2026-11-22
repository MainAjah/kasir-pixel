/**
 * Letak tombol berlabel tiap pos (Tahap 5D-2), dalam koordinat kanvas dasar.
 * Tombol berada tepat di depan meja pos: di bawah pojok depan tile meja yang
 * paling dekat ke penonton, jadi tidak menutupi penjaga maupun meja.
 */
import type { PostKey, StoreScene } from '../scenes/store-scene';
import { TILE_H, tileTop } from './iso';
import type { Point } from './iso';

export const POST_KEYS: readonly PostKey[] = ['kasir', 'inventaris'];

/** Jarak tombol dari pojok depan meja (px kanvas dasar). */
export const POST_BUTTON_GAP = 6;

export function postAnchor(scene: StoreScene, post: PostKey): Point {
    const deskId = scene.posts[post].desk;
    const desk = scene.furniture.find((f) => f.id === deskId);

    if (!desk) {
        throw new Error(`Meja pos ${post} (${deskId}) tidak ada di denah.`);
    }

    const front = tileTop(desk.gx + desk.w - 1, desk.gy + desk.h - 1);

    return { x: front.x, y: front.y + TILE_H + POST_BUTTON_GAP };
}
