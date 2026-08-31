import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import AppRoutes from './routes/AppRoutes';

/**
 * App — root component.
 *
 * Provider nesting order:
 *   BrowserRouter > ThemeProvider > AuthProvider > RealtimeProvider > AppRoutes
 *
 * ThemeProvider: wraps everything so layout components can use theme.
 * AuthProvider: wraps routes so all pages can access auth state.
 * RealtimeProvider: single WebSocket connection for the entire app.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
            <AppRoutes />
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
