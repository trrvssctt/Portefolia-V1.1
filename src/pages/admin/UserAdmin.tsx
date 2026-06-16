import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Edit, Trash2, UserPlus, Shield, Users, UserCheck,
  Activity, RefreshCw, Lock, Briefcase, BookOpen,
  Headphones, Wrench, Crown, Check, Info, Search,
  MoreVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number | string;
  full_name: string;
  email: string;
  role_id?: number;
  role_name?: string;
  is_active?: boolean;
  created_at?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

// ─── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_META: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  dot: string;
  description: string;
  permissions: string[];
  canCreate: boolean; // whether this role can be created from the UI
}> = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    description: 'Accès total à la plateforme. Seul rôle pouvant créer d\'autres administrateurs.',
    permissions: ['Tableau de bord', 'Utilisateurs', 'Portfolios', 'Formules', 'Commandes', 'Paiements', 'Statistiques', 'Blog', 'Pages légales', 'Gestion des admins'],
    canCreate: true,
  },
  admin_technique: {
    label: 'Administrateur Technique',
    icon: Wrench,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    description: 'Accès opérationnel complet : utilisateurs, commandes, paiements, statistiques. Ne peut pas gérer les admins ni le contenu éditorial.',
    permissions: ['Tableau de bord', 'Utilisateurs', 'Portfolios', 'Formules', 'Commandes', 'Cartes NFC', 'Paiements', 'Statistiques', 'Notifications'],
    canCreate: true,
  },
  admin_contenu: {
    label: 'Administrateur Contenu',
    icon: BookOpen,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    description: 'Gère exclusivement le contenu éditorial : articles de blog et pages légales.',
    permissions: ['Blog & Articles', 'Pages légales'],
    canCreate: true,
  },
  admin_support: {
    label: 'Administrateur Support',
    icon: Headphones,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Traite les demandes utilisateurs : support, upgrades et suivi des commandes. Accès en lecture sur les utilisateurs et paiements.',
    permissions: ['Utilisateurs (lecture)', 'Upgrades & demandes', 'Commandes (suivi)', 'Paiements (lecture)'],
    canCreate: true,
  },
};

function getRoleMeta(roleName?: string) {
  if (!roleName) return null;
  return ROLE_META[roleName] ?? {
    label: roleName,
    icon: Shield,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    description: '',
    permissions: [],
    canCreate: true,
  };
}

// ─── JWT helper ───────────────────────────────────────────────────────────────

function decodeTokenPayload(token?: string | null) {
  if (!token) return null;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
  } catch { return null; }
}

// ─── RoleCard sub-component ───────────────────────────────────────────────────

const RoleCard = ({ meta, selected, onClick }: {
  meta: typeof ROLE_META[string];
  selected: boolean;
  onClick: () => void;
}) => {
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
        selected
          ? `${meta.border} ${meta.bg} shadow-sm`
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${selected ? meta.bg : 'bg-gray-100'} transition-colors`}>
          <Icon className={`h-4 w-4 ${selected ? meta.color : 'text-gray-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${selected ? meta.color : 'text-gray-700'}`}>{meta.label}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meta.description}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {meta.permissions.slice(0, 3).map(p => (
              <span key={p} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${selected ? `${meta.bg} ${meta.color}` : 'bg-gray-100 text-gray-500'}`}>
                {p}
              </span>
            ))}
            {meta.permissions.length > 3 && (
              <span className="text-[10px] text-gray-400 px-1">+{meta.permissions.length - 3}</span>
            )}
          </div>
        </div>
        {selected && <Check className={`h-4 w-4 shrink-0 mt-0.5 ${meta.color}`} />}
      </div>
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserAdmin() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<AdminUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const payload = decodeTokenPayload(token);
  const callerRole: string = payload?.role || '';
  const isSuperAdmin = callerRole === 'super_admin';

  useEffect(() => {
    loadRoles();
    loadAdmins();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/roles`);
      if (!res.ok) return;
      const j = await res.json();
      setRoles(j.roles || j || []);
    } catch {
      setRoles([]);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/admin-users`, { headers: authHeaders() });
      if (!res.ok) { setAdmins([]); return; }
      const j = await res.json().catch(() => ({}));
      setAdmins(j.admins || j.users || j || []);
    } catch { setAdmins([]); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setFullName(''); setEmail(''); setPassword(''); setRoleId(null); setIsActive(true);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!fullName || !email || !password || !roleId) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/admin-users`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ full_name: fullName, email, password, role_id: roleId, is_active: isActive }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Création impossible');
      toast({ title: 'Administrateur créé', description: `${fullName} a rejoint l'équipe.` });
      setCreateOpen(false);
      loadAdmins();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const openEdit = (a: AdminUser) => {
    setCurrentEdit(a);
    setFullName(a.full_name || '');
    setEmail(a.email || '');
    setPassword('');
    setRoleId(a.role_id || null);
    setIsActive(Boolean(a.is_active));
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentEdit) return;
    setSaving(true);
    try {
      const body: any = { full_name: fullName, email, role_id: roleId, is_active: isActive };
      if (password) body.password = password;
      const res = await fetch(`${API_BASE}/api/admin/admin-users/${currentEdit.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Mise à jour impossible');
      toast({ title: 'Profil mis à jour' });
      setEditOpen(false);
      setCurrentEdit(null);
      loadAdmins();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const confirmDelete = (a: AdminUser) => { setToDelete(a); setDeleteDialogOpen(true); };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/admin-users/${toDelete.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Suppression impossible');
      toast({ title: 'Accès révoqué', description: `${toDelete.full_name} a été retiré de l'équipe.` });
      setDeleteDialogOpen(false);
      setToDelete(null);
      loadAdmins();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const filteredAdmins = admins.filter(a =>
    !searchQuery ||
    a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfdfd]">

        <main className="flex-1 p-6 max-w-4xl mx-auto flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <Card className="border-none shadow-2xl shadow-red-50">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50">
                  <Lock className="h-9 w-9 text-red-500" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-900">Accès restreint</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Seul le <strong>Super Administrateur</strong> peut gérer les comptes d'administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Button size="lg" className="bg-gray-900 hover:bg-black text-white px-10 h-12 rounded-xl font-bold" onClick={() => navigate('/admin')}>
                  Retour au tableau de bord
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Selected role meta (for dialogs) ─────────────────────────────────────

  const selectedRoleName = roles.find(r => r.id === roleId)?.name;
  const selectedMeta = getRoleMeta(selectedRoleName);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd]">

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black uppercase tracking-widest mb-3">
              <Crown className="h-3 w-3" />
              Super Admin — Gestion de l'équipe
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Administrateurs
            </h1>
            <p className="text-gray-500 mt-1.5 text-base">
              Gérez les accès et permissions de chaque membre de votre équipe.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau membre
            </Button>
            <Button variant="outline" size="icon" onClick={loadAdmins} className="h-11 w-11 rounded-xl border-gray-200 hover:bg-gray-50" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* ── Role overview cards ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Rôles disponibles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ROLE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = admins.filter(a => a.role_name === key).length;
              return (
                <div key={key} className={`relative p-5 rounded-2xl border ${meta.border} ${meta.bg} overflow-hidden group`}>
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Icon className="h-20 w-20" />
                  </div>
                  <div className="relative">
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border ${meta.border} ${meta.color} text-[11px] font-black mb-3`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </div>
                    <div className="text-3xl font-black text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{meta.description}</div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {meta.permissions.slice(0, 2).map(p => (
                        <span key={p} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color} border ${meta.border}`}>{p}</span>
                      ))}
                      {meta.permissions.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{meta.permissions.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Stats quick bar ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-4">
          {[
            { label: 'Total membres', value: admins.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Actifs', value: admins.filter(a => a.is_active).length, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Inactifs', value: admins.filter(a => !a.is_active).length, icon: Activity, color: 'text-red-500', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{s.label}</div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Admins table ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-black text-gray-900">Membres de l'équipe</CardTitle>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="pl-9 h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Aucun administrateur trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Membre</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Rôle & Accès</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Statut</TableHead>
                        <TableHead className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Depuis</TableHead>
                        <TableHead className="px-6 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {filteredAdmins.map((a, idx) => {
                          const meta = getRoleMeta(a.role_name);
                          const isSelf = String(a.id) === String(payload?.sub);
                          const Icon = meta?.icon ?? Shield;
                          return (
                            <motion.tr
                              key={a.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="group hover:bg-indigo-50/20 transition-colors border-b border-gray-50 last:border-none"
                            >
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-11 w-11 rounded-xl shadow-sm border-2 border-white ring-1 ring-gray-100">
                                    <AvatarFallback className={`${meta?.bg ?? 'bg-gray-100'} ${meta?.color ?? 'text-gray-600'} font-black text-base rounded-xl`}>
                                      {(a.full_name?.[0] || 'A').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                      {a.full_name}
                                      {isSelf && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">Vous</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium">{a.email}</div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-4">
                                {meta ? (
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${meta.border} ${meta.bg}`}>
                                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                    <span className={`text-[11px] font-black ${meta.color}`}>{meta.label}</span>
                                  </div>
                                ) : (
                                  <Badge variant="outline">{a.role_name || `Rôle ${a.role_id}`}</Badge>
                                )}
                              </TableCell>

                              <TableCell className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  a.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                }`}>
                                  <div className={`h-1.5 w-1.5 rounded-full ${a.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                                  {a.is_active ? 'Actif' : 'Inactif'}
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-4 text-[12px] text-gray-500 font-medium">
                                {a.created_at ? format(new Date(a.created_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                              </TableCell>

                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => openEdit(a)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  {!isSelf && (
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => confirmDelete(a)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                                <div className="group-hover:hidden">
                                  <MoreVertical className="h-4 w-4 ml-auto text-gray-200" />
                                </div>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>


      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><UserPlus className="h-5 w-5" /></div>
                Nouveau membre
              </DialogTitle>
              <DialogDescription className="text-indigo-100 text-sm mt-1">
                Ajoutez un collaborateur et définissez précisément son périmètre d'accès.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Nom complet *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Jean Dupont" className="h-11 rounded-xl border-gray-100 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="jean@example.com" className="h-11 rounded-xl border-gray-100 bg-gray-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Mot de passe *</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="h-11 rounded-xl border-gray-100 bg-gray-50" />
            </div>

            {/* Role picker */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Rôle & Périmètre d'accès *
              </Label>
              <div className="space-y-2">
                {roles.filter(r => ROLE_META[r.name]?.canCreate !== false).map(r => {
                  const meta = getRoleMeta(r.name);
                  if (!meta) return null;
                  return (
                    <RoleCard key={r.id} meta={meta} selected={roleId === r.id}
                      onClick={() => setRoleId(r.id)} />
                  );
                })}
              </div>
              {selectedMeta && roleId && (
                <div className={`flex items-start gap-2 p-3 rounded-xl border ${selectedMeta.border} ${selectedMeta.bg} text-sm`}>
                  <Info className={`h-4 w-4 mt-0.5 shrink-0 ${selectedMeta.color}`} />
                  <div>
                    <span className={`font-bold ${selectedMeta.color}`}>Accès inclus : </span>
                    <span className="text-gray-600">{selectedMeta.permissions.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <Label htmlFor="active-create" className="text-sm font-bold text-gray-700 cursor-pointer">Compte actif immédiatement</Label>
                <p className="text-xs text-gray-400 mt-0.5">L'administrateur pourra se connecter dès la création.</p>
              </div>
              <input id="active-create" type="checkbox" checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 cursor-pointer" />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl font-semibold">Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-indigo-100">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Créer le compte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><Edit className="h-5 w-5" /></div>
                Modifier l'accès
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-sm mt-1">
                {currentEdit?.full_name} — mise à jour des droits
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Nom complet</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-11 rounded-xl border-gray-100 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl border-gray-100 bg-gray-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Nouveau mot de passe</Label>
              <Input type="password" placeholder="Laisser vide pour ne pas changer" value={password}
                onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl border-gray-100 bg-gray-50" />
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Rôle & Périmètre d'accès
              </Label>
              <div className="space-y-2">
                {roles.filter(r => ROLE_META[r.name]?.canCreate !== false).map(r => {
                  const meta = getRoleMeta(r.name);
                  if (!meta) return null;
                  return (
                    <RoleCard key={r.id} meta={meta} selected={roleId === r.id}
                      onClick={() => setRoleId(r.id)} />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <Label htmlFor="active-edit" className="text-sm font-bold text-gray-700 cursor-pointer">Compte actif</Label>
                <p className="text-xs text-gray-400 mt-0.5">Désactiver bloque immédiatement l'accès.</p>
              </div>
              <input id="active-edit" type="checkbox" checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 cursor-pointer" />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl font-semibold">Annuler</Button>
            <Button onClick={handleUpdate} disabled={saving}
              className="bg-gray-900 hover:bg-black text-white rounded-xl px-6 font-bold">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-sm">
          <div className="bg-red-50 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-red-900">Révoquer l'accès ?</AlertDialogTitle>
            <p className="mt-2 text-red-700/80 text-sm leading-relaxed">
              Êtes-vous sûr de vouloir retirer les droits de <strong>{toDelete?.full_name}</strong> ?
              Cette action est irréversible.
            </p>
          </div>
          <AlertDialogFooter className="p-4 bg-white flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl border-gray-200 font-semibold bg-gray-50">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all hover:scale-[1.02]">
              Oui, révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
