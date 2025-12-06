
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                    <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
                        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
                    <p className="mb-6 text-muted-foreground">
                        We apologize for the inconvenience. Please try refreshing the page.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            Go Home
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-8 overflow-auto rounded bg-slate-100 p-4 text-left text-xs text-red-600 dark:bg-slate-900">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
