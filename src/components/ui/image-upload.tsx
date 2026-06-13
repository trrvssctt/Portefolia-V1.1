import React, { useState } from 'react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      
      // If a Cloudinary upload URL is configured, upload the file and use the returned secure_url.
      const cloudinaryUrl = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL as string | undefined;
      if (cloudinaryUrl) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          // Allow passing an unsigned upload preset via env var
          const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
          if (preset) formData.append('upload_preset', preset);
          const r = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
          let json: any = null;
          try { json = await r.json(); } catch (e) { json = null; }
          if (r.ok && (json && (json.secure_url || json.url))) {
            onChange(json.secure_url || json.url);
            setUploadSuccess(true);
            setIsUploading(false);
            setTimeout(() => setUploadSuccess(false), 2000);
            return;
          }
          // record error for debugging
          const msg = json && (json.error || json.message) ? (json.error || json.message) : `Upload failed (status ${r.status})`;
          console.warn('Client-side cloudinary upload response:', r.status, msg, json);
          setUploadError(String(msg));
        } catch (err: any) {
          console.warn('Client-side cloudinary upload failed, falling back to file->dataURL', err);
          setUploadError(String(err && (err.message || err)));
        }
      }

      // If no client-side Cloudinary URL is configured, try server-side upload endpoint
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const token = localStorage.getItem('token');
      
      if (apiBase) {
        // First try: multipart/form-data upload
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch(`${apiBase}/api/uploads/cloudinary`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          });
          let j: any = null;
          try { j = await res.json(); } catch (e) { j = null; }
          if (res.ok && j && (j.url || j.secure_url || (j.raw && j.raw.secure_url))) {
            const finalUrl = j.url || j.secure_url || (j.raw && j.raw.secure_url);
            onChange(finalUrl);
            setUploadSuccess(true);
            setIsUploading(false);
            setTimeout(() => setUploadSuccess(false), 2000);
            return;
          }
          const errMsg = j && (j.error || j.message) ? (j.error || j.message) : `Server upload failed (status ${res.status})`;
          console.warn('Server multipart upload response:', res.status, errMsg, j);
          setUploadError(String(errMsg));
        } catch (err: any) {
          console.warn('Server multipart upload failed, will fallback to data URL POST', err);
          setUploadError(String(err && (err.message || err)));
        }

        // Second try: data URL conversion and JSON POST
        const reader = new FileReader();
        reader.onload = async (e) => {
          const result = e.target?.result as string;
          if (apiBase) {
            try {
              const r = await fetch(`${apiBase}/api/uploads/cloudinary`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ dataUrl: result }),
              });
              let j: any = null;
              try { j = await r.json(); } catch (e) { j = null; }
              if (r.ok && j && (j.url || j.secure_url || (j.raw && j.raw.secure_url))) {
                const finalUrl = j.url || j.secure_url || (j.raw && j.raw.secure_url);
                onChange(finalUrl);
                setUploadSuccess(true);
                setIsUploading(false);
                setTimeout(() => setUploadSuccess(false), 2000);
                return;
              }
              const errMsg = j && (j.error || j.message) ? (j.error || j.message) : `Server JSON upload failed (status ${r.status})`;
              console.warn('Server JSON upload response:', r.status, errMsg, j);
              setUploadError(String(errMsg));
            } catch (err: any) {
              console.warn('Server JSON upload failed, falling back to data URI', err);
              setUploadError(String(err && (err.message || err)));
            }
          }

          // Fallback: use data URL directly
          onChange(result);
          setUploadSuccess(true);
          setIsUploading(false);
          setTimeout(() => setUploadSuccess(false), 2000);
        };
        reader.readAsDataURL(file);
      } else {
        // No API base, just use data URL directly
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          onChange(result);
          setUploadSuccess(true);
          setIsUploading(false);
          setTimeout(() => setUploadSuccess(false), 2000);
        };
        reader.readAsDataURL(file);
      }
    } else {
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
            {uploadSuccess && <div className="text-sm text-green-600">Upload terminé</div>}
            {uploadError && <div className="text-sm text-red-600">Erreur: {uploadError}</div>}
          </div>
        </TabsContent>
      </Tabs>
      
      {value && (
        <div className="mt-4">
          <Label>Aperçu</Label>
          <div className="mt-2 w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {/* If the value is a PDF or data:application/pdf show a download link */}
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