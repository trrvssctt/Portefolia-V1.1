import React, { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, FileText, RefreshCw } from 'lucide-react';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

interface Props {
  /** URL de l'API qui reçoit le fichier (multipart, champ « file ») */
  uploadUrl: string;
  /** Champs envoyés avec le fichier (ex. { token }) */
  extraFields?: Record<string, string>;
  /** Une preuve est déjà enregistrée côté serveur */
  alreadyUploaded?: boolean;
  onUploaded: () => void;
  label?: string;
}

// Envoi de la capture d'écran (ou du PDF) du paiement Wave, avec aperçu
export default function PaymentProofUpload({ uploadUrl, extraFields = {}, alreadyUploaded = false, onUploaded, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>(alreadyUploaded ? 'done' : 'idle');
  const [error, setError] = useState('');

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { setError('Fichier trop lourd (8 Mo maximum).'); setState('error'); return; }
    if (!ACCEPT.split(',').includes(f.type)) { setError('Envoyez une image (JPG, PNG, WebP) ou un PDF.'); setState('error'); return; }
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    setState('uploading');
    setError('');
    try {
      const form = new FormData();
      Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));
      form.append('file', f);
      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Envoi impossible, réessayez.');
      setState('done');
      onUploaded();
    } catch (e) {
      setError((e as Error).message || 'Envoi impossible, réessayez.');
      setState('error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-700">{label || "Capture d'écran du paiement Wave"} <span className="text-red-500">*</span></p>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      {state === 'done' ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
          {preview ? <img src={preview} alt="Aperçu de la preuve" className="w-12 h-12 rounded-lg object-cover" />
            : file?.type === 'application/pdf' ? <FileText size={22} className="text-green-700" /> : <CheckCircle2 size={20} className="text-green-700" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Preuve envoyée</p>
            {file && <p className="text-[11px] text-green-700 truncate">{file.name}</p>}
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="shrink-0 h-8 px-2.5 rounded-lg border border-green-200 bg-white text-xs font-semibold text-green-800 hover:bg-green-100 flex items-center gap-1">
            <RefreshCw size={12} /> Remplacer
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={state === 'uploading'}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-[#1BC29A] bg-gray-50 px-4 py-5 flex flex-col items-center gap-1.5 text-gray-500 transition-colors disabled:opacity-70">
          {state === 'uploading' ? <Loader2 size={20} className="animate-spin text-[#1BC29A]" /> : <Upload size={20} />}
          <span className="text-sm font-medium">{state === 'uploading' ? 'Envoi en cours…' : 'Ajouter la capture du reçu Wave'}</span>
          <span className="text-[11px] text-gray-400">JPG, PNG, WebP ou PDF · 8 Mo max</span>
        </button>
      )}
      {state === 'error' && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
