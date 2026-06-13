import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { useToast } from '@/hooks/use-toast';
import {
  Palette, Type, Building2, Globe, Phone, MapPin, FileText,
  CheckCircle2, Save,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans',
  'Lato', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather',
  'Space Grotesk', 'DM Sans',
];

const BusinessSettings: React.FC = () => {
  const { account, refresh } = useBusiness();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    company_name: '',
    company_logo_url: '',
    website_url: '',
    description: '',
    address: '',
    phone: '',
    primary_color: '#1a1a2e',
    secondary_color: '#16213e',
    accent_color: '#0f3460',
    font_family: 'Inter',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!account) return;
    const acc = account as any;
    setForm({
      company_name: acc.company_name || '',
      company_logo_url: acc.company_logo_url || '',
      website_url: acc.website_url || '',
      description: acc.description || '',
      address: acc.address || '',
      phone: acc.phone || '',
      primary_color: acc.primary_color || '#1a1a2e',
      secondary_color: acc.secondary_color || '#16213e',
      accent_color: acc.accent_color || '#0f3460',
      font_family: acc.font_family || 'Inter',
    });
  }, [account]);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/business/account/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Paramètres sauvegardés', description: 'Votre espace Business a été mis à jour.' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await refresh();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const primaryColor = form.primary_color || '#1a1a2e';

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessNav onSignOut={signOut} />

      {/* Hero */}
      <div
        className="py-8 px-4 sm:px-6 lg:px-8"
        style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${form.secondary_color}10 100%)` }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {form.company_logo_url ? (
            <img
              src={form.company_logo_url}
              alt={form.company_name}
              className="h-14 w-14 object-contain rounded-xl border border-gray-200 bg-white p-1"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
              <Building2 className="h-7 w-7" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{form.company_name || 'Personnalisation'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configurez l'identité de votre espace entreprise</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Informations entreprise ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-gray-500" />
                Informations entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder="Acme Corp"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="website_url" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-gray-400" /> Site web
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={form.website_url}
                    onChange={e => set('website_url', e.target.value)}
                    placeholder="https://monentreprise.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" /> Téléphone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" /> Adresse
                  </Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Dakar, Sénégal"
                    className="mt-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="description" className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-gray-400" /> Description
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Décrivez votre entreprise, votre secteur d'activité..."
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Logo ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logo de l'entreprise</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                label="Logo"
                value={form.company_logo_url}
                onChange={url => set('company_logo_url', url)}
                placeholder="https://monentreprise.com/logo.png"
              />
              <p className="text-xs text-gray-400 mt-2">
                Format recommandé : PNG transparent ou SVG. Taille optimale : 200×200 px.
              </p>
            </CardContent>
          </Card>

          {/* ── Couleurs ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-gray-500" />
                Palette de couleurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'primary_color', label: 'Couleur principale', hint: 'Boutons, liens actifs' },
                  { key: 'secondary_color', label: 'Couleur secondaire', hint: 'Dégradés, fonds' },
                  { key: 'accent_color', label: "Couleur d'accent", hint: 'Badges, highlights' },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <p className="text-xs text-gray-400 mb-1.5">{hint}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id={key}
                        value={(form as any)[key]}
                        onChange={e => set(key, e.target.value)}
                        className="h-10 w-12 rounded-lg cursor-pointer border border-gray-200 p-0.5 shrink-0"
                      />
                      <Input
                        value={(form as any)[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder="#000000"
                        className="font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Aperçu */}
              <div
                className="mt-5 p-4 rounded-xl border"
                style={{ background: `linear-gradient(135deg, ${form.primary_color}15, ${form.secondary_color}15)` }}
              >
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Aperçu du thème</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    Bouton principal
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: form.secondary_color }}
                  >
                    Secondaire
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: form.accent_color }}
                  >
                    Badge accent
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {[form.primary_color, form.secondary_color, form.accent_color].map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Typographie ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-gray-500" />
                Typographie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="font_family">Police de caractères</Label>
              <Select value={form.font_family} onValueChange={v => set('font_family', v)}>
                <SelectTrigger id="font_family" className="mt-1">
                  <SelectValue placeholder="Choisir une police" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                style={{ fontFamily: form.font_family }}
              >
                <p className="text-base font-semibold text-gray-900">Votre espace Business</p>
                <p className="text-sm text-gray-500 mt-1">
                  Prévisualisation de la police <strong>{form.font_family}</strong> sur votre interface.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between pt-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Modifications sauvegardées
              </div>
            )}
            <div className={saved ? '' : 'ml-auto'}>
              <Button
                type="submit"
                disabled={saving}
                className="text-white px-8 gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default BusinessSettings;
