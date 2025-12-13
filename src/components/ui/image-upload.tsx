
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // If a Cloudinary upload URL is configured, upload the file and use the returned secure_url.
      const cloudinaryUrl = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL as string | undefined;
      if (cloudinaryUrl) {
        const formData = new FormData();
        formData.append('file', file);
        // Allow passing an unsigned upload preset via env var
        const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
        if (preset) formData.append('upload_preset', preset);
        fetch(cloudinaryUrl, { method: 'POST', body: formData })
          .then(async (r) => {
            const json = await r.json();
            if (json.secure_url) onChange(json.secure_url);
            else if (json.url) onChange(json.url);
            else {
              // fallback to data URL
              const reader = new FileReader();
              reader.onload = (e) => onChange(e.target?.result as string);
              reader.readAsDataURL(file);
            }
          })
          .catch(() => {
            // fallback to data URL on error
            const reader = new FileReader();
            reader.onload = (e) => onChange(e.target?.result as string);
            reader.readAsDataURL(file);
          });
      } else {
        // If no client-side Cloudinary URL is configured, try server-side upload endpoint
        const apiBase = import.meta.env.VITE_API_BASE || '';
        if (apiBase) {
          const token = localStorage.getItem('token');
          const fd = new FormData();
          fd.append('file', file);
          try {
            // use public upload endpoint for regular users
            const res = await fetch(`${apiBase}/api/uploads/cloudinary`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: fd,
            });
            if (res.ok) {
              const j = await res.json();
              if (j.url) return onChange(j.url);
              if (j.secure_url) return onChange(j.secure_url);
              if (j.raw && j.raw.secure_url) return onChange(j.raw.secure_url);
            }
          } catch (err) {
            // ignore and fallback to data URL
            console.warn('Server upload failed, falling back to data URL', err);
          }

        }

        // fallback to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          onChange(result);
        };
        reader.readAsDataURL(file);
      }
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
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept={accept || 'image/*'}
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Upload size={16} />
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
