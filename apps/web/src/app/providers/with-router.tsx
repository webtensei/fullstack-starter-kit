import { createElement } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { createGuestLayout } from '@app/composition/layout/guest';
import { HomePage } from '@pages/home';

// https://github.com/remix-run/react-router/discussions/10166
function BubbleError() {
  const error = useRouteError();
  if (error) throw error;
  return null;
}

const router = createBrowserRouter([
  {
    errorElement: createElement(BubbleError),
    children: [
      createGuestLayout(
        {
          path: '/',
          element: <HomePage />,
        },
      ),
    ],
  },
]);

export function BrowserRouter() {
  return <RouterProvider router={router} />;
}
