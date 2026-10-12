import { useCallback, useEffect, useRef, useState } from 'react';

export type Toast = { mensaje: string; tipo: 'ok' | 'error' } | null;

/** Mensaje temporal de confirmación o error que desaparece a los 3 segundos. */
export function useToast(duracionMs = 3000) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mostrar = useCallback(
    (mensaje: string, tipo: 'ok' | 'error' = 'ok') => {
      clearTimeout(timer.current);
      setToast({ mensaje, tipo });
      timer.current = setTimeout(() => setToast(null), duracionMs);
    },
    [duracionMs],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, mostrar };
}
