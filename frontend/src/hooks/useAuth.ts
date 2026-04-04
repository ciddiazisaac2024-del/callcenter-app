import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;       // true mientras verifica la sesión al inicio
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const useAuthProvider = () => {
  const [user, setUser]           = useState<User | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // empieza en true: sesión no verificada aún

  // Al montar, si hay token en localStorage lo verifica contra el backend.
  // Esto evita que un usuario manipule el objeto `user` en localStorage
  // para cambiar su rol y ver UI de supervisor/admin sin serlo.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Ponemos el token en estado para que el interceptor de axios lo envíe
    setToken(storedToken);

    authService.me()
      .then(({ data }) => {
        // La fuente de verdad del rol y datos del usuario es el backend
        const verifiedUser: User = data.data;
        setUser(verifiedUser);
        // Refrescar localStorage con los datos actuales del servidor
        localStorage.setItem('user', JSON.stringify(verifiedUser));
      })
      .catch(() => {
        // Token inválido o expirado: limpiar sesión
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // solo al montar

  const login = (userData: User, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!token && !!user, // ambos deben existir: token + usuario verificado
  };
};
