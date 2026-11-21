const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('id-ID');

export function formatRupiah(value: number | null | undefined): string {
    return value === null || value === undefined ? '-' : rupiah.format(value);
}

export function formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined ? '-' : number.format(value);
}
