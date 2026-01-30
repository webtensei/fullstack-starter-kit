import { ErrorBoundaryProps, withErrorBoundary } from 'react-error-boundary';
import { QueryClientProvider } from '@app/providers/with-query-client';
import { BrowserRouter } from '@app/providers/with-router';
import { withSuspense } from '@app/providers/with-suspense';
import '../styles/index.scss';
import { FC, ReactNode } from 'react';
import { AntdProvider } from './with-antd';

function Providers() {
  return (
    <QueryClientProvider>
      <AntdProvider>
        <BrowserRouter />
      </AntdProvider>
    </QueryClientProvider>
  );
}

const SuspenseProvider = withSuspense(Providers as FC<Object>, {
  fallback: (<div>загрузка</div>) as ReactNode,
});
export const Provider = withErrorBoundary(SuspenseProvider, {
  fallbackRender: ({ error }) =>
    //  <FullPageError error={error} />,
    <div>{JSON.stringify(error)}</div>,
} as ErrorBoundaryProps);
