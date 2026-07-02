import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/api";
import { clearStoredSession, getStoredSession, getStoredToken, setStoredSession } from "@/lib/auth-session";
import { AuthSession, AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const localDemoUsers: Array<AuthUser & { password: string }> = [
  { id: "owner-local", name: "Owner", email: "owner@demo.local", role: "owner", roleLabel: "Owner", password: "owner123" },
  { id: "manager-local", name: "Manager", email: "manager@demo.local", role: "manager", roleLabel: "Manager", password: "manager123" },
  { id: "salesperson-local", name: "Salesperson", email: "salesperson@demo.local", role: "salesperson", roleLabel: "Salesperson", password: "sales123" },
];

const createLocalToken = (user: AuthUser) =>
  `local.${btoa(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: user.roleLabel,
      iat: Date.now(),
    })
  )}`;

const isLocalToken = (token: string | null) => Boolean(token?.startsWith("local."));

const getLocalUserFromToken = (token: string | null): AuthUser | null => {
  if (!isLocalToken(token)) return null;

  try {
    const payload = JSON.parse(atob(token!.slice("local.".length)));
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      roleLabel: payload.roleLabel,
    };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isLoading, setIsLoading] = useState(Boolean(getStoredSession()?.token));

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const token = getStoredToken();
      if (!token) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      return originalFetch(input, {
        ...init,
        headers,
      });
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = getStoredToken();
      if (!token) {
        clearStoredSession();
        if (active) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const data = await response.json();
        const nextSession = {
          token,
          user: data.user as AuthUser,
        };
        setStoredSession(nextSession);
        if (active) {
          setSession(nextSession);
        }
      } catch (error) {
        clearStoredSession();
        if (active) {
          setSession(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void validateSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const isLocalEnv =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json();
      const nextSession: AuthSession = data;
      setStoredSession(nextSession);
      setSession(nextSession);
      return nextSession.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearStoredSession();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user || null,
      token: session?.token || null,
      isLoading,
      login,
      logout,
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
