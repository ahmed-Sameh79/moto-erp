import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch } from "./api";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "storekeeper" | "technician" | "sales";
  email: string;
}

type User = AuthUser;

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("moto_erp_token");
    const storedUser = localStorage.getItem("moto_erp_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("moto_erp_token", newToken);
    localStorage.setItem("moto_erp_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("moto_erp_token");
    localStorage.removeItem("moto_erp_user");
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role === "admin",
    role: user?.role || null,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
