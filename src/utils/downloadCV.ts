const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

/**
 * Télécharge un CV via le proxy backend pour garantir le bon nom + extension
 * sur tous les appareils (PC, Android, iOS). Le backend détecte le vrai type
 * du fichier (PDF, DOCX…) et renvoie un Content-Disposition "attachment".
 */
export function downloadCV(cvUrl: string, userName: string) {
  if (!cvUrl) return;
  const cleanName = (userName || 'Profil')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'Profil';
  const name = `CV-${cleanName}`;
  const proxy = `${API_BASE}/api/uploads/download?url=${encodeURIComponent(cvUrl)}&name=${encodeURIComponent(name)}`;
  // Lien simple : l'en-tête "attachment" du proxy déclenche le téléchargement
  // sans quitter la page (l'attribut download est ignoré en cross-origin).
  const a = document.createElement('a');
  a.href = proxy;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
