const API_BASE = (import.meta.env.VITE_API_URL as string) || "https://backend-v-card.onrender.com/api";

async function fetchJson(path: string, options: RequestInit = {}) {
  const url = API_BASE.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);
  const res = await fetch(url, options);
  const text = await res.text();
  // Try parse JSON, otherwise throw helpful error
  try {
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err: any = new Error(`API error ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  } catch (err) {
    // If response is not JSON, include the raw text for debugging
    if (res.ok) {
      const parseErr: any = new Error('Invalid JSON response from API');
      parseErr.body = text;
      throw parseErr;
    }
    const parseErr2: any = new Error(`API error ${res.status} - invalid JSON`);
    parseErr2.status = res.status;
    parseErr2.body = text;
    throw parseErr2;
  }
}

export { API_BASE, fetchJson };
