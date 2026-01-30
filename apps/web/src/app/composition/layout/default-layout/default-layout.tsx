import React from 'react';

type DefaultLayoutProps = {
  children: React.ReactNode;
};

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {children}
    </div>
  );
};

export { DefaultLayout };
