import { describe, expect, it } from 'vite-plus/test';
import { timeOfDayAt, timeOverride } from './clock';

const at = (h: number, m = 0) => new Date(2026, 10, 22, h, m);

describe('waktu diorama dari jam browser', () => {
    it.each([
        [0, 0, 'malam'],
        [4, 59, 'malam'],
        [5, 0, 'senja'],
        [5, 59, 'senja'],
        [6, 0, 'siang'],
        [12, 30, 'siang'],
        [16, 59, 'siang'],
        [17, 0, 'senja'],
        [18, 59, 'senja'],
        [19, 0, 'malam'],
        [23, 59, 'malam'],
    ] as const)('%i.%i → %s', (h, m, expected) => {
        expect(timeOfDayAt(at(h, m))).toBe(expected);
    });
});

describe('pilihan waktu lewat alamat untuk demo', () => {
    it('mengenali siang, senja, malam', () => {
        expect(timeOverride('?waktu=malam')).toBe('malam');
        expect(timeOverride('?a=1&waktu=senja')).toBe('senja');
    });

    it('selain itu memakai jam browser', () => {
        expect(timeOverride('')).toBeNull();
        expect(timeOverride('?waktu=pagi')).toBeNull();
    });
});
