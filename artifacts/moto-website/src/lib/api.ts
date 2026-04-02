import { useQuery, useMutation } from "@tanstack/react-query";

const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = "An error occurred";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch (e) {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: () => fetcher("/api/site/settings"),
  });
}

export function useParts() {
  return useQuery({
    queryKey: ["parts"],
    queryFn: () => fetcher("/api/parts"),
  });
}

export function useMotorcycles() {
  return useQuery({
    queryKey: ["motorcycles"],
    queryFn: () => fetcher("/api/motorcycles"),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetcher("/api/categories"),
  });
}

export function useMotorcycleBrands() {
  return useQuery({
    queryKey: ["motorcycle-brands"],
    queryFn: () => fetcher("/api/motorcycle-brands"),
  });
}

export function useContact() {
  return useMutation({
    mutationFn: (data: any) =>
      fetcher("/api/site/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: any) =>
      fetcher("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `RM ${num.toFixed(2)}`;
}

export function getImageUrl(url: string | null | undefined) {
  if (!url) return "/images/part-placeholder.png";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}
