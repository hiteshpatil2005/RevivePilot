import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

/**
 * App — root component.
 *
 * Provider nesting order:
 *   BrowserRouter > ThemeProvider > AuthProvider > AppRoutes
 *
 * ThemeProvider wraps everything so layout components can use theme.
 * AuthProvider wraps routes so all pages can access auth state.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
