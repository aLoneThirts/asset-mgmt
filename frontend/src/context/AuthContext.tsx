import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth state'i yalnızca BURADA, tek bir yerde dinliyoruz.
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Hoş geldiniz!");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const msg =
        code === "auth/invalid-credential" ? "Email veya şifre hatalı." :
        code === "auth/user-not-found"     ? "Kullanıcı bulunamadı."   :
        code === "auth/wrong-password"     ? "Şifre hatalı."           :
        "Giriş başarısız.";
      toast.error(msg);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      toast.success("Hesap oluşturuldu!");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const msg =
        code === "auth/email-already-in-use" ? "Bu email zaten kayıtlı." :
        code === "auth/weak-password"        ? "Şifre en az 6 karakter olmalı." :
        "Kayıt başarısız.";
      toast.error(msg);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success("Çıkış yapıldı.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
