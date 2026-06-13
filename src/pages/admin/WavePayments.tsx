import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2, RefreshCw, Smartphone, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface WavePayment {
    checkout_id: number;
    token: string;
    utilisateur_id: number;
    plan_id: number;
    checkout_statut: string;
    created_at: string;
    paiement_id: number;
    montant: number;
    reference_transaction: string;
    moyen_paiement: string;
    paiement_statut: string;
    email: string;
    nom: string;
    prenom: string;
    is_active: number;
    plan_name: string;
}

export default function WavePayments() {
    const [payments, setPayments] = useState<WavePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<number | null>(null);
    const { toast } = useToast();

    const loadPayments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/wave-payments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur de chargement');
            const data = await res.json();
            setPayments(data.payments || []);
        } catch (e: any) {
            toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPayments(); }, []);

    const handleApprove = async (payment: WavePayment) => {
        setApproving(payment.checkout_id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/wave-payments/${payment.checkout_id}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur de validation');
            toast({
                title: 'Paiement validé ✓',
                description: `Le compte de ${payment.email} a été activé.`,
            });
            loadPayments();
        } catch (e: any) {
            toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
        } finally {
            setApproving(null);
        }
    };

    const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc]">


            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#1BC29A]/10 rounded-xl">
                                <Smartphone className="h-6 w-6 text-[#1BC29A]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Paiements Wave en attente</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Validez les références Wave soumises par les utilisateurs pour activer leurs comptes
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadPayments} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold">Vérification requise avant validation</p>
                        <p className="mt-0.5 text-amber-700">
                            Vérifiez dans votre application Wave que la référence correspond bien à un paiement reçu du bon montant avant de cliquer sur "Valider".
                        </p>
                    </div>
                </div>

                {/* Table */}
                <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="px-6 pt-5 pb-3">
                        <CardTitle className="text-base font-semibold text-gray-800">
                            {loading ? '…' : `${payments.length} paiement${payments.length > 1 ? 's' : ''} en attente`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                        {loading ? (
                            <div className="space-y-3 px-6 pb-6">
                                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400" />
                                <p className="font-medium text-gray-600">Aucun paiement en attente</p>
                                <p className="text-sm mt-1">Tous les paiements Wave ont été traités.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-b-xl">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead>Utilisateur</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Montant</TableHead>
                                            <TableHead>Référence Wave</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Statut compte</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((p) => (
                                            <TableRow key={p.checkout_id} className="hover:bg-gray-50/50">
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm">{p.prenom} {p.nom}</p>
                                                        <p className="text-xs text-gray-500">{p.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs border-[#1BC29A]/30 text-[#1BC29A] bg-[#1BC29A]/5">
                                                        {p.plan_name || `Plan #${p.plan_id}`}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-gray-900 text-sm">{fmt(p.montant)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {p.reference_transaction ? (
                                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded-md font-mono text-gray-800">
                                                            {p.reference_transaction}
                                                        </code>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Non fournie</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-500">
                                                        {p.created_at
                                                            ? format(new Date(p.created_at), 'dd MMM yyyy HH:mm', { locale: fr })
                                                            : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {p.is_active ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Actif</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">En attente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(p)}
                                                        disabled={approving === p.checkout_id || p.is_active === 1}
                                                        className="bg-[#1BC29A] hover:bg-[#17a884] text-white text-xs h-8 px-3 gap-1.5"
                                                    >
                                                        {approving === p.checkout_id ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                                                Validation…
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Valider
                                                            </span>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

        </div>
    );
}
