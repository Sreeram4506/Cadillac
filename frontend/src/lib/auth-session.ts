import { AuthSession, AuthUser } from "@/types";

const SESSION_TOKEN_KEY = "dealershipAuthToken";
const SESSION_USER_KEY = "dealershipAuthUser";

let memoryToken: string | null = null;
let memoryUser: AuthUser | null = null;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const getStoredToken = () => {
  if (memoryToken) return memoryToken;
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  if (memoryUser) return memoryUser;
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const getStoredSession = (): AuthSession | null => {
  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || !user) return null;
  return { token, user };
};

export const setStoredSession = (session: AuthSession) => {
  memoryToken = session.token;
  memoryUser = session.user;

  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_TOKEN_KEY, session.token);
    window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session.user));
  }
};

export const clearStoredSession = () => {
  memoryToken = null;
  memoryUser = null;

  if (canUseStorage()) {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    window.localStorage.removeItem(SESSION_USER_KEY);
  }
};
