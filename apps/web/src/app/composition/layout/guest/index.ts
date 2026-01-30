import { createElement } from 'react';
import GuestLayout from './guest-layout.ui';

export function createGuestLayout(child: { path: string; element: React.ReactElement }) {
  return {
    element: createElement(GuestLayout),
    children: [child],
  };
}
