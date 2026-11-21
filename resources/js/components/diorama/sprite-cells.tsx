import { useEffect, useRef } from 'react';
import { startLoop } from '@/diorama/engine/loop';
import { C } from '@/diorama/sprites/palette';

/** Satu kanvas pratinjau: digambar ulang tiap bingkai dengan waktu berjalan. */
export type Cell = {
    key: string;
    label: string;
    width: number;
    height: number;
    draw: (ctx: CanvasRenderingContext2D, time: number) => void;
};

export type CellSection = {
    title: string;
    note?: string;
    cells: Cell[];
    /** Perbesaran tampilan (bawaan 4×). */
    scale?: number;
};

export function clearCell(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
): void {
    ctx.fillStyle = C(5);
    ctx.fillRect(0, 0, width, height);
}

function CellCanvas({
    cell,
    scale,
    register,
}: {
    cell: Cell;
    scale: number;
    register: (key: string, canvas: HTMLCanvasElement | null) => void;
}) {
    return (
        <figure className="space-y-1">
            <canvas
                ref={(canvas) => register(cell.key, canvas)}
                width={cell.width}
                height={cell.height}
                className="block rounded-sm border"
                style={{
                    width: cell.width * scale,
                    height: cell.height * scale,
                    imageRendering: 'pixelated',
                }}
            />
            <figcaption className="text-xs text-muted-foreground">
                {cell.label}
            </figcaption>
        </figure>
    );
}

/**
 * Bagian-bagian pratinjau sprite. Satu loop untuk semua kanvas, berhenti saat
 * tab tersembunyi seperti diorama.
 */
export function CellSections({ sections }: { sections: CellSection[] }) {
    const canvases = useRef(new Map<string, HTMLCanvasElement>());
    const sectionsRef = useRef(sections);

    useEffect(() => {
        sectionsRef.current = sections;
    }, [sections]);

    const register = (key: string, canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            canvases.current.set(key, canvas);
        } else {
            canvases.current.delete(key);
        }
    };

    useEffect(() => {
        let time = 0;
        const loop = startLoop((dt) => {
            time += dt;

            for (const section of sectionsRef.current) {
                for (const cell of section.cells) {
                    const ctx = canvases.current
                        .get(cell.key)
                        ?.getContext('2d');

                    if (ctx) {
                        ctx.imageSmoothingEnabled = false;
                        cell.draw(ctx, time);
                    }
                }
            }
        });

        return () => loop.stop();
    }, []);

    return (
        <div className="space-y-6">
            {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                    <h3 className="text-sm font-medium">{section.title}</h3>
                    {section.note && (
                        <p className="text-sm text-muted-foreground">
                            {section.note}
                        </p>
                    )}
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-4 overflow-x-auto pb-1">
                        {section.cells.map((cell) => (
                            <CellCanvas
                                key={cell.key}
                                cell={cell}
                                scale={section.scale ?? 4}
                                register={register}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
