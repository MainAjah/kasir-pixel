import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE } from '../scenes/store-scene';
import { QueueManager } from './queue';

describe('QueueManager', () => {
    const make = () => new QueueManager(STORE_SCENE.queueSlots);

    it('slot 0 adalah titik dilayani (9,7), lalu ke belakang', () => {
        const queue = make();

        expect(queue.join(10)).toBe(0);
        expect(queue.join(11)).toBe(1);
        expect(queue.slotOf(10)).toEqual({ gx: 9, gy: 7 });
        expect(queue.slotOf(11)).toEqual({ gx: 8, gy: 7 });
        expect(queue.front()).toBe(10);
    });

    it('paling banyak 5; yang keenam ditolak', () => {
        const queue = make();
        [1, 2, 3, 4, 5].forEach((id) => queue.join(id));

        expect(queue.isFull()).toBe(true);
        expect(queue.join(6)).toBe(-1);
        expect(queue.size).toBe(5);
    });

    it('bergabung dua kali tidak menggandakan', () => {
        const queue = make();
        queue.join(1);

        expect(queue.join(1)).toBe(0);
        expect(queue.size).toBe(1);
    });

    it('yang di belakang maju saat depan keluar', () => {
        const queue = make();
        [1, 2, 3].forEach((id) => queue.join(id));
        queue.leave(1);

        expect(queue.front()).toBe(2);
        expect(queue.slotOf(3)).toEqual({ gx: 8, gy: 7 });
        expect(queue.slotOf(1)).toBeNull();
    });

    it('keluar dari tengah antrean juga memajukan yang di belakangnya', () => {
        const queue = make();
        [1, 2, 3].forEach((id) => queue.join(id));
        queue.leave(2);

        expect(queue.members).toEqual([1, 3]);
        expect(queue.indexOf(3)).toBe(1);
    });
});
