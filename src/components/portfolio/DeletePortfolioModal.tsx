import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeletePortfolioModalProps {
  open: boolean;
  portfolioTitle: string;
  deleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeletePortfolioModal: React.FC<DeletePortfolioModalProps> = ({
  open, portfolioTitle, deleting = false, onConfirm, onCancel,
}) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

            {/* Content */}
            <div className="px-7 pt-7 pb-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mx-auto mb-5">
                <div className="relative">
                  <Trash2 className="w-7 h-7 text-red-500" />
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 absolute -top-1 -right-1.5" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
                Supprimer définitivement ce portfolio ?
              </h2>

              {/* Portfolio name pill */}
              {portfolioTitle && (
                <div className="flex justify-center mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700 max-w-[260px] truncate">
                    <span className="truncate">« {portfolioTitle} »</span>
                  </span>
                </div>
              )}

              {/* Warning */}
              <p className="text-sm text-gray-500 text-center leading-relaxed">
                Cette action est <span className="font-semibold text-gray-700">irréversible</span>.
                Le portfolio, ses projets, compétences et expériences seront définitivement supprimés.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-7 pb-7">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={deleting}
                className="flex-1 rounded-xl h-11"
              >
                Annuler
              </Button>
              <Button
                onClick={onConfirm}
                disabled={deleting}
                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm shadow-red-200"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
