import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format';
import type { LedgerEntry } from '@/types';

/** Riwayat ledger satu anggota. Hanya tampilan; aksi balik diteruskan ke induk. */
export default function LedgerTable({
    entries,
    onReverse,
}: {
    entries: LedgerEntry[];
    onReverse: (entry: LedgerEntry) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                    <tr>
                        <th className="p-3">Nomor</th>
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Jenis</th>
                        <th className="p-3 text-right">Jumlah</th>
                        <th className="p-3 text-right">Saldo</th>
                        <th className="p-3">Keterangan</th>
                        <th className="p-3" />
                    </tr>
                </thead>
                <tbody>
                    {entries.length === 0 && (
                        <tr>
                            <td
                                colSpan={7}
                                className="p-6 text-center text-muted-foreground"
                            >
                                Belum ada transaksi.
                            </td>
                        </tr>
                    )}
                    {entries.map((e) => (
                        <tr key={e.id} className="border-t align-top">
                            <td className="p-3 font-mono">{e.number}</td>
                            <td className="p-3 whitespace-nowrap">{e.time}</td>
                            <td className="p-3">
                                {e.type_label}
                                {e.period && ` ${e.period}`}
                                <span className="block text-xs text-muted-foreground">
                                    {e.entry_label}
                                </span>
                                {e.is_reversal && (
                                    <Badge variant="secondary">Pembalik</Badge>
                                )}
                                {e.is_reversed && (
                                    <Badge variant="outline">
                                        Sudah dibalik
                                    </Badge>
                                )}
                            </td>
                            <td
                                className={
                                    e.amount < 0
                                        ? 'p-3 text-right whitespace-nowrap text-destructive'
                                        : 'p-3 text-right whitespace-nowrap'
                                }
                            >
                                {e.amount > 0 ? '+' : ''}
                                {formatRupiah(e.amount)}
                            </td>
                            <td className="p-3 text-right font-medium whitespace-nowrap">
                                {formatRupiah(e.balance_after)}
                            </td>
                            <td className="p-3">
                                {e.note ?? '-'}
                                <span className="block text-xs text-muted-foreground">
                                    {e.by}
                                </span>
                            </td>
                            <td className="p-3 text-right">
                                {e.can_reverse && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onReverse(e)}
                                    >
                                        Balik
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
