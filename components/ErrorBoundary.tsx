'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if it's a hydration error
    if (error.message.includes('Hydration') || error.message.includes('hydration')) {
      // Force a client-side re-render after hydration
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 100);
    }
    
    this.setState({ errorInfo });
  }

  handleLoginRedirect = async () => {
    try {
      // Call the logout API to properly clean up the session
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Silently handle logout API errors in production
    }
    
    // Clear any stored user data
    localStorage.clear();
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to login
    window.location.href = '/auth/login';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              There was an issue loading the page. Please log in again to continue.
            </p>
            <button 
              onClick={this.handleLoginRedirect}
              className="w-full bg-[#47577d] text-white px-4 py-2 rounded hover:bg-[#3b4a63] transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
