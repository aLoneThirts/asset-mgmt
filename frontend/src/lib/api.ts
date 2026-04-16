import axios from "axios";
import toast from "react-hot-toast";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
});

// Her istekte güncel Firebase ID token ekle
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Hata yönetimi
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status  = error.response?.status;
    const detail  = error.response?.data?.detail;

    if (status === 401) {
      window.location.href = "/login";
    } else if (status === 403) {
      toast.error(detail ?? "Yetkiniz yok.");
    } else if (status === 429) {
      toast.error("Çok fazla istek. Lütfen bekleyin.");
    } else if (status >= 500) {
      toast.error("Sunucu hatası. Lütfen tekrar deneyin.");
    }

    return Promise.reject(error);
  }
);

export default api;
