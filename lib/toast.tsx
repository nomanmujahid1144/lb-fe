import { toast as sonnerToast } from 'sonner';
import { CircularCheckMarkIcon } from '@/components/Icons';

export const toast = {
  success: (message: string) => {
    sonnerToast.custom(() => (
      <div className="flex items-center gap-3 bg-white border border-stroke rounded-xl px-5 py-3.5 shadow-lg">
        <CircularCheckMarkIcon size={20} className="flex-shrink-0" />
        <span className="text-sm font-medium text-text-heading">
          {message}
        </span>
      </div>
    ), {
      duration: 3000,
    });
  },

  error: (message: string) => {
    sonnerToast.custom(() => (
      <div className="flex items-center gap-3 bg-white border border-stroke rounded-xl px-5 py-3.5 shadow-lg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-600 flex-shrink-0">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
          <path d="M15 9l-6 6m0-6l6 6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-medium text-text-heading">
          {message}
        </span>
      </div>
    ), {
      duration: 3000,
    });
  },

  info: (message: string) => {
    sonnerToast.custom(() => (
      <div className="flex items-center gap-3 bg-white border border-stroke rounded-xl px-5 py-3.5 shadow-lg">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-icon-linkedin flex-shrink-0">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
          <path d="M12 16v-4m0-4h.01" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-medium text-text-heading">
          {message}
        </span>
      </div>
    ), {
      duration: 3000,
    });
  },
};