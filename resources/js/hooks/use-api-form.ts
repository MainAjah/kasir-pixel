import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, apiSend } from '@/lib/api';

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Pengganti `useForm` Inertia untuk form yang menyimpan lewat REST API
 * (Tahap 11): `data`, `setData`, `errors` dari jawaban 422, dan `processing`.
 * Pesan sukses dari server (`message`) dan galat selain 422 tampil sebagai toast.
 */
export function useApiForm<T extends Record<string, unknown>>(initial: T) {
    const [data, setAll] = useState<T>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const setData = useCallback(
        <K extends keyof T>(key: K, value: T[K]) =>
            setAll((d) => ({ ...d, [key]: value })),
        [],
    );

    const submit = useCallback(
        async <R = unknown>(
            method: Method,
            url: string,
            options: {
                /** Isi lain selain `data`, mis. FormData untuk unggah gambar. */
                body?: unknown;
                onSuccess?: (body: R) => void;
            } = {},
        ): Promise<R | null> => {
            setProcessing(true);

            try {
                const body = await apiSend<R>(
                    method,
                    url,
                    options.body ?? data,
                );
                const message = (body as { message?: string } | null)?.message;

                setErrors({});

                if (message) {
                    toast.success(message);
                }

                options.onSuccess?.(body);

                return body;
            } catch (e) {
                if (e instanceof ApiError && e.status === 422) {
                    setErrors(e.errors);
                } else if (e instanceof ApiError) {
                    toast.error(e.message);
                } else {
                    toast.error('Gagal menyimpan. Coba lagi.');
                }

                return null;
            } finally {
                setProcessing(false);
            }
        },
        [data],
    );

    return {
        data,
        setData,
        setAll,
        errors,
        setErrors,
        clearErrors: () => setErrors({}),
        processing,
        submit,
        reset: () => setAll(initial),
    };
}
