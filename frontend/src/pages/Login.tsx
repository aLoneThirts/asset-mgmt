import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]       = useState<"login" | "register">("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [name, setName]       = useState("");
  const [submitting, setSub]  = useState(false);
  const [showPass, setShow]   = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSub(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
    } catch {
      // hata toast ile gösterildi
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol dekoratif panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12">
        <div>
          <p className="text-white font-bold text-xl">AssetTrack</p>
          <p className="text-blue-400 text-sm">Enterprise Edition</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Kurumsal demirbaşlarınızı<br />
            <span className="text-blue-400">akıllıca yönetin</span>
          </h2>
          <div className="space-y-3">
            {[
              "Anlık demirbaş takibi",
              "Excel ile toplu veri aktarımı",
              "Arıza ve stok yönetimi",
              "Detaylı aktivite logları",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-blue-400 text-xs">✦</span>
                <span className="text-slate-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs">© 2025 AssetTrack</p>
      </div>

      {/* Sağ form paneli */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "Tekrar hoş geldiniz" : "Hesap oluşturun"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login" ? "Devam etmek için giriş yapın" : "Yeni hesap oluşturun"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ad Soyad</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  required placeholder="Ahmet Yılmaz"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="ornek@sirket.com"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Şifre</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPass(e.target.value)}
                  required minLength={6} placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-16"
                />
                <button type="button" onClick={() => setShow(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showPass ? "Gizle" : "Göster"}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-brand-600 font-semibold hover:underline">
              {mode === "login" ? "Kayıt olun" : "Giriş yapın"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
