import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Plus,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  UserPlus,
  AlertCircle,
  BarChart3,
  Activity,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import UserPaiementHistorique from '@/components/admin/UserPaiementHistorique';
import { ImageUpload } from '@/components/ui/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

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
  phone?: string;
  verified?: boolean;
  status?: string;
  plan_name?: string;
  plan_price_cents?: number;
  plan_currency?: string;
  subscription_status?: string;
  date_echeance?: string | null;
}

// ── SubscriptionBadge ─────────────────────────────────────────────────────────

const SubscriptionBadge = ({ status }: { status?: string }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]" />
          Actif
        </span>
      );
    case 'PENDING_PAYMENT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-[#E65100]">
          <Clock className="h-3 w-3" />
          En attente
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-[#C62828]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C62828]" />
          Expiré
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">
          Gratuit
        </span>
      );
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [clientsOnly, setClientsOnly] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPending = searchParams.get('pending') === 'true';
  const [pendingOnly, setPendingOnly] = useState<boolean>(initialPending);
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>(
    searchParams.get('filter') === 'expired' ? 'EXPIRED' : 'all'
  );

  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createFirstName, setCreateFirstName] = useState<string>('');
  const [createLastName, setCreateLastName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('Passer1234');
  const [createPlanId, setCreatePlanId] = useState<number | null>(null);
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [createPhone, setCreatePhone] = useState<string>('');
  const [createEmailError, setCreateEmailError] = useState<string | null>(null);
  const [createPhoneError, setCreatePhoneError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // User editing states
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editLastName, setEditLastName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('user');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);

  // Validation states
  const [selectedUserForValidation, setSelectedUserForValidation] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [selectedUserPayments, setSelectedUserPayments] = useState<number | null>(null);
  const [selectedUserPaymentsName, setSelectedUserPaymentsName] = useState<string | undefined>(undefined);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState<string>('0');
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentImageUrl, setPaymentImageUrl] = useState<string | null>(null);

  // Delete states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteType, setDeleteType] = useState<'soft' | 'permanent'>('soft');

  const { toast } = useToast();

  // Normalization helpers
  const isUserAdmin = (u: any) => {
    const r = (u?.role ?? "").toString().toLowerCase();
    return r === "admin" || r.includes("admin") || r === "1" || r === "true";
  };

  const handleCreateUser = async () => {
    try {
      if (!createEmail || !createFirstName || !createLastName) {
        toast({ title: 'Champs manquants', description: 'Prénom, nom et email sont requis', variant: 'destructive' });
        return;
      }
      const token = localStorage.getItem('token');
      const payload: any = {
        email: createEmail,
        password: createPassword,
        first_name: createFirstName,
        last_name: createLastName,
        phone: createPhone || null,
        is_active: createIsActive
      };
      if (createPlanId) payload.plan = createPlanId;

      const res = await fetch(`${API_BASE}/api/users/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // backend returns field information for duplicates
        if (res.status === 409 && data && data.field) {
          if (data.field === 'email') setCreateEmailError(data.error || 'Email déjà utilisé');
          if (data.field === 'phone') setCreatePhoneError(data.error || 'Téléphone déjà utilisé');
          throw new Error(data.error || 'Doublon détecté');
        }
        throw new Error(data?.error || 'Erreur création utilisateur');
      }

      toast({ title: 'Utilisateur créé', description: 'Un email a été envoyé à l\'utilisateur.' });
      setCreateOpen(false);
      setCreateEmail('');
      setCreatePhone('');
      setCreateFirstName('');
      setCreateLastName('');
      setCreatePassword('Passer1234');
      setCreatePlanId(null);
      setCreateIsActive(true);
      setCreateEmailError(null);
      setCreatePhoneError(null);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de créer l\'utilisateur', variant: 'destructive' });
    }
  };

  const isUserActive = (u: any) => {
    if (u?.deleted_at) return false;
    const v = u?.is_active;
    if (v === true || v === 1) return true;
    if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
    return Boolean(v);
  };

  const loadUsers = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    try {
      if (pendingOnly) {
        const res = await fetch(`${API_BASE}/api/admin/users/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '<no body>');
          console.error('loadUsers (pending) failed', res.status, txt);
          toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs en attente', variant: 'destructive' });
          setUsers([]);
          return;
        }
        const json = await res.json();
        console.debug('loadUsers (pending) response', json);
        if (!json || !Array.isArray(json.users) || json.users.length === 0) {
          console.warn('loadUsers: pending users empty', { params: 'pending', json });
        }
        setUsers(json.users || []);
        return;
      }

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (searchTerm) params.set('email', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (selectedPlanId) params.set('plan_id', String(selectedPlanId));
      if (searchParams.get('date_from')) params.set('date_from', String(searchParams.get('date_from')));
      if (searchParams.get('date_to')) params.set('date_to', String(searchParams.get('date_to')));

      const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '<no body>');
        console.error('loadUsers failed', res.status, txt, { params: params.toString() });
        toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs', variant: 'destructive' });
        setUsers([]);
        return;
      }
      const json = await res.json();
      console.debug('loadUsers response', { params: params.toString(), users: (json && json.users) ? json.users.length : null, raw: json });
      if (!json || !Array.isArray(json.users) || json.users.length === 0) {
        console.warn('loadUsers: users list empty', { params: params.toString(), json });
      }
      setUsers(json.users || []);
    } catch (err) {
      console.error("Erreur chargement utilisateurs", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (pendingOnly) setSearchParams({ pending: 'true' });
    else setSearchParams({});
    loadUsers();
  }, [pendingOnly, setSearchParams, page, limit, searchTerm, statusFilter, selectedPlanId]);

  useEffect(() => {
    // Load plans
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

  useEffect(() => {
    if (validationOpen && selectedUserForValidation) {
      const u: any = selectedUserForValidation as any;
      if (u.plan_id) {
        setSelectedPlanId(Number(u.plan_id));
      } else if (u.selected_plan) {
        setSelectedPlanId(Number(u.selected_plan));
      } else {
        setSelectedPlanId(null);
      }

      const genRef = `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setReferenceInput(genRef);

      if (u.plan_id && plans.length) {
        const found = plans.find((p: any) => String(p.id) === String(u.plan_id));
        if (found) {
          setAmountInput(String(Number(found.price_cents || 0)));
        }
      } else {
        setAmountInput('0');
      }
      setPaymentMethod(null);
      setPaymentImageUrl(null);
    }
  }, [validationOpen, selectedUserForValidation, plans]);

  useEffect(() => {
    if (detailsOpen && selectedUserDetails) {
      const user: any = selectedUserDetails;
      setEditFirstName(user.first_name || user.prenom || '');
      setEditLastName(user.last_name || user.nom || '');
      setEditEmail(user.email || '');
      setEditBio(user.biographie || user.bio || '');
      setEditRole((user.role || 'user').toString().toLowerCase());
      setEditPhone(user.phone || user.telephone || '');
      setEditProfileImage(user.profile_image_url || user.photo_profil || null);
    }
  }, [detailsOpen, selectedUserDetails]);

  useEffect(() => {
    if (selectedPlanId && plans.length) {
      const p = plans.find((x: any) => Number(x.id) === Number(selectedPlanId));
      if (p) {
        const price = (Number(p.price_cents || 0)).toString();
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
          .includes(searchTerm.toLowerCase()) ||
        (user.phone ?? "").includes(searchTerm);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      const matchesSubscription =
        subscriptionFilter === "all" ||
        (subscriptionFilter === "NONE"
          ? !user.subscription_status || user.subscription_status === "NONE"
          : user.subscription_status === subscriptionFilter);

      if (clientsOnly && isUserAdmin(user)) return false;

      return matchesSearch && matchesRole && matchesStatus && matchesSubscription;
    });
  }, [users, searchTerm, roleFilter, statusFilter, clientsOnly, subscriptionFilter]);

  const fetchUserDetails = async (id: number | string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const json = await res.json().catch(() => ({}));
      // Accept multiple possible response shapes: { user }, { data: user }, user, or [user]
      let user: any = json.user || json.data || json || null;
      if (Array.isArray(user) && user.length > 0) user = user[0];

      if (!user) {
        setSelectedUserDetails(null);
        return null;
      }

      // Augment plan-related fields so the plan tab can render consistently
      const augmented = {
        ...user,
        plan_name:
          user.plan_name ||
          user.plan?.name ||
          user.selected_plan_name ||
          (user.current_plan && user.current_plan.name) ||
          null,
        plan_price_cents:
          user.plan_price_cents ||
          user.plan?.price_cents ||
          (user.current_plan && user.current_plan.price_cents) ||
          null,
        plan_currency:
          user.plan_currency ||
          user.plan?.currency ||
          (user.current_plan && user.current_plan.currency) ||
          null,
        current_plan: user.current_plan || null,
      };

      setSelectedUserDetails(augmented);

      // Also populate the edit fields immediately for the modal
      setEditFirstName(augmented.first_name || augmented.prenom || '');
      setEditLastName(augmented.last_name || augmented.nom || '');
      setEditEmail(augmented.email || '');
      setEditBio(augmented.biographie || augmented.bio || '');
      setEditRole((augmented.role || 'user').toString().toLowerCase());
      setEditPhone(augmented.phone || augmented.telephone || '');
      setEditProfileImage(augmented.profile_image_url || augmented.photo_profil || null);

      if (augmented.plan_id) setSelectedPlanId(Number(augmented.plan_id));
      else if (augmented.selected_plan) setSelectedPlanId(Number(augmented.selected_plan));
      else if (augmented.plan && augmented.plan.id) setSelectedPlanId(Number(augmented.plan.id));
      else if (augmented.current_plan && augmented.current_plan.plan_id) setSelectedPlanId(Number(augmented.current_plan.plan_id));
      else if (augmented.current_plan && augmented.current_plan.plan_id === undefined && augmented.current_plan.plan_id == null && augmented.current_plan && augmented.current_plan.id) setSelectedPlanId(Number(augmented.current_plan.id));
      else setSelectedPlanId(augmented.plan_id ? Number(augmented.plan_id) : null);

      return augmented;
    } catch (e) {
      console.warn('fetchUserDetails failed', e);
      return null;
    }
  };

  const updateUser = async (id: number | string, patch: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patch)
    });
    return res;
  };

  const activateUser = async (id: number | string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/api/admin/users/${id}/activate`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const deactivateUser = async (id: number | string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/api/admin/users/${id}/deactivate`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const deleteUser = async (id: number | string, permanent: boolean = false) => {
    const token = localStorage.getItem('token');
    const url = permanent
      ? `${API_BASE}/api/admin/users/${id}/permanent`
      : `${API_BASE}/api/admin/users/${id}`;
    return fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const confirmPayment = async (userId: string, payload: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/confirm-payment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return res;
  };

  const totalAdmins = users.filter((u) => isUserAdmin(u)).length;
  const activeUsers = users.filter((u) => isUserActive(u)).length;
  const pendingUsers = users.filter((u) => !u.verified).length;
  const subscriptionActiveUsers = users.filter((u) => u.subscription_status === 'ACTIVE').length;
  const pendingPaymentUsers = users.filter((u) => u.subscription_status === 'PENDING_PAYMENT').length;
  const expiredUsers = users.filter((u) => u.subscription_status === 'EXPIRED').length;

  const handleUserAction = async (user: User, action: 'activate' | 'deactivate' | 'delete' | 'permanent-delete') => {
    try {
      let res;
      switch (action) {
        case 'activate':
          res = await activateUser(user.id);
          toast({ title: "Utilisateur activé", description: "L'utilisateur a été réactivé avec succès" });
          break;
        case 'deactivate':
          res = await deactivateUser(user.id);
          toast({ title: "Utilisateur désactivé", description: "L'utilisateur a été désactivé" });
          break;
        case 'delete':
          res = await deleteUser(user.id, false);
          toast({ title: "Utilisateur supprimé", description: "Suppression logique effectuée" });
          break;
        case 'permanent-delete':
          res = await deleteUser(user.id, true);
          toast({ title: "Utilisateur supprimé", description: "Suppression définitive effectuée" });
          break;
      }

      if (res && !res.ok) {
        throw new Error('Action failed');
      }

      loadUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "L'action a échoué",
        variant: "destructive"
      });
    }
  };

  const handleValidateUser = async () => {
    if (!selectedUserForValidation || !paymentMethod || !paymentImageUrl) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        plan_id: selectedPlanId,
        amount: Number(amountInput),
        reference: referenceInput,
        payment_method: paymentMethod,
        image_paiement: paymentImageUrl
      };

      const res = await confirmPayment(selectedUserForValidation.id, payload);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Validation failed');
      }

      toast({
        title: "✅ Utilisateur validé",
        description: "Facture générée et email envoyé avec succès"
      });

      setValidationOpen(false);
      setSelectedUserForValidation(null);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erreur de validation",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUserDetails) return;

    try {
      const payload = {
        nom: editLastName,
        prenom: editFirstName,
        email: editEmail,
        biographie: editBio,
        role: editRole.toUpperCase(),
        phone: editPhone,
        password: editPassword || undefined,
        ...(editProfileImage && { photo_profil: editProfileImage })
      };

      const res = await updateUser(selectedUserDetails.id, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Update failed');
      }

      toast({
        title: "✅ Utilisateur mis à jour",
        description: "Les modifications ont été enregistrées"
      });

      setDetailsOpen(false);
      setEditPassword('');
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/users/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: "La liste des utilisateurs a été téléchargée"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">


      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-3">
                <Users className="h-3 w-3" />
                ADMINISTRATION CLIENTS
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Gestion des Clients
              </h1>
              <p className="text-gray-500 mt-2 text-lg">
                Visualisez et gérez votre base d'utilisateurs en temps réel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={exportUsers}
                className="h-12 rounded-xl border-gray-200 hover:bg-gray-50 font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>

              <Button
                size="lg"
                onClick={() => setCreateOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:translate-y-[-2px]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total utilisateurs */}
          <Card className="border-none shadow-sm bg-white overflow-hidden" style={{ borderLeft: '4px solid #1565C0' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#5C5C5C] mb-1">Total Utilisateurs</p>
                  <h3 className="text-3xl font-bold text-[#1A1A2E]">{users.length}</h3>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1565C026', color: '#1565C0' }}>
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 text-xs text-[#1565C0] font-semibold flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Base de données complète
              </div>
            </CardContent>
          </Card>

          {/* Comptes actifs */}
          <Card className="border-none shadow-sm bg-white overflow-hidden" style={{ borderLeft: '4px solid #2E7D32' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#5C5C5C] mb-1">Abonnements Actifs</p>
                  <h3 className="text-3xl font-bold text-[#1A1A2E]">{subscriptionActiveUsers}</h3>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2E7D3226', color: '#2E7D32' }}>
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2E7D32] animate-pulse" />
                <span className="text-xs text-[#2E7D32] font-semibold">Opérationnels</span>
              </div>
            </CardContent>
          </Card>

          {/* En attente de validation */}
          <Card className="border-none shadow-sm bg-white overflow-hidden" style={{ borderLeft: '4px solid #E65100' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#5C5C5C] mb-1">En Attente Paiement</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl font-bold text-[#1A1A2E]">{pendingPaymentUsers}</h3>
                    {pendingPaymentUsers > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#E65100]">
                        Action requise
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E6510026', color: '#E65100' }}>
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 text-xs text-[#E65100] font-semibold">
                Validation manuelle requise
              </div>
            </CardContent>
          </Card>

          {/* Expirés */}
          <Card className="border-none shadow-sm bg-white overflow-hidden" style={{ borderLeft: '4px solid #C62828' }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#5C5C5C] mb-1">Abonnements Expirés</p>
                  <h3 className="text-3xl font-bold text-[#1A1A2E]">{expiredUsers}</h3>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#C6282826', color: '#C62828' }}>
                  <UserX className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 text-xs text-[#C62828] font-semibold">
                Renouvellement nécessaire
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger
              value="all"
              onClick={() => setPendingOnly(false)}
            >
              Tous les utilisateurs
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              onClick={() => setPendingOnly(true)}
            >
              En attente de validation
              {pendingPaymentUsers > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] bg-[#E65100] text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center px-1">
                  {pendingPaymentUsers}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {/* Filters */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher par nom, email ou téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
                        <SelectValue placeholder="Rôle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100">
                        <SelectItem value="all">Tous les rôles</SelectItem>
                        <SelectItem value="user" className="rounded-lg">Utilisateur</SelectItem>
                        <SelectItem value="admin" className="rounded-lg">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100">
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active" className="rounded-lg">Actif</SelectItem>
                        <SelectItem value="inactive" className="rounded-lg">Inactif</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                      <SelectTrigger className="w-52 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
                        <SelectValue placeholder="Abonnement" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100">
                        <SelectItem value="all">Tous les abonnements</SelectItem>
                        <SelectItem value="ACTIVE" className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#2E7D32]" />
                            Actif
                          </span>
                        </SelectItem>
                        <SelectItem value="PENDING_PAYMENT" className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-[#E65100]" />
                            En attente paiement
                          </span>
                        </SelectItem>
                        <SelectItem value="EXPIRED" className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#C62828]" />
                            Expiré
                          </span>
                        </SelectItem>
                        <SelectItem value="NONE" className="rounded-lg">Gratuit / Aucun</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant={clientsOnly ? "default" : "outline"}
                      onClick={() => setClientsOnly(c => !c)}
                      className={`h-11 rounded-xl px-4 font-semibold transition-all ${clientsOnly ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-gray-100'}`}
                    >
                      {clientsOnly ? 'Clients Filtrés' : 'Tous les membres'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-gray-50 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold">Liste des utilisateurs</CardTitle>
                    <CardDescription>
                      {filteredUsers.length} utilisateur(s) trouvé(s)
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadUsers}
                    disabled={refreshing}
                    className="text-indigo-600 hover:bg-indigo-50 font-bold h-9 px-4 rounded-lg"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilisateur</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rôle</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Abonnement</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Échéance</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</TableHead>
                          <TableHead className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredUsers.map((user, index) => (
                            <motion.tr
                              key={user.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50 last:border-none"
                            >
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-11 w-11 rounded-xl shadow-sm border-2 border-white ring-1 ring-gray-100 transition-transform group-hover:scale-105">
                                    <AvatarImage src={user.profile_image_url} />
                                    <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-base">
                                      {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                      {user.first_name} {user.last_name}
                                      {isUserAdmin(user) && (
                                        <Badge variant="outline" className="ml-2 h-5 bg-purple-50 text-purple-600 border-purple-100 text-[10px] font-bold px-1.5">
                                          STAFF
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Inscrit le {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy", { locale: fr }) : '—'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 font-medium italic">
                                    {user.email}
                                  </div>
                                  {user.phone && (
                                    <div className="text-[11px] text-gray-400 font-bold">
                                      {user.phone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-4">
                                <Badge
                                  className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest border-none
                                    ${isUserAdmin(user) ? "bg-indigo-100 text-indigo-600 shadow-indigo-100 shadow-sm" : "bg-gray-100 text-gray-600"}
                                  `}
                                >
                                  {isUserAdmin(user) ? "Admin" : "Client"}
                                </Badge>
                              </TableCell>

                              {/* Abonnement */}
                              <TableCell className="px-6 py-4">
                                <SubscriptionBadge status={user.subscription_status} />
                              </TableCell>

                              {/* Plan */}
                              <TableCell className="px-6 py-4">
                                {user.plan_name ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-bold">
                                    {user.plan_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </TableCell>

                              {/* Échéance */}
                              <TableCell className="px-6 py-4 text-xs text-gray-500 font-medium">
                                {user.date_echeance && user.subscription_status !== 'NONE' && user.subscription_status
                                  ? format(new Date(user.date_echeance), 'dd MMM yyyy', { locale: fr })
                                  : <span className="text-gray-300">—</span>
                                }
                              </TableCell>

                              <TableCell className="px-6 py-4">
                                {user.deleted_at ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 italic">
                                    Supprimé
                                  </div>
                                ) : (
                                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${isUserActive(user) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full ${isUserActive(user) ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {isUserActive(user) ? 'Actif' : 'Bloqué'}
                                  </div>
                                )}
                              </TableCell>

                              <TableCell className="px-6 py-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100">
                                      <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 rounded-xl border-gray-100 shadow-xl p-2">
                                    <DropdownMenuLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1.5">Action Rapide</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => navigate(`/admin/users/${user.id}`)}
                                      className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600 font-medium py-2"
                                    >
                                      <Eye className="h-4 w-4 mr-3" />
                                      Voir le profil complet
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={async () => { await fetchUserDetails(user.id); setDetailsOpen(true); }}
                                      className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600 font-medium py-2"
                                    >
                                      <Edit className="h-4 w-4 mr-3" />
                                      Modifier les infos
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-gray-50 my-1" />

                                    {!user.verified && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedUserForValidation(user);
                                          setValidationOpen(true);
                                        }}
                                        className="rounded-lg cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 font-medium py-2"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-3" />
                                        Valider le compte
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                      onClick={() => {
                                        const action = isUserActive(user) ? 'deactivate' : 'activate';
                                        handleUserAction(user, action);
                                      }}
                                      className={`rounded-lg cursor-pointer font-medium py-2 ${isUserActive(user) ? 'focus:bg-orange-50 focus:text-orange-600' : 'focus:bg-emerald-50 focus:text-emerald-600'}`}
                                    >
                                      {isUserActive(user) ? (
                                        <>
                                          <UserX className="h-4 w-4 mr-3" />
                                          Désactiver l'accès
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="h-4 w-4 mr-3" />
                                          Rétablir l'accès
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-gray-50 my-1" />

                                    <DropdownMenuItem
                                      className="rounded-lg cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium py-2"
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setDeleteType('soft');
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-3" />
                                      Supprimer le client
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm font-medium text-gray-500">
                Page <span className="text-gray-900">{page}</span> • <span className="text-gray-900">{filteredUsers.length}</span> résultats affichés
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-10 rounded-xl px-4 font-bold border-gray-100 shadow-sm"
                >
                  Précédent
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, Math.ceil(users.length / limit)))].map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-xl font-bold ${page === i + 1 ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-gray-500'}`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={filteredUsers.length < limit}
                  className="h-10 rounded-xl px-4 font-bold border-gray-100 shadow-sm"
                >
                  Suivant
                </Button>

                <Separator orientation="vertical" className="h-6 mx-2" />

                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-24 h-10 rounded-xl border-gray-100 bg-white">
                    <SelectValue placeholder="Par page" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100">
                    <SelectItem value="10" className="rounded-lg font-medium">10 / p</SelectItem>
                    <SelectItem value="20" className="rounded-lg font-medium">20 / p</SelectItem>
                    <SelectItem value="50" className="rounded-lg font-medium">50 / p</SelectItem>
                    <SelectItem value="100" className="rounded-lg font-medium">100 / p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="border-b border-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1A1A2E]">
                      En attente de validation paiement
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5 text-[#E65100]" />
                      <span>
                        {pendingPaymentUsers} paiement{pendingPaymentUsers !== 1 ? 's' : ''} Wave en attente de validation manuelle
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-lg h-9 px-4 font-semibold flex items-center gap-2"
                    onClick={() => navigate('/admin/wave-validation')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir Wave Validation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {pendingPaymentUsers === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-14 w-14 mx-auto text-[#A5D6A7] mb-4" />
                    <p className="text-gray-500 font-medium">Aucun paiement en attente</p>
                    <p className="text-sm text-gray-400 mt-1">Tous les paiements ont été traités</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.filter(u => u.subscription_status === 'PENDING_PAYMENT').map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-orange-50/60 rounded-xl border border-orange-100"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 rounded-lg">
                            <AvatarImage src={user.profile_image_url} />
                            <AvatarFallback className="bg-orange-100 text-[#E65100] font-bold rounded-lg">
                              {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[#1A1A2E] text-sm">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-500 italic">{user.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {user.plan_name && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] font-bold">
                                  {user.plan_name}
                                </span>
                              )}
                              {user.created_at && (
                                <span className="text-[10px] text-gray-400">
                                  Inscrit le {format(new Date(user.created_at), "dd MMM yyyy", { locale: fr })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-gray-200 text-gray-600 text-xs font-semibold"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                          >
                            Détails
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-[#E65100] hover:bg-[#BF360C] text-white text-xs font-bold flex items-center gap-1.5"
                            onClick={() => navigate('/admin/wave-validation')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Valider paiement
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{users.length}</div>
                    <div className="text-sm text-gray-500">Clients totaux</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{activeUsers}</div>
                    <div className="text-sm text-gray-500">Clients actifs</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{totalAdmins}</div>
                    <div className="text-sm text-gray-500">Administrateurs</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {selectedUserPayments && (
        <div className="max-w-7xl mx-auto w-full p-4">
          <UserPaiementHistorique userId={selectedUserPayments} userName={selectedUserPaymentsName} onClose={() => { setSelectedUserPayments(null); setSelectedUserPaymentsName(undefined); }} />
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-indigo-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                Nouveau client
              </DialogTitle>
              <DialogDescription className="text-indigo-100 text-sm opacity-90">
                Créez manuellement un compte client et assignez-lui un plan.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prénom</Label>
                <Input
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  placeholder="Jean"
                  className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom</Label>
                <Input
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  placeholder="Dupont"
                  className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Professionnel</Label>
                <Input
                  type="email"
                  value={createEmail}
                  placeholder="jean.dupont@business.com"
                  onChange={(e) => { setCreateEmail(e.target.value); setCreateEmailError(null); }}
                  onBlur={async () => {
                    if (!createEmail) return;
                    try {
                      setCheckingDuplicate(true);
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${API_BASE}/api/users/admin/check-duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: createEmail }) });
                      const j = await res.json().catch(() => ({}));
                      if (res.ok && j.exists) setCreateEmailError('Email déjà utilisé');
                      else setCreateEmailError(null);
                    } catch (e) {
                      console.warn('check duplicate email failed', e);
                    } finally { setCheckingDuplicate(false); }
                  }}
                  className={`h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium ${createEmailError ? 'border-red-200 bg-red-50' : ''}`}
                />
                {createEmailError && <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 uppercase"><AlertCircle className="h-3 w-3" /> {createEmailError}</div>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone</Label>
                <Input
                  value={createPhone}
                  placeholder="+221 ..."
                  onChange={(e) => { setCreatePhone(e.target.value); setCreatePhoneError(null); }}
                  onBlur={async () => {
                    if (!createPhone) return;
                    try {
                      setCheckingDuplicate(true);
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${API_BASE}/api/users/admin/check-duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ phone: createPhone }) });
                      const j = await res.json().catch(() => ({}));
                      if (res.ok && j.exists) setCreatePhoneError('Téléphone déjà utilisé');
                      else setCreatePhoneError(null);
                    } catch (e) {
                      console.warn('check duplicate phone failed', e);
                    } finally { setCheckingDuplicate(false); }
                  }}
                  className={`h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-medium ${createPhoneError ? 'border-red-200 bg-red-50' : ''}`}
                />
                {createPhoneError && <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 uppercase"><AlertCircle className="h-3 w-3" /> {createPhoneError}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mot de passe</Label>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">AUTO-GÉNÉRÉ</span>
                </div>
                <Input
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan Initial</Label>
                <Select value={createPlanId ? String(createPlanId) : ''} onValueChange={(v) => setCreatePlanId(v ? Number(v) : null)}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-medium">
                    <SelectValue placeholder="Aucun plan (Gratuit)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100">
                    <SelectItem value="all" className="rounded-lg">Aucun (Fermé)</SelectItem>
                    {plans.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)} className="rounded-lg">{p.name || p.slug}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <Label htmlFor="create-active" className="text-sm font-bold text-gray-700 cursor-pointer block">Activer le compte immédiatement</Label>
                <p className="text-[11px] text-gray-500">L'utilisateur pourra se connecter dès la création.</p>
              </div>
              <input
                id="create-active"
                type="checkbox"
                checked={createIsActive}
                onChange={(e) => setCreateIsActive(e.target.checked)}
                className="h-6 w-6 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl font-semibold h-12 px-6">Annuler</Button>
            <Button
              onClick={handleCreateUser}
              disabled={!!createEmailError || !!createPhoneError || checkingDuplicate || !createEmail || !createFirstName || !createLastName}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              Créer le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog (Details Light) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-indigo-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Edit className="h-6 w-6" />
                Modification Rapide
              </DialogTitle>
              <DialogDescription className="text-indigo-100 text-sm opacity-90">
                Mettez à jour les informations essentielles de l'utilisateur.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-50 p-1 rounded-xl h-12">
                <TabsTrigger value="info" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Informations</TabsTrigger>
                <TabsTrigger value="plan" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Abonnement</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Activité</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-0 space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 space-y-4 flex flex-col items-center">
                    <div className="relative group">
                      <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                        <AvatarImage src={editProfileImage || undefined} />
                        <AvatarFallback className="text-2xl bg-indigo-50 text-indigo-600 font-bold">
                          {(editFirstName?.[0] || '') + (editLastName?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    <div className="w-full">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Changer l'image</Label>
                      <ImageUpload
                        value={editProfileImage || ''}
                        onChange={setEditProfileImage}
                        className="rounded-xl border-dashed"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prénom</Label>
                        <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom</Label>
                        <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</Label>
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Téléphone</Label>
                        <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-11 rounded-xl bg-gray-50 border-gray-100 focus:bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rôle système</Label>
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="user" className="rounded-lg">Client Utilisateur</SelectItem>
                            <SelectItem value="admin" className="rounded-lg">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Biographie / Notes</Label>
                      <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="rounded-xl bg-gray-50 border-gray-100 focus:bg-white min-h-[100px]" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="plan" className="mt-0 space-y-6 pt-2">
                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                      <Crown className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900">Plan en cours</h4>
                      <p className="text-sm text-indigo-600 font-medium">Gestion du cycle de vie</p>
                    </div>
                  </div>

                  {selectedUserDetails?.plan_name ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-black text-indigo-950 uppercase tracking-tight">{selectedUserDetails.plan_name}</div>
                      <div className="text-sm font-bold text-indigo-700/70">
                        {(selectedUserDetails.plan_price_cents || 0).toLocaleString('fr-FR')} {selectedUserDetails.plan_currency || 'F CFA'} / mois
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic font-medium">Aucun abonnement actif détecté</div>
                  )}
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <p className="text-xs text-orange-800 font-medium leading-relaxed">
                    Le changement de plan n'est pas autorisé via cette fenêtre rapide. Veuillez utiliser le bouton <strong>"Voir le profil complet"</strong> pour accéder aux outils de facturation.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0 space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                    <div className="text-3xl font-black text-gray-900">{selectedUserDetails?.portfolio_count || 0}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Portfolios Créés</div>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                    <div className="text-3xl font-black text-gray-900">0</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Visites Totales</div>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-sm mb-4">Informations de sécurité</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Dernière connexion</span>
                      <span className="font-bold text-gray-700">Jamais</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Adresse IP</span>
                      <span className="font-bold text-gray-700">Masquée</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 gap-3">
            <Button variant="ghost" onClick={() => setDetailsOpen(false)} className="rounded-xl font-semibold h-11 px-6">Fermer</Button>
            <Button
              onClick={handleSaveUser}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-11 font-bold shadow-lg shadow-indigo-100 transition-all"
            >
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Validation de Paiement
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-sm opacity-90">
                Finalisez l'activation du compte par validation manuelle.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="font-bold text-emerald-900">
                {selectedUserForValidation?.first_name} {selectedUserForValidation?.last_name}
              </div>
              <div className="text-xs text-emerald-700 font-medium italic">{selectedUserForValidation?.email}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan à activer</Label>
              <Select value={selectedPlanId ? String(selectedPlanId) : ''} onValueChange={(v) => setSelectedPlanId(v ? Number(v) : null)}>
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-medium">
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl font-medium">
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)} className="rounded-lg">
                      {plan.name} - {(plan.price_cents).toLocaleString('fr-FR')} {plan.currency || 'F CFA'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Montant Perçu</Label>
                <div className="relative">
                  <Input
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    type="number"
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white pl-4 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">CFA</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Référence / ID</Label>
                <Input
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Méthode employée</Label>
              <Select value={paymentMethod || ''} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white">
                  <SelectValue placeholder="Choisir le canal" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="wave" className="rounded-lg">🌊 Wave</SelectItem>
                  <SelectItem value="om" className="rounded-lg">🍊 Orange Money</SelectItem>
                  <SelectItem value="card" className="rounded-lg">💳 Carte bancaire</SelectItem>
                  <SelectItem value="manual" className="rounded-lg">🛠 Autre / Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capture d'écran / Preuve</Label>
              <ImageUpload
                value={paymentImageUrl || ''}
                onChange={setPaymentImageUrl}
                placeholder="Uploader le reçu de transaction"
                className="rounded-2xl border-dashed h-32"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 gap-3">
            <Button variant="ghost" onClick={() => setValidationOpen(false)} className="rounded-xl font-semibold h-11">Annuler</Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-100 transition-all hover:translate-y-[-2px]"
            >
              Envoyer la validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la validation</DialogTitle>
            <DialogDescription>
              Cette action générera une facture et enverra un email de confirmation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Vérification requise</p>
                  <p className="text-yellow-700 mt-1">
                    Assurez-vous que le paiement a bien été reçu avant de valider.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Utilisateur:</span>
                <span className="font-medium">
                  {selectedUserForValidation?.first_name} {selectedUserForValidation?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Montant:</span>
                <span className="font-medium">
                  {amountInput} F CFA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Référence:</span>
                <span className="font-medium">{referenceInput}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidateUser}>
              Confirmer la validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'permanent' ? 'Suppression définitive' : 'Suppression'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'permanent'
                ? "Cette action est irréversible. L'utilisateur sera définitivement supprimé de la base de données."
                : "L'utilisateur sera marqué comme supprimé mais pourra être restauré ultérieurement."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  handleUserAction(userToDelete, deleteType === 'permanent' ? 'permanent-delete' : 'delete');
                }
                setDeleteDialogOpen(false);
              }}
              className={deleteType === 'permanent' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}