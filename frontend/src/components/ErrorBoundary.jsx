import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Rendering Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="container py-5 text-center flex items-center justify-center" 
          style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            className="glass-panel p-5 text-center" 
            style={{ maxWidth: '580px', width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color-glow)', boxShadow: 'var(--shadow-neon)' }}
          >
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: 'var(--error)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h2 className="text-white font-bold mb-2" style={{ fontSize: '1.6rem' }}>
              Something Went Wrong
            </h2>

            <p className="text-secondary text-sm mb-4" style={{ lineHeight: '1.6' }}>
              ArenaVerse encountered an unexpected rendering error. Don't worry, your account data and match progress are safe.
            </p>

            {this.state.error && (
              <div 
                className="mb-4 text-xs text-start" 
                style={{ 
                  textAlign: 'left', 
                  background: 'var(--bg-tertiary)', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-sm)', 
                  color: 'var(--error)', 
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '120px'
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary" 
                onClick={this.handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={this.handleGoHome}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Home size={16} />
                <span>Return to Arena Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
