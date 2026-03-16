import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../contexts/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast = ({ toast, onRemove }: ToastProps) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="toast-icon success" />;
      case 'error':
        return <AlertCircle size={20} className="toast-icon error" />;
      case 'info':
      default:
        return <Info size={20} className="toast-icon info" />;
    }
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      {getIcon()}
      <p className="toast-message">{toast.message}</p>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <X size={16} />
      </button>
      <div className={`toast-progress toast-progress-${toast.type}`} />
    </div>
  );
};

export default Toast;
