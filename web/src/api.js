import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE || "";

export const http = axios.create({
  baseURL: apiBase,
  timeout: 15000,
});

export async function getJson(url) {
  const res = await http.get(url);
  if (!res.data?.ok) throw new Error(res.data?.message || "Request failed");
  return res.data.data;
}

export async function postJson(url, body) {
  const res = await http.post(url, body);
  if (!res.data?.ok) throw new Error(res.data?.message || "Request failed");
  return res.data.data;
}

export async function putJson(url, body) {
  const res = await http.put(url, body);
  if (!res.data?.ok) throw new Error(res.data?.message || "Request failed");
  return res.data.data;
}

export async function delJson(url) {
  const res = await http.delete(url);
  if (!res.data?.ok) throw new Error(res.data?.message || "Request failed");
  return res.data.data;
}

