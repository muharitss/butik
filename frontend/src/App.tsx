import { RouterProvider } from 'react-router-dom';
import { router } from './app/router.tsx';
import { AuthProvider } from './app/AuthContext.tsx';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
