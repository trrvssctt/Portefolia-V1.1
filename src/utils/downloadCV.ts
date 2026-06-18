const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

/**
 * Télécharge un CV via le proxy backend pour garantir le bon nom + extension
 * sur tous les appareils (PC et mobile).
 */
export function downloadCV(cvUrl: string, userName: string) {
  if (!cvUrl) return;
  const name = `CV-${userName.replace(/[^a-zA-Z0-9_\- ]/g, '_')}`;
  const proxy = `${API_BASE}/api/uploads/download?url=${encodeURIComponent(cvUrl)}&name=${encodeURIComponent(name)}`;
  const a = document.createElement('a');
  a.href = proxy;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
