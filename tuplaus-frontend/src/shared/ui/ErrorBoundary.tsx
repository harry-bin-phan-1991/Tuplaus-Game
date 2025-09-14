import { Component, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 10, background: '#fef2f2', color: '#7f1d1d', fontFamily: 'system-ui' }}>
          Something went wrong: {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}


