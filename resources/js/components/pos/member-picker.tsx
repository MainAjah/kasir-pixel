import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemberSearch } from '@/hooks/use-member-search';
import type { MemberHit } from '@/types';

/**
 * Pemilih anggota opsional untuk layar kasir. Tanpa logika bisnis: hanya mencari,
 * memilih, dan melepas. Server memutuskan apakah anggota sah saat bayar.
 */
export default function MemberPicker({
    member,
    onChange,
}: {
    member: MemberHit | null;
    onChange: (member: MemberHit | null) => void;
}) {
    const [query, setQuery] = useState('');
    const results = useMemberSearch(query);

    if (member) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2 text-sm">
                <span>
                    <span className="font-medium">{member.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                        {member.number}
                    </span>
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange(null)}
                >
                    Lepas
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor="anggota">Anggota (opsional)</Label>
            <Input
                id="anggota"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                placeholder="Nomor atau nama anggota"
            />
            {results.length > 0 && (
                <ul className="divide-y rounded-md border bg-card text-sm">
                    {results.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                className="w-full p-2 text-left hover:bg-muted"
                                onClick={() => {
                                    onChange(m);
                                    setQuery('');
                                }}
                            >
                                {m.name}
                                <span className="ml-2 font-mono text-xs text-muted-foreground">
                                    {m.number}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
