import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from 'react-router-dom';
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  Filter,
  MoreVertical,
  Crown,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  portfolio_count: number;
  profile_image_url?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPending = searchParams.get('pending') === 'true';
  const [pendingOnly, setPendingOnly] = useState<boolean>(initialPending);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserForValidation, setSelectedUserForValidation] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState<string>('0');
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentImageUrl, setPaymentImageUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  // Normalization helpers: DB may return role/is_active in different shapes ("admin", "ADMIN", 1, "1", true)
  const isUserAdmin = (u: any) => {
    const r = (u?.role ?? "").toString().toLowerCase();
    return r === "admin" || r.includes("admin") || r === "1" || r === "true";
  };

  const isUserActive = (u: any) => {
    if (u?.deleted_at) return false;
    const v = u?.is_active;
    if (v === true || v === 1) return true;
    if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
    return Boolean(v);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      try {
        const url = pendingOnly ? `${API_BASE}/api/admin/users/pending` : `${API_BASE}/api/admin/users?limit=1000`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setUsers(json.users || []);
      } catch (err) {
        console.error("Erreur chargement utilisateurs", err);
      } finally {
        setLoading(false);
      }
    };
    // reflect pendingOnly in URL
    if (pendingOnly) setSearchParams({ pending: 'true' });
    else setSearchParams({});
    fetchUsers();
  }, [pendingOnly, setSearchParams]);

  useEffect(() => {
    // load plans for validation modal
    const loadPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plans`);
        if (!res.ok) return;
        const data = await res.json();
        setPlans(data.plans || []);
      } catch (err) {
        console.warn('Failed to load plans', err);
      }
    };
    loadPlans();
  }, []);

  // when opening validation dialog, prefill selected plan, amount and generate a reference
  useEffect(() => {
    if (dialogOpen && selectedUserForValidation) {
      // prefer plan_id returned by API on the user object
      const u: any = selectedUserForValidation as any;
      if (u.plan_id) {
        setSelectedPlanId(Number(u.plan_id));
      } else if (u.selected_plan) {
        setSelectedPlanId(Number(u.selected_plan));
      } else {
        setSelectedPlanId(null);
      }

      // generate a reference
      const genRef = `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setReferenceInput(genRef);

      // if plan present, prefill amount from plans list
      if (u.plan_id && plans.length) {
        const found = plans.find((p: any) => String(p.id) === String(u.plan_id));
        if (found) {
          setAmountInput(String(Number(found.price_cents || 0) / 100));
        }
      } else {
        // default amount
        setAmountInput('0');
      }
      // reset payment fields
      setPaymentMethod(null);
      setPaymentImageUrl(null);
    }
  }, [dialogOpen, selectedUserForValidation, plans]);

  useEffect(() => {
    // if a plan is selected, prefill the amount input with plan price (assuming price_cents)
    if (selectedPlanId && plans.length) {
      const p = plans.find((x: any) => Number(x.id) === Number(selectedPlanId));
      if (p) {
        const price = (Number(p.price_cents || 0) / 100).toString();
        setAmountInput(price);
      }
    }
  }, [selectedPlanId, plans]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        (user.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.first_name ?? ""} ${user.last_name ?? ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const totalAdmins = users.filter((u) => isUserAdmin(u)).length;
  const activeUsers = users.filter((u) => isUserActive(u)).length;

  const userSelectedPlan = useMemo(() => {
    if (!selectedUserDetails) return null;
    const u: any = selectedUserDetails as any;
    // If user object contains a full plan/subscription object
    if (u.plan && (u.plan.name || u.plan.id)) return u.plan;
    if (u.subscription && u.subscription.plan) return u.subscription.plan;
    // Legacy field names
    if (u.forfait) return { name: u.forfait };
    // If API returned plan fields directly
    if (u.plan_name) return { name: u.plan_name, id: u.plan_id, slug: u.plan_slug, price_cents: u.plan_price_cents, currency: u.plan_currency || 'F CFA' };
    // If there's a plan_id, try to resolve from loaded plans
    if (u.plan_id && plans && plans.length) {
      const found = plans.find((p: any) => String(p.id) === String(u.plan_id));
      if (found) return found;
    }
    // sometimes stored as plan or selected_plan on the user
    if (u.selected_plan && plans.length) {
      const f = plans.find((p: any) => String(p.id) === String(u.selected_plan));
      if (f) return f;
    }
    return null;
  }, [selectedUserDetails, plans]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <AdminFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-10 w-10 text-[#28A745]" />
                Gestion des Utilisateurs
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {users.length} utilisateurs inscrits • {activeUsers} actifs • {totalAdmins} administrateurs
              </p>
            </div>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <Card className="mb-8 border shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>

              <div className="flex gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* If we are viewing pending users only, show a two-column UX with cards and a details pane */}
        {pendingOnly ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border shadow-md">
                <CardHeader>
                  <CardTitle>Utilisateurs en attente</CardTitle>
                  <CardDescription>{filteredUsers.length} utilisateur(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[70vh] overflow-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Aucun utilisateur en attente</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition ${selectedUserDetails?.id === u.id ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                            <AvatarImage src={u.profile_image_url} />
                            <AvatarFallback className="bg-gradient-to-br from-[#28A745] to-green-600 text-white font-bold">{((u.first_name?.[0] ?? u.email?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-gray-900">{u.first_name ?? u.email} {u.last_name ?? ''}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                            <div className="text-xs text-gray-400 mt-1">Inscrit: {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy', { locale: fr }) : '—'}</div>
                            {u.plan_name && (
                              <div className="text-xs text-gray-500 mt-1">Formule: <span className="font-medium">{u.plan_name}</span>{u.plan_price_cents ? ` — ${(Number(u.plan_price_cents)/100).toLocaleString()} ${u.plan_currency || 'F CFA'}` : ''}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedUserDetails(u)}>
                            Voir
                          </Button>
                          <Button size="sm" onClick={() => { setSelectedUserForValidation(u); setDialogOpen(true); }} className="bg-green-600">Valider</Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="border shadow-md sticky top-6">
                <CardHeader>
                  <CardTitle>Détails - Utilisateur</CardTitle>
                  <CardDescription>Informations et actions rapides</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedUserDetails ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={selectedUserDetails.profile_image_url} />
                          <AvatarFallback className="bg-gradient-to-br from-[#28A745] to-green-600 text-white font-bold">{((selectedUserDetails.first_name?.[0] ?? '') + (selectedUserDetails.last_name?.[0] ?? '')).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-lg font-semibold">{selectedUserDetails.first_name} {selectedUserDetails.last_name}</div>
                          <div className="text-sm text-gray-600">{selectedUserDetails.email}</div>

                          <div className="mt-2">
                            <Label className="text-xs">Formule choisie à l'inscription</Label>
                            {userSelectedPlan ? (
                              <div className="text-sm font-medium">
                                {userSelectedPlan.name}
                                {((userSelectedPlan.price_cents || userSelectedPlan.price) && (
                                  <span className="text-gray-600"> — {(Number(userSelectedPlan.price_cents || userSelectedPlan.price || 0)/100).toLocaleString()} {userSelectedPlan.currency || 'F CFA'}</span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Non précisée</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Formule proposée</Label>
                        <Select value={selectedPlanId ? String(selectedPlanId) : ''} onValueChange={(v) => setSelectedPlanId(v === '__none' ? null : (v ? Number(v) : null))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner une formule (optionnel)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Aucune</SelectItem>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name} — {(p.price_cents/100).toLocaleString()} {p.currency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Montant (F CFA)</Label>
                        <Input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
                      </div>

                      <div>
                        <Label>Référence</Label>
                        <Input value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSelectedUserDetails(null)}>Fermer</Button>
                        <Button onClick={() => { setSelectedUserForValidation(selectedUserDetails); setDialogOpen(true); }} className="bg-green-600">Valider & Envoyer facture</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Sélectionnez un utilisateur à gauche pour voir les détails</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#28A745]/5 to-emerald-500/5 border-b">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Filter className="h-6 w-6" />
                Liste des utilisateurs ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <UserX className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Aucun utilisateur ne correspond à vos filtres</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Portfolios</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead className="text-right">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50/80 transition-all duration-200">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                              <AvatarImage src={user.profile_image_url} />
                              <AvatarFallback className="bg-gradient-to-br from-[#28A745] to-green-600 text-white font-bold">
                                {((user.first_name?.[0] ?? user.email?.[0] ?? "")+ (user.last_name?.[0] ?? "")).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                            <div className="flex items-center gap-3">
                              <Button variant={pendingOnly ? 'outline' : undefined} onClick={() => { setPendingOnly(false); }}>Tous</Button>
                              <Button variant={pendingOnly ? 'default' : 'outline'} onClick={() => { setPendingOnly(true); }}>En attente</Button>
                            </div>
                              <div className="font-semibold text-gray-900">
                                {user.first_name ?? user.email ?? "Utilisateur"} {user.last_name ?? ""}
                                {isUserAdmin(user) && (
                                  <Crown className="inline-block ml-2 h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email ?? "—"}
                              </div>
                              {user.updated_at && (
                                <div className="text-xs text-gray-400 mt-1">Dernière MAJ: {new Date(user.updated_at).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <Badge
                              variant={isUserAdmin(user) ? "default" : "secondary"}
                              className={isUserAdmin(user) ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {isUserAdmin(user) ? "Admin" : "Utilisateur"}
                            </Badge>
                            {user.deleted_at && (
                              <div className="mt-1 text-xs text-red-600">Supprimé: {new Date(user.deleted_at).toLocaleString()}</div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#28A745] to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {user.portfolio_count ?? 0}
                            </div>
                            <span className="text-sm text-gray-600">
                              portfolio{(user.portfolio_count ?? 0) > 1 ? "s" : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {user.created_at ? format(new Date(user.created_at), "dd MMMM yyyy", { locale: fr }) : '—'}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          {!user || (user as any).verified === false ? (
                            <div className="flex items-center justify-end gap-2">
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <UserX className="h-3 w-3 mr-1" />
                                En attente
                              </Badge>
                              <Button size="sm" onClick={() => { setSelectedUserForValidation(user); setDialogOpen(true); }}>Valider</Button>
                            </div>
                          ) : (
                            <Badge
                              variant={user.deleted_at ? "destructive" : isUserActive(user) ? "default" : "destructive"}
                              className={
                                user.deleted_at
                                  ? "bg-red-100 text-red-800"
                                  : isUserActive(user)
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {user.deleted_at ? (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Supprimé
                                </>
                              ) : isUserActive(user) ? (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Inactif
                                </>
                              )}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AdminFooter />
      
      {/* Validation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider l'utilisateur</DialogTitle>
            <DialogDescription>Générez la facture et envoyez-la à l'utilisateur.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <Label>Utilisateur</Label>
              <div className="font-semibold">{selectedUserForValidation ? `${selectedUserForValidation.first_name ?? ''} ${selectedUserForValidation.last_name ?? ''} (${selectedUserForValidation.email})` : '—'}</div>
            </div>

            <div>
              <Label>Formule</Label>
              <Select value={selectedPlanId ? String(selectedPlanId) : ''} onValueChange={(v) => setSelectedPlanId(v === '__none' ? null : (v ? Number(v) : null))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une formule (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Aucune</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} — {(p.price_cents/100).toLocaleString()} {p.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Montant (F CFA)</Label>
              <Input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
            </div>

            <div>
              <Label>Référence</Label>
              <Input value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} />
            </div>

            <div>
              <Label>Moyen de paiement</Label>
              <Select value={paymentMethod || ''} onValueChange={(v) => setPaymentMethod(v === '' ? null : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner le moyen de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="manual">Autre / Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <ImageUpload label="Capture du paiement (preuve)" value={paymentImageUrl || ''} onChange={(url) => setPaymentImageUrl(url)} placeholder="Uploader la capture du paiement" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedUserForValidation(null); }}>Annuler</Button>
              <Button onClick={() => {
                // open confirmation modal with dynamic message
                setConfirmOpen(true);
              }}>Valider & Envoyer facture</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la validation</DialogTitle>
            <DialogDescription>Veuillez confirmer que le paiement a bien été reçu avant de valider le compte.</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <p>
              En validant cet utilisateur vous affirmez que la personne <strong>{selectedUserForValidation ? `${selectedUserForValidation.first_name ?? ''} ${selectedUserForValidation.last_name ?? ''}` : '—'}</strong> a réglé les frais de son forfait de <strong>{(() => {
                // compute amount display
                const amt = selectedPlanId && plans.length ? ((): string => {
                  const p = plans.find((x: any) => Number(x.id) === Number(selectedPlanId));
                  if (p) return (Number(p.price_cents || 0) / 100).toLocaleString();
                  return Number(amountInput || 0).toLocaleString();
                })() : Number(amountInput || 0).toLocaleString();
                return amt;
              })()} F CFA</strong> et de ce fait lui donner accès à la plateforme.
            </p>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
              <Button onClick={async () => {
                if (!selectedUserForValidation) return;
                const token = localStorage.getItem('token');
                try {
                  // require payment method and screenshot
                  if (!paymentMethod) {
                    toast({ title: 'Erreur', description: 'Veuillez sélectionner le moyen de paiement.', variant: 'destructive' });
                    return;
                  }
                  if (!paymentImageUrl) {
                    toast({ title: 'Erreur', description: "Veuillez uploader la capture d'écran du paiement.", variant: 'destructive' });
                    return;
                  }
                  const payload: any = { plan_id: selectedPlanId, amount: Number(amountInput), reference: referenceInput, payment_method: paymentMethod, image_paiement: paymentImageUrl };
                  const res = await fetch(`${API_BASE}/api/admin/users/${selectedUserForValidation.id}/confirm-payment`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload)
                    });
                  const data = await res.json();
                  if (!res.ok) {
                    toast({ title: 'Erreur', description: data?.error || 'Impossible de valider', variant: 'destructive' });
                  } else {
                    toast({ title: 'Utilisateur validé', description: 'Facture générée et email envoyé.', variant: 'default' });
                    // refresh users
                    setLoading(true);
                    const r2 = await fetch(`${API_BASE}/api/admin/users/pending`, { headers: { Authorization: `Bearer ${token}` } });
                    const j2 = await r2.json();
                    setUsers(j2.users || []);
                    // notify admin dashboard to refresh totals/orders
                    try { window.dispatchEvent(new Event('ordersUpdated')); } catch (e) { /* ignore */ }
                  }
                } catch (err) {
                  console.error(err);
                  toast({ title: 'Erreur', description: 'Erreur serveur', variant: 'destructive' });
                } finally {
                  setDialogOpen(false);
                  setSelectedUserForValidation(null);
                  setConfirmOpen(false);
                }
              }}>Confirmer et envoyer</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}