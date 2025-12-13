// src/pages/admin/AdminNotifications.tsx

import React, { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminFooter from '@/components/admin/AdminFooter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  Send,
  Trash2,
  Search,
  AlertCircle,
  Megaphone,
  Info,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

type Notification = {
  id: number;
  titre: string;
  message: string;
  type: 'info' | 'promo' | 'urgent';
  envoyee: boolean;
  destinataires?: number;
  created_at: string;
};

const TYPE_CONFIG = {
  info: { label: 'Info', badge: 'bg-blue-100 text-blue-800', icon: <Info className="w-4 h-4" /> },
  promo: { label: 'Promotion', badge: 'bg-purple-100 text-purple-800', icon: <Megaphone className="w-4 h-4" /> },
  urgent: { label: 'Urgent', badge: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
};

export default function AdminNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Formulaire
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'promo' | 'urgent'>('info');

  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non authentifié');

      const res = await fetch(`${API_BASE}/api/admin/notifications?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setItems(json.notifications || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSend = async () => {
    if (!titre.trim() || !message.trim()) {
      toast({ title: 'Champs requis', description: 'Titre et message obligatoires', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titre,
          message,
          type,
          send: true, // envoi immédiat
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec');
      }

      toast({
        title: 'Envoyée !',
        description: `Notification "${titre}" envoyée à tous les utilisateurs`,
      });

      setTitre('');
      setMessage('');
      setType('info');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette notification ?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Supprimée' });
      load();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  const filtered = items.filter(item =>
    item.titre.toLowerCase().includes(search.toLowerCase()) ||
    item.message.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleString('fr-FR');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNav />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {items.length} notification{items.length > 1 ? 's' : ''} envoyée{items.length > 1 ? 's' : ''}
            </p>
          </div>

          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#28A745] hover:bg-[#218838]"
          >
            <Send className="w-4 h-4 mr-2" />
            Nouvelle notification
          </Button>
        </div>

        {/* Formulaire création */}
        {showForm && (
          <Card className="mb-8 border-2 border-dashed border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Envoyer une notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Titre</Label>
                <Input
                  placeholder="Ex: Nouvelle fonctionnalité disponible !"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                />
              </div>

              <div>
                <Label>Type de notification</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (bleu)</SelectItem>
                    <SelectItem value="promo">Promotion (violet)</SelectItem>
                    <SelectItem value="urgent">Urgent (rouge)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Votre message ici..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="bg-[#28A745] hover:bg-[#218838]"
                >
                  {sending ? 'Envoi en cours...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer à tous les utilisateurs
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une notification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="grid gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                Aucune notification trouvée
              </CardContent>
            </Card>
          ) : (
            filtered.map((notif) => {
              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;

              return (
                <Card key={notif.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {config.icon}
                        <div>
                          <CardTitle className="text-lg">{notif.titre}</CardTitle>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {formatDate(notif.created_at)}
                            {notif.envoyee && (
                              <>
                                {' • '}
                                <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                                <span className="text-green-600">Envoyée</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={config.badge}>
                          {config.label}
                        </Badge>
                        {notif.destinataires && (
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {notif.destinataires}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(notif.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{notif.message}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AdminFooter />
    </div>
  );
}