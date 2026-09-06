import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div role="alert" className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-mono text-sm tracking-widest text-destructive uppercase">Aw, snap</p>
          <h1 className="font-display mt-3 text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-fg-secondary">
            The page hit an unexpected error and had to be stopped.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-background px-3 py-2 text-left font-mono text-xs text-fg-muted">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      </main>
    );
  }
}

export { ErrorBoundary };