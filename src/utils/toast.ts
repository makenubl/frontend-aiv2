export const toast = {
  success: (message: string) => {
    console.log('✅', message);
    // In a real app, you'd use a toast library like react-toastify
    // For now, we'll just log to console
  },
  error: (message: string) => {
    console.error('❌', message);
  },
  info: (message: string) => {
    console.log('ℹ️', message);
  },
};
