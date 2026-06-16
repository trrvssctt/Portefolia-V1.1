import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isTokenExpired } from '@/utils/authUtils';
import { UserPaiementHistorique } from '@/components/admin/UserPaiementHistorique';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function PaiementsPage() {
  const { toast } = useToast();
  const [completed, setCompleted] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      window.location.href = '/auth';
    }
  }, [toast]);

  const loadAll = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [cRes, pRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/paiements?status=paid&page=1&limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/paiements?status=pending&page=1&limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/abonnements/upcoming?days=90`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (cRes.ok) { const j = await cRes.json(); setCompleted(j.paiements || []); }
      if (pRes.ok) { const j = await pRes.json(); setPending(j.paiements || []); }
      if (uRes.ok) { const j = await uRes.json(); setUpcoming(j.abonnements || []); }
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de charger les paiements', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Gestion des paiements</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Paiements terminés</CardTitle></CardHeader>
          <CardContent>
            {completed.length === 0 ? <p>Aucun paiement terminé</p> : (
              completed.map(p => (
                <div key={p.id} className="mb-4 border-b pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{p.utilisateur_prenom} {p.utilisateur_nom}</div>
                      <div className="text-sm text-gray-600">Montant: {p.montant} — Réf: {p.reference_transaction}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.image_paiement && <a href={p.image_paiement} target="_blank" rel="noreferrer"><Button size="sm">Preuve</Button></a>}
                      <Button size="sm" onClick={() => setSelectedUser(p.utilisateur_id)}>Voir historique</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Paiements en attente</CardTitle></CardHeader>
          <CardContent>
            {pending.length === 0 ? <p>Aucun paiement en attente</p> : (
              pending.map(p => (
                <div key={p.id} className="mb-4 border-b pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{p.utilisateur_prenom} {p.utilisateur_nom}</div>
                      <div className="text-sm text-gray-600">Montant: {p.montant} — Réf: {p.reference_transaction}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.image_paiement && <a href={p.image_paiement} target="_blank" rel="noreferrer"><Button size="sm">Preuve</Button></a>}
                      <Button size="sm" onClick={() => setSelectedUser(p.utilisateur_id)}>Voir historique</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Abonnements à venir</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? <p>Aucun abonnement à venir</p> : (
              upcoming.map(a => (
                <div key={a.id} className="mb-4 border-b pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{a.prenom} {a.nom}</div>
                      <div className="text-sm text-gray-600">Fin: {a.end_date ? new Date(a.end_date).toLocaleDateString() : '—'} — Plan: {a.plan_name}</div>
                    </div>
                    <div>
                      <Button size="sm" onClick={() => setSelectedUser(a.utilisateur_id)}>Voir historique</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Historique paiement utilisateur</h2>
          <UserPaiementHistorique userId={selectedUser} onClose={() => setSelectedUser(null)} />
        </div>
      )}
    </div>
  );
}
