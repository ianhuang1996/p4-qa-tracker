import { useState, useCallback } from 'react';

interface ConfirmState {
  open: boolean;
  message: string;
  title?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmLabel?: string;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, message: '' });
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((
    message: string,
    opts?: { title?: string; variant?: 'danger' | 'warning' | 'info'; confirmLabel?: string }
  ): Promise<boolean> => {
    return new Promise<boolean>((res) => {
      setState({ open: true, message, ...opts });
      setResolve(() => res);
    });
  }, []);

  const onConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolve?.(true);
  }, [resolve]);

  const onCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolve?.(false);
  }, [resolve]);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      message: state.message,
      title: state.title,
      variant: state.variant,
      confirmLabel: state.confirmLabel,
      onConfirm,
      onCancel,
    },
  };
}
