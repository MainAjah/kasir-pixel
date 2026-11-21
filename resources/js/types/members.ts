export type SavingsType = 'pokok' | 'wajib' | 'sukarela';

export type Balances = Record<SavingsType, number>;

export type Rates = {
    pokok: number;
    wajib: number;
    sukarela_min: number;
};

export type MonthOption = {
    value: string;
    label: string;
    paid: boolean;
};

export type MemberSummary = {
    id: number;
    number: string;
    name: string;
    phone: string | null;
    address: string | null;
    status: 'active' | 'exited';
    status_label: string;
    is_active: boolean;
    joined_at: string;
    exited_at: string | null;
};

export type LedgerEntry = {
    id: number;
    number: string;
    time: string;
    savings_type: SavingsType;
    type_label: string;
    entry_type: 'deposit' | 'withdrawal' | 'reversal';
    entry_label: string;
    amount: number;
    balance_after: number;
    period: string | null;
    note: string | null;
    by: string | null;
    is_reversal: boolean;
    is_reversed: boolean;
    can_reverse: boolean;
};

/** Anggota hasil pencarian di layar kasir: hanya id, nomor, dan nama. */
export type MemberHit = {
    id: number;
    number: string;
    name: string;
};
