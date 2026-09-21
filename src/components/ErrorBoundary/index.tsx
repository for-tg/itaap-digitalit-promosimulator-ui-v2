import { Component, type ErrorInfo, type ReactNode } from 'react';

import i18n from '~/i18n/i18n';

import styles from './styles.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Top-level error boundary that catches rendering errors in the subtree.
 * Displays a user-friendly fallback rather than a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className={styles.card}>
            <strong>{i18n.t('errors.somethingWentWrong')}</strong>
            <p className={styles.msg}>{this.state.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
