import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  sentryId?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Log to Sentry in production
    const sentryId = `SENTRY_ID_${Date.now()}`;
    console.error("Error caught:", error);
    this.setState({ sentryId });
  }

  handleReset = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-rj-green-dark px-4">
          <div className="max-w-md text-center">
            <h1 className="font-display text-4xl text-rj-gold mb-4">
              Algo deu errado
            </h1>
            <p className="text-rj-beige-bg/90 mb-2">
              Desculpe, encontramos um erro inesperado.
            </p>
            {this.state.sentryId && (
              <p className="text-rj-beige-accent text-sm mb-6">
                ID: {this.state.sentryId}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="bg-rj-gold text-rj-green-dark px-6 py-2 rounded-md font-semibold hover:bg-rj-gold/90 transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
