// src/pages/NFCCardTypes.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Check,
  Sparkles,
  Package,
  Truck,
  Palette,
  Zap,
  Copy,
  ArrowRight,
  ArrowLeft,
  Star,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

type ProductType = 'simple-nfc' | 'custom-nfc';

export default function NFCCardTypes() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    profession: '',
    site: '',
    quantity: 1,
    adresse_livraison: '',
    logo_url: '',
  });

  const openForm = (plan: any) => {
    setSelectedPlan(plan);
    setShowForm(true);
    setMessage(null);
    setOrderNumber(null);
  };

  const formatPrice = (centsOrMajor: any) => {
    const n = Number(centsOrMajor ?? 0);
    // Format numbers as XOF currency without decimals (e.g. "1 000 XOF")
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
      }).format(n);
    } catch (e) {
      // Fallback to a simple thousands separator + XOF
      return n.toLocaleString('fr-FR') + ' XOF';
    }
  };

  // Chargement des cartes NFC depuis le backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPlans(true);
        const res = await fetch(`${API_BASE}/api/nfc-cards`);
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) {
          throw new Error(text || 'Réponse invalide');
        }
        if (!res.ok) throw new Error(json?.error || 'Impossible de charger les cartes');
        if (mounted) setPlans(json.cards || []);
      } catch (e: any) {
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    })();
    return () => { mounted = false };
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(s => ({
      ...s,
      [name]: name === 'quantity' ? Math.max(1, Number(value) || 1) : value,
    }));
  };

  // Calcul du prix total
  const unitPrice = selectedPlan
    ? Number(selectedPlan.price_cents ?? selectedPlan.price ?? 0)
    : 0;
  const totalAmount = unitPrice * form.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    // Ouvre la confirmation
    setConfirmOpen(true);
  };

  const confirmAndSend = async () => {
    setConfirmOpen(false);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/commandes/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          quantity: form.quantity,
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone,
          profession: form.profession,
          site: form.site,
          adresse_livraison: form.adresse_livraison || null,
          logo_url: form.logo_url || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la commande');

      const numero = json.order.numero_commande;
      setOrderNumber(numero);
      setMessage(`Commande ${numero} créée avec succès ! Nous vous contactons sous 24h.`);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast({ title: 'Commande reçue !', description: `Référence : ${numero}` });

      setTimeout(() => {
        setShowForm(false);
        setForm({
          nom: '', prenom: '', email: '', telephone: '', profession: '',
          site: '', quantity: 1, adresse_livraison: '', logo_url: '',
        });
      }, 5000);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyOrderNumber = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      toast({ title: 'Copié !', description: 'Numéro copié' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Bouton retour */}
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        </div>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Cartes de Visite NFC <Sparkles className="inline-block w-12 h-12 ml-3 text-yellow-500" />
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
            Partagez vos coordonnées en un tap. Moderne, écologique, inoubliable.
          </p>
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-[#28A745] to-emerald-600 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl">
            <Truck className="w-10 h-10" />
            Paiement à la livraison • 100 % sécurisé
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        {/* Cartes produits */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
          {loadingPlans ? (
            <div className="col-span-full text-center py-20 text-xl">Chargement des cartes...</div>
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-600">Aucune carte disponible pour le moment.</div>
          ) : (
            plans.map((pl) => (
              <Card key={pl.id} className={`hover:shadow-2xl transition-all duration-300 hover:-translate-y-4 border-2 ${pl.allow_design_custom ? 'border-[#28A745] shadow-xl' : ''}`}>
                {pl.is_popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#28A745] to-emerald-600 text-white px-8 py-3 text-lg font-bold">
                      <Star className="w-6 h-6 mr-2" /> Populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8 pt-12">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${pl.allow_design_custom ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    {pl.allow_design_custom ? <Palette className="w-12 h-12 text-[#28A745]" /> : <Zap className="w-12 h-12 text-blue-600" />}
                  </div>
                  <CardTitle className="text-3xl">{pl.name}</CardTitle>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">{formatPrice(pl.price_cents ?? pl.price)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 text-center">{pl.description}</p>
                  <ul className="space-y-3">
                    {pl.allow_name && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Nom & Prénom</li>}
                    {pl.allow_email && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Email</li>}
                    {pl.allow_phone && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Téléphone</li>}
                    {pl.allow_job && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Profession</li>}
                    {pl.allow_website && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Site web</li>}
                    {pl.allow_logo && <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-600" />Logo</li>}
                    {pl.allow_design_custom && <li className="flex items-center gap-3 font-bold text-[#28A745]"><Check className="w-5 h-5" />Design 100% personnalisé</li>}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="w-full bg-green-50 border-2 border-green-200 rounded-xl p-5 text-center">
                    <PackageCheck className="w-12 h-12 text-[#28A745] mx-auto mb-2" />
                    <p className="font-bold text-green-800">Paiement à la livraison</p>
                  </div>
                  <Button
                    size="lg"
                    className={`w-full h-14 text-lg font-bold ${pl.allow_design_custom ? 'bg-[#28A745] hover:bg-[#218838]' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={() => openForm(pl)}
                  >
                    Commander cette carte
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {/* Formulaire */}
        {showForm && selectedPlan && (
          <Card className="max-w-4xl mx-auto border-2 border-dashed border-[#28A745] bg-white">
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                Finalisez votre commande
                <Badge className="ml-4 text-lg" variant="secondary">
                  {selectedPlan.name}
                </Badge>
              </CardTitle>
            </CardHeader>

            {/* Bannière paiement à la livraison */}
            <div className="mx-8 mb-8">
              <div className="bg-gradient-to-r from-[#28A745]/10 to-emerald-600/10 border-2 border-[#28A745]/40 rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-5 text-[#28A745] font-bold text-xl">
                  <CreditCard className="w-12 h-12" />
                  <div>
                    <p>Paiement à la livraison partout au Sénégal</p>
                    <p className="text-base font-normal text-gray-700 mt-2">
                      Espèces • Wave • Orange Money • Moov • Carte bancaire
                    </p>
                  </div>
                  <ShieldCheck className="w-12 h-12" />
                </div>
              </div>
            </div>

            {/* Résumé du montant */}
            <div className="mx-8 mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-6">
              <div className="flex justify-between items-center text-2xl font-bold text-gray-900">
                <span>Montant total à payer à la livraison :</span>
                <span className="text-4xl text-[#28A745]">
                  {formatPrice(totalAmount)}
                </span>
              </div>
              <p className="text-center text-gray-600 mt-2">
                {form.quantity} × {selectedPlan.name} à {formatPrice(unitPrice)} l’unité
              </p>
            </div>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div><Label>Nom *</Label><Input name="nom" value={form.nom} onChange={handleChange} required /></div>
                  <div><Label>Prénom *</Label><Input name="prenom" value={form.prenom} onChange={handleChange} required /></div>
                  <div><Label>Email *</Label><Input name="email" type="email" value={form.email} onChange={handleChange} required /></div>
                  <div><Label>Téléphone WhatsApp</Label><Input name="telephone" value={form.telephone} onChange={handleChange} /></div>
                  <div><Label>Profession</Label><Input name="profession" value={form.profession} onChange={handleChange} /></div>
                  <div><Label>Site web / Réseaux</Label><Input name="site" value={form.site} onChange={handleChange} placeholder="linkedin.com/in/..." /></div>

                  {selectedPlan.allow_design_custom && (
                    <div className="md:col-span-2">
                      <Label>Lien de votre logo (Google Drive, Imgur…)</Label>
                      <Input name="logo_url" value={form.logo_url} onChange={handleChange} placeholder="https://..." />
                      {form.logo_url && (
                        <img src={form.logo_url} alt="Aperçu logo" className="mt-4 h-32 rounded-xl border shadow-lg mx-auto"
                          onError={(e) => (e.currentTarget.style.display = 'none')} />
                      )}
                    </div>
                  )}

                  <div><Label>Quantité</Label><Input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} /></div>
                  <div><Label>Adresse de livraison (facultatif)</Label><Textarea name="adresse_livraison" value={form.adresse_livraison} onChange={handleChange} placeholder="Quartier, Ville..." /></div>
                </div>

                <div className="flex flex-col items-center gap-4 pt-8">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full max-w-lg text-xl h-16 bg-[#28A745] hover:bg-[#218838] font-bold"
                  >
                    {submitting ? 'Envoi en cours...' : 'Vérifier et confirmer la commande'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>

                {message && (
                  <div className={`text-center p-10 rounded-2xl border-2 ${orderNumber ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    {orderNumber ? (
                      <>
                        <PackageCheck className="w-20 h-20 text-[#28A745] mx-auto mb-4" />
                        <h3 className="text-3xl font-bold mb-4">Commande confirmée !</h3>
                        <p className="text-xl mb-6">{message}</p>
                        <div className="flex items-center justify-center gap-4">
                          <code className="text-3xl font-bold text-[#28A745] bg-white px-8 py-4 rounded-xl border-4 border-[#28A745]/30">
                            {orderNumber}
                          </code>
                          <Button size="lg" onClick={copyOrderNumber}><Copy className="w-6 h-6" /></Button>
                        </div>
                        <p className="mt-8 text-lg">Le livreur acceptera : <strong>espèces, Wave, Orange Money, Moov</strong></p>
                      </>
                    ) : (
                      <p className="text-xl text-red-700">{message}</p>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dialog de confirmation */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
                Confirmation de commande
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-lg space-y-4">
              <p>Vous êtes sur le point de commander :</p>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTitle className="text-xl font-bold text-gray-900">
                  {form.quantity} × {selectedPlan?.name}
                </AlertTitle>
                <AlertDescription className="text-2xl font-bold text-[#28A745] mt-3">
                  Total à payer à la livraison : {formatPrice(totalAmount)}
                </AlertDescription>
              </Alert>
              <p className="font-medium">Cette action est irréversible. Êtes-vous sûr ?</p>
            </DialogDescription>
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
              <Button className="bg-[#28A745] hover:bg-[#218838]" onClick={confirmAndSend} disabled={submitting}>
                Oui, confirmer la commande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="text-center mt-20 text-gray-700 text-xl">
          Livraison partout au Sénégal • <strong>Paiement à la livraison</strong>
        </div>
      </div>
    </div>
  );
}