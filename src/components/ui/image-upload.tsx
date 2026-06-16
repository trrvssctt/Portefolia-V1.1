import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, FileText } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string; // e.g. 'image/*' or 'application/pdf'
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value = '',
  onChange,
  placeholder = "https://exemple.com/image.jpg",
  accept = 'image/*',
}) => {
  const [urlInput, setUrlInput] = useState(value);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');

  useEffect(() => { setUrlInput(value); }, [value]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { setIsUploading(false); return; }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const token = localStorage.getItem('token');
    // Use VITE_API_BASE if set, otherwise rely on the Vite /api proxy (relative path)
    const apiBase = import.meta.env.VITE_API_BASE || '';
    const endpoint = `${apiBase}/api/uploads/cloudinary`;

    // Try multipart/form-data upload first
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      let j: any = null;
      try { j = await res.json(); } catch { j = null; }
      if (res.ok && j && (j.url || j.secure_url || j.raw?.secure_url)) {
        onChange(j.url || j.secure_url || j.raw.secure_url);
        setUploadSuccess(true);
        setIsUploading(false);
        setTimeout(() => setUploadSuccess(false), 2000);
        return;
      }
      const errMsg = j?.error || j?.message || `Erreur serveur (${res.status})`;
      console.warn('Server multipart upload failed:', res.status, errMsg, j);
      // Try JSON data URL as fallback
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const r2 = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ dataUrl }),
          });
          let j2: any = null;
          try { j2 = await r2.json(); } catch { j2 = null; }
          if (r2.ok && j2 && (j2.url || j2.secure_url || j2.raw?.secure_url)) {
            onChange(j2.url || j2.secure_url || j2.raw.secure_url);
            setUploadSuccess(true);
            setIsUploading(false);
            setTimeout(() => setUploadSuccess(false), 2000);
            return;
          }
          const e2 = j2?.error || j2?.message || `Erreur serveur (${r2.status})`;
          console.warn('Server JSON upload failed:', r2.status, e2, j2);
          setUploadError(`Upload échoué : ${e2}`);
        } catch (err: any) {
          console.warn('Server JSON upload error:', err);
          setUploadError(`Upload échoué : ${err?.message || err}`);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn('Server upload error:', err);
      setUploadError(`Upload échoué : ${err?.message || err}`);
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    onChange(urlInput);
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'url' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <Button onClick={handleUrlSubmit} size="sm">
              <Link size={16} className="mr-1" />
              Appliquer
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept={accept || 'image/*'}
                onChange={handleFileUpload}
                className="flex-1"
                disabled={isUploading}
              />
              <Upload size={16} />
              {isUploading && (
                <div className="ml-2 flex items-center text-sm text-gray-600">
                  <svg className="animate-spin h-4 w-4 mr-2 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Upload en cours...
                </div>
              )}
            </div>
            {uploadSuccess && <div className="text-sm text-green-600">Upload terminé ✓</div>}
            {uploadError && <div className="text-sm text-red-600">Erreur: {uploadError}</div>}
          </div>
        </TabsContent>
      </Tabs>

      {value && (
        <div className="mt-4">
          <Label>Aperçu</Label>
          <div className="mt-2 w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {String(value).startsWith('data:application/pdf') || String(value).toLowerCase().endsWith('.pdf') ? (
              <div className="flex items-center gap-2">
                <FileText />
                <a href={value} target="_blank" rel="noopener noreferrer" className="underline text-sm">Ouvrir le document</a>
              </div>
            ) : (
              <img
                src={value}
                alt="Aperçu"
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
