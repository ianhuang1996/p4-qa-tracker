import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Z } from '../styles/tokens';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger:  { icon: 'bg-red-100 text-red-600',   btn: 'bg-red-600 hover:bg-red-700 shadow-red-200' },
  warning: { icon: 'bg-amber-100 text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' },
  info:    { icon: 'bg-blue-100 text-blue-600',  btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message,
  confirmLabel = '確定', cancelLabel = '取消',
  variant = 'danger', onConfirm, onCancel,
}) => {
  const vs = VARIANT_STYLES[variant];

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${Z.confirm} flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm`} onClick={onCancel}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-full ${vs.icon} flex items-center justify-center mx-auto mb-4`}>
              <AlertTriangle size={24} />
            </div>

            {title && <h3 className="text-lg font-black text-gray-900 mb-1">{title}</h3>}
            <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{message}</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white ${vs.btn} transition-colors shadow-lg`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
