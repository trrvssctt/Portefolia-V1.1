// src/pages/Checkout.tsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Copy, Download, CheckCircle2, Clock, AlertCircle, QrCode, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  // prefer a local QR image if present in public/
  const localQrPath = '/qr_code_de_paiement.jpeg';
  const [qrSrc, setQrSrc] = useState<string>('');

  // Check if local QR image exists in the public folder and prefer it
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(localQrPath, { method: 'HEAD' });
        if (mounted && res.ok) setQrSrc(localQrPath);
      } catch (e) {
        // ignore, keep empty
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchCheckout = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/checkout/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Lien invalide ou expiré');
        }
        const json = await res.json();
        setData(json);

        // Calculer le temps restant si expires_at existe
        if (json.expires_at) {
          const expires = new Date(json.expires_at).getTime();
          const now = Date.now();
          const diff = Math.max(0, Math.floor((expires - now) / 1000));
          setTimeLeft(diff);
        }
      } catch (err: any) {
        toast({
          title: 'Lien invalide',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCheckout();
  }, [token, toast]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || !data?.expires_at) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, data?.expires_at]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleConfirm = async () => {
    const authToken = localStorage.getItem('token');

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/api/checkout/${token}/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reference_transaction: `MANUAL-${Date.now()}`,
          payment_method: 'manual',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Échec de confirmation');

      // Confettis !!!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({
        title: 'Paiement reçu',
        description: 'Merci — votre paiement a été enregistré. Il sera pris en compte et votre accès sera activé sous peu. Vous recevrez un email quand vous pourrez vous connecter.',
      });

      setTimeout(() => {
        const tok = localStorage.getItem('token');
        if (tok) navigate('/dashboard');
        else navigate('/auth');
      }, 2000);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié !', description: 'Numéro copié dans le presse-papier' });
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    const amountLocal = Number(data?.paiement?.montant || (data?.plan?.price_cents || 0) / 100 || 0);
    const referenceLocal = `REF${token?.slice(0, 10).toUpperCase()}`;
    const generated = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`PAY|TOKEN:${token}|AMOUNT:${amountLocal}|REF:${referenceLocal}`)}`;
    link.href = qrSrc || generated;
    const safePlanName = (data?.plan?.name || 'plan').toString().replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    link.download = `paiement-${safePlanName}-${token?.slice(0, 8) || 'token'}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-48 w-48 mx-auto rounded-xl" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Lien expiré ou invalide</h2>
          <p className="text-gray-600 mb-6">Ce lien de paiement n'existe plus ou a déjà été utilisé.</p>
          <Button onClick={() => navigate('/pricing')} size="lg">
            Voir les formules
          </Button>
        </Card>
      </div>
    );
  }

  const plan = data.plan;
  const paiement = data.paiement;
  const amount = Number(paiement?.montant || plan.price_cents / 100 || 0);
  const reference = `REF${token.slice(0, 10).toUpperCase()}`;

  const qrPayload = `PAY|TOKEN:${token}|AMOUNT:${amount}|REF:${reference}`;
  const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={() => {}} profile={{}} />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Finalisez votre paiement
          </h1>
          <p className="text-lg text-gray-600">Scannez le QR code avec votre application mobile</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* QR Code + Montant */}
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Clock className="w-4 h-4" />
                Valable {formatTime(timeLeft)}
              </div>
              <CardTitle className="text-3xl">Montant à payer</CardTitle>
              <p className="text-5xl font-extrabold text-[#28A745] mt-4">
                {amount.toLocaleString('fr')} F CFA
              </p>
              <Badge variant="secondary" className="mt-4 text-lg px-6 py-2">
                {plan.name}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6">
                    <div className="relative">
                      <div className="border-8 border-white rounded-3xl shadow-2xl bg-white p-6 mx-auto max-w-xs">
                        <img src={qrSrc} alt="QR Code" className="w-full rounded-2xl" />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-4 right-4"
                        onClick={downloadQR}
                      >
                        <Download className="w-4 h-4 mr-1" /> QR
                      </Button>
                    </div>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600 mb-3">Numéro de référence</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-xl font-bold text-gray-800 bg-white px-4 py-2 rounded-lg border">
                    {reference}
                  </code>
                  <Button size="sm" onClick={() => copyToClipboard(reference)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-[#28A745]" />
                  Comment payer ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-semibold">Ouvrez Wave ou Orange Money</p>
                      <p className="text-sm text-gray-600">Scannez le QR code ci-contre</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="font-semibold">Entrez le montant</p>
                      <p className="text-sm text-gray-600">{amount.toLocaleString('fr')} F CFA</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="font-semibold">Validez le paiement</p>
                      <p className="text-sm text-gray-600">Puis revenez ici</p>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full text-lg font-bold h-14 bg-[#28A745] hover:bg-[#218838]"
                  onClick={handleConfirm}
                >
                  <CheckCircle2 className="w-6 h-6 mr-3" />
                  J'ai effectué le paiement
                </Button>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-blue-800 font-medium">
                Compatible avec : Wave • Orange Money • Moov Money • MTN Mobile Money
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}