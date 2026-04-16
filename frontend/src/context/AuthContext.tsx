/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User } from "firebase/auth";
import toast from "react-hot-toast";

import { auth } from "@/lib/firebase";
import { logSession } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await logSession("login").catch(() => undefined);
      toast.success("Hos geldiniz!");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const msg =
        code === "auth/invalid-credential" ? "E-posta veya sifre hatali." :
        code === "auth/user-not-found" ? "Kullanici bulunamadi." :
        code === "auth/wrong-password" ? "Sifre hatali." :
        "Giris basarisiz.";
      toast.error(msg);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await logSession("register").catch(() => undefined);
      toast.success("Hesap olusturuldu!");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const msg =
        code === "auth/email-already-in-use" ? "Bu e-posta zaten kayitli." :
        code === "auth/weak-password" ? "Sifre en az 6 karakter olmali." :
        "Kayit basarisiz.";
      toast.error(msg);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success("Cikis yapildi.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return ctx;
}
