import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { BTN } from '../constants';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">發生了一些問題</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            {this.state.error?.message || '頁面載入時發生錯誤，請重新整理試試。'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className={BTN.primary}
          >
            <RefreshCw size={16} /> 重新整理
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
