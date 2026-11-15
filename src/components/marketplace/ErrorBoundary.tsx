"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Component ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-12 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="size-6" />
          </span>
          <h2 className="mt-3 text-lg font-bold text-[#050505]">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#65676B]">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
          >
            <RefreshCw className="size-4" />
            <span>Try again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
