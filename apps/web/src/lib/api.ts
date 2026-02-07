import { hc } from "hono/client";

const API_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:3001";

export const api = hc(API_URL);

export type ApiClient = typeof api;
