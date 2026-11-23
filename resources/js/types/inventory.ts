export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    /** Nomor urut baris pertama dan terakhir di halaman ini (null bila kosong). */
    from?: number | null;
    to?: number | null;
};

export type UnitOption = {
    id: number;
    name: string;
    conversion: number;
};

export type ProductOption = {
    id: number;
    sku: string;
    name: string;
    units: UnitOption[];
};
