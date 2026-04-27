"use client";

import axios from "axios";
import { clearToken, getToken } from "@/lib/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.paramsdental.com";

export const api = axios.create({
  baseURL: apiUrl.replace(/\/$/, "")
});

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  return fallback;
};

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);
