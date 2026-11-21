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
