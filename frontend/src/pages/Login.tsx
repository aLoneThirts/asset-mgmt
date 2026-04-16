import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, navigate, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.9fr]">
        <section className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(135deg,#0f172a,#0b1220_40%,#111827)] p-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xl font-bold text-white">AssetTrack</p>
            <p className="mt-1 text-sm text-emerald-300">Kurumsal Demirbas ve Envanter Yonetimi</p>
          </div>

          <div className="max-w-xl space-y-8">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Medicana Scale</p>
              <h1 className="text-5xl font-bold leading-tight text-white">
                Demirbas, ariza ve stok akisini tek panelden yonetin.
              </h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Firebase Auth ile giris ve kayit",
                "Pandas tabanli Excel import akisi",
                "Kritik stok ve acik ariza bildirimleri",
                "Tum islemler icin merkezi log takibi",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">Vercel frontend · FastAPI backend · Firebase Firestore</p>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-xl shadow-slate-200/70">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                {mode === "login" ? "Panele giris yapin" : "Yeni admin hesabi olusturun"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "login"
                  ? "Yetkili kullanici bilgileri ile devam edin."
                  : "Sisteme erisecek yeni yoneticiyi kaydedin."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Ad Soyad
                  </label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Ornek Kullanici"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="ornek@sirket.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    placeholder="En az 6 karakter"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-20 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                  >
                    {showPassword ? "Gizle" : "Goster"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {mode === "login" ? "Giris Yap" : "Hesap Olustur"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? "Hesabiniz yok mu?" : "Zaten hesabiniz var mi?"}{" "}
              <button
                onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
                className="font-semibold text-brand-600 transition hover:underline"
              >
                {mode === "login" ? "Kayit olun" : "Giris yapin"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
