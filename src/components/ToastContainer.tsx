import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  variant: 'emerald' | 'cyan' | 'amber';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const tone =
          toast.variant === 'emerald'
            ? 'border-emerald-500/40 bg-[#111C19] text-emerald-200'
            : toast.variant === 'amber'
              ? 'border-amber-500/40 bg-[#1C1810] text-amber-200'
              : 'border-cyan-500/40 bg-[#101A22] text-cyan-200';

        const Icon =
          toast.variant === 'emerald'
            ? CheckCircle2
            : toast.variant === 'amber'
              ? AlertTriangle
              : Info;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-3.5 py-3 shadow-xl shadow-black/50 flex items-start gap-2.5 ${tone}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">{toast.body}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Dismiss ${toast.title}`}
              className="text-slate-400 hover:text-slate-100 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
