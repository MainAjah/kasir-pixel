/**
 * Geometri pendukung cahaya sore (Tahap 5H langkah a3), murni tanpa three.js:
 * - penghalang sinar dinding kanan: dinding tak terlihat yang hanya dipakai
 *   peta bayangan, berlubang di kaca jendela dan berkusen silang, sehingga
 *   matahari masuk lewat jendela sebagai bidang terang bersilang di lantai;
 * - prisma berkas sinar dari kaca jendela ke lantai;
 * - oklusi ambien dipanggang ke warna vertex.
 */
import type { Box } from './build-furniture';
import type { MeshArrays } from './build-store';
import type { Vec3 } from './camera-math';
import {
    ambientOcclusion,
    beamCorners,
    windowGlassRect,
    windowMullions,
} from './lighting-math';
import type { Rect } from './lighting-math';
import { WALL_H, WALL_T } from './space';

export type PlainMesh = { positions: number[]; indices: number[] };

/** Bidang penghalang sedikit di balik muka dalam dinding kanan. */
export const CASTER_Z = -0.02;

function addRect(out: PlainMesh, r: Rect, z: number): void {
    if (r.x1 - r.x0 <= 1e-6 || r.y1 - r.y0 <= 1e-6) {
        return;
    }

    const b = out.positions.length / 3;
    out.positions.push(
        r.x0,
        r.y0,
        z,
        r.x1,
        r.y0,
        z,
        r.x1,
        r.y1,
        z,
        r.x0,
        r.y1,
        z,
    );
    out.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

/**
 * Dinding kanan sebagai penghalang sinar: seluruh dinding dikurangi kaca
 * jendela, ditambah kusen silang di dalam kaca.
 */
export function wallCaster(
    sceneWidth: number,
    glass: Rect = windowGlassRect(),
    mullions: readonly Rect[] = windowMullions(),
): PlainMesh {
    const out: PlainMesh = { positions: [], indices: [] };
    const x0 = -WALL_T;
    const x1 = sceneWidth;

    addRect(out, { x0, x1: glass.x0, y0: 0, y1: WALL_H }, CASTER_Z);
    addRect(out, { x0: glass.x1, x1, y0: 0, y1: WALL_H }, CASTER_Z);
    addRect(out, { x0: glass.x0, x1: glass.x1, y0: 0, y1: glass.y0 }, CASTER_Z);
    addRect(
        out,
        { x0: glass.x0, x1: glass.x1, y0: glass.y1, y1: WALL_H },
        CASTER_Z,
    );

    for (const m of mullions) {
        addRect(out, m, CASTER_Z);
    }

    return out;
}

export type BeamMesh = PlainMesh & {
    /** 0 di kaca jendela, 1 di lantai. */
    along: number[];
    /** 0 dan 1 di dua rusuk panjang tiap sisi, untuk tepi lembut. */
    across: number[];
};

/** Empat sisi prisma berkas sinar dari kaca jendela ke lantai. */
export function beamMesh(glass: Rect = windowGlassRect()): BeamMesh {
    const { window, floor } = beamCorners(glass);
    const out: BeamMesh = { positions: [], indices: [], along: [], across: [] };

    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const corners: Vec3[] = [window[i], window[j], floor[j], floor[i]];
        const b = out.positions.length / 3;

        corners.forEach((c, k) => {
            out.positions.push(c[0], c[1], c[2]);
            out.along.push(k < 2 ? 0 : 1);
            out.across.push(k === 0 || k === 3 ? 0 : 1);
        });
        out.indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }

    return out;
}

/** Warna vertex dengan oklusi ambien dikalikan (array baru, panjang sama). */
export function withAmbientOcclusion(
    mesh: Pick<MeshArrays, 'positions' | 'colors'>,
    boxes: readonly Box[],
): number[] {
    const out = mesh.colors.slice();

    for (let v = 0; v < mesh.positions.length / 3; v++) {
        const ao = ambientOcclusion(
            [
                mesh.positions[v * 3],
                mesh.positions[v * 3 + 1],
                mesh.positions[v * 3 + 2],
            ],
            boxes,
        );
        out[v * 3] *= ao;
        out[v * 3 + 1] *= ao;
        out[v * 3 + 2] *= ao;
    }

    return out;
}
