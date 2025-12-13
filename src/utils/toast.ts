// Simple toast notification utility
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export const toast = {
  show: ({ message, type = 'info', duration = 3000 }: ToastOptions) => {
    const container = getOrCreateContainer();
    const toastEl = document.createElement('div');
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    
    toastEl.style.cssText = `
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 600;
      font-size: 14px;
      max-width: 400px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    toastEl.textContent = message;
    
    container.appendChild(toastEl);
    
    setTimeout(() => {
      toastEl.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        container.removeChild(toastEl);
        if (container.children.length === 0) {
          document.body.removeChild(container);
        }
      }, 300);
    }, duration);
  },
  
  success: (message: string) => toast.show({ message, type: 'success' }),
  error: (message: string) => toast.show({ message, type: 'error', duration: 5000 }),
  info: (message: string) => toast.show({ message, type: 'info' }),
  warning: (message: string) => toast.show({ message, type: 'warning' })
};

function getOrCreateContainer(): HTMLDivElement {
  let container = document.getElementById('toast-container') as HTMLDivElement;
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    `;
    document.body.appendChild(container);
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  return container;
}
