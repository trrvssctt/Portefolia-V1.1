// src/pages/Analytics.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Eye, Users, Clock, Globe, Smartphone, Tablet, Laptop, MapPin,
  BarChart2, TrendingUp, Award, MousePointerClick, LayoutDashboard,
  FileText, Download, AlertCircle, Sparkles, Zap, ShieldCheck,
  Calendar, ArrowUpRight, ArrowDownRight, ExternalLink, Share2,
  Heart, MessageCircle, Bookmark, Lock, Play, Pause, Search,
  Filter, ChevronDown, Trophy, Flame, Target, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart,
  Pie, Cell, AreaChart, Area
} from 'recharts';
import confetti from 'canvas-confetti';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { WorldMap } from '@/components/analytics/WorldMap';
import { HeatmapGrid } from '@/components/analytics/HeatmapGrid';
import { SessionReplayPlayer } from '@/components/analytics/SessionReplayPlayer';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

const periods = [
  { value: '24h', label: '24 heures' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: 'all', label: 'Tout' },
];

const COLORS = ['#28A745', '#218838', '#16a34a', '#22c55e', '#15803d'];

export default function Analytics() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [score, setScore] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const planSlug = profile?.plan?.toString().toLowerCase() || '';
  const isFreeUser = ['free', 'gratuit', 'starter'].some(p => planSlug.includes(p));

  // === ACCÈS BLOQUÉ POUR LES PLANS GRATUITS / STARTER ===
  if (isFreeUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <DashboardNav onSignOut={() => {}} profile={profile} />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <div className="mb-8">
            <Lock className="w-24 h-24 mx-auto text-gray-400 mb-6" />
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Accès Premium Requis</h1>
            <p className="text-xl text-gray-600 mb-8">
              Les analytics avancées sont réservées aux formules <strong>Business</strong> et <strong>Premium</strong>
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="border-2 border-[#28A745] shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Business</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /> Analytics en temps réel</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /> Heatmaps</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /> Session Replay</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-green-600" /> Export PDF/CSV</li>
                </ul>
                <Button className="w-full mt-6 bg-[#28A745]" onClick={() => window.location.href = '/checkout?plan=pro'}>
                  Passer à Business
                </Button>
              </CardContent>
            </Card>
            <Card className="border-4 border-purple-500 shadow-2xl ring-4 ring-purple-200">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  Premium <Trophy className="text-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-purple-600" /> Tout Business +</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-purple-600" /> Mots-clés Google</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-purple-600" /> Session Replay HD</li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="text-purple-600" /> Support prioritaire 24/7</li>
                </ul>
                <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  Passer à Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // === CHARGEMENT DES DONNÉES ===
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/analytics/advanced?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur de chargement');

        const json = await res.json();
        setData(json);

        const calculatedScore = calculatePerformanceScore(json);
        setScore(calculatedScore);

        if (calculatedScore > 95) {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#28A745', '#FFD700', '#FF6B7280']
          });
        }

        const slug = profile?.plan?.toString().toLowerCase() || '';
        // Treat Business and Premium as Pro as well so they get access to
        // Pro features (heatmaps, advanced traffic views, etc.).
        setIsPro(
          slug.includes('pro') ||
          slug.includes('professionnel') ||
          slug.includes('business') ||
          slug.includes('premium')
        );
        setIsPremium(slug.includes('premium') || slug.includes('business'));
      } catch (err) {
        toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Live updates toutes les 8 secondes pour Premium
    if (isPremium) {
      const interval = setInterval(fetchData, 8000);
      return () => clearInterval(interval);
    }
  }, [period, profile, isPremium]);

  const calculatePerformanceScore = (data: any) => {
    const base = 50;
    const visitsBonus = Math.min((data?.total_visits || 0) / 500, 1) * 20;
    const engagementBonus = Math.min((data?.avg_session_duration || 0) / 300, 1) * 20;
    const conversionBonus = (data?.conversion_rate || 0) * 10;
    const seoBonus = (data?.google_keywords?.length || 0) * 2;

    return Math.min(100, Math.round(base + visitsBonus + engagementBonus + conversionBonus + seoBonus));
  };

  const handleExport = async (type: 'pdf' | 'csv') => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/analytics/export?type=${type}&period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_portefolia_${new Date().toISOString().split('T')[0]}.${type}`;
      a.click();
      toast({ title: 'Export réussi', description: `Rapport ${type.toUpperCase()} téléchargé` });
    } catch {
      toast({ title: 'Erreur', description: 'Export impossible', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <DashboardNav onSignOut={() => {}} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header Premium */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full text-xl font-bold mb-6 shadow-2xl">
            <Trophy className="w-8 h-8" />
            Analytics {isPremium ? 'Premium' : 'Pro'}
            {isPremium && <Flame className="w-8 h-8 animate-pulse" />}
          </div>
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Tableau de bord Analytics
          </h1>
          <p className="text-xl text-gray-300">Suivi ultra-précis de votre portfolio en temps réel</p>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-64 bg-white/10 backdrop-blur border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {/* Score de performance animé */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <svg className="w-64 h-64" viewBox="0 0 36 36">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path
                className="circle"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeDasharray={`${score}, 100`}
              />
              <defs>
                <linearGradient id="gradient">
                  <stop offset="0%" stopColor="#28A745" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-7xl font-black">{score}</span>
              <span className="text-2xl text-gray-400">/100</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold mt-6">
            {score > 95 ? 'Légendaire' : score > 90 ? 'Exceptionnel' : score > 80 ? 'Excellent' : 'Très bon'}
          </h2>
        </div>

        {/* Live Dashboard Premium */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/50">
            <CardContent className="p-6 text-center">
              <Eye className="h-10 w-10 mx-auto mb-3 text-pink-400" />
              <h3 className="text-4xl font-bold">{data?.live_visitors || 0}</h3>
              <p className="text-sm text-gray-300">En direct</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50">
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-blue-400" />
              <h3 className="text-4xl font-bold">{data?.total_unique || 0}</h3>
              <p className="text-sm text-gray-300">Uniques {period}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50">
            <CardContent className="p-6 text-center">
              <Clock className="h-10 w-10 mx-auto mb-3 text-green-400" />
              <h3 className="text-4xl font-bold">{data?.avg_duration || '0s'}</h3>
              <p className="text-sm text-gray-300">Temps moyen</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50">
            <CardContent className="p-6 text-center">
              <MousePointerClick className="h-10 w-10 mx-auto mb-3 text-purple-400" />
              <h3 className="text-4xl font-bold">{data?.total_clicks || 0}</h3>
              <p className="text-sm text-gray-300">Clics</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50">
            <CardContent className="p-6 text-center">
              <Heart className="h-10 w-10 mx-auto mb-3 text-orange-400" />
              <h3 className="text-4xl font-bold">{data?.conversions || 0}</h3>
              <p className="text-sm text-gray-300">Conversions</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/50">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <h3 className="text-4xl font-bold">{score}/100</h3>
              <p className="text-sm text-gray-300">Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets avec fonctionnalités Premium */}
        <Tabs defaultValue="live" className="space-y-8">
          <TabsList className="grid grid-cols-5 gap-3 bg-white/10 backdrop-blur">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="traffic">Trafic</TabsTrigger>
            <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="seo">SEO & Mots-clés</TabsTrigger>
          </TabsList>

          {/* === LIVE VISITORS === */}
          <TabsContent value="live">
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Activity className="h-6 w-6 text-green-400" />
                    Visiteurs en direct ({data?.live_visitors || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.live_sessions?.map((session: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                          <div>
                            <p className="font-medium">{session.country || 'Inconnu'}</p>
                            <p className="text-sm text-gray-400">{session.device} • {session.page}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">{session.time_ago}</span>
                      </div>
                    )) || <p className="text-center text-gray-400 py-8">Aucun visiteur en ce moment</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Carte du monde */}
              <Card>
                <CardHeader>
                  <CardTitle>Géolocalisation des visiteurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <WorldMap data={data?.countries || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === TRAFIC === */}
          <TabsContent value="traffic">
            <div className="grid gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des visites</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data?.visits_over_time || []}>
                      <defs>
                        <linearGradient id="colorUv" stroke="#28A745" fill="#28A745" fillOpacity={0.3} />
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                      <Area type="monotone" dataKey="visites" stroke="#28A745" fill="url(#colorUv)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sources + Mots-clés Premium */}
              {isPremium && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Search className="h-6 w-6" />
                      Mots-clés Google (Premium)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {(data?.google_keywords || ['react developer', 'portfolio', 'développeur sénégal']).map((kw: string) => (
                        <Badge key={kw} variant="secondary" className="px-4 py-2 text-base">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* === HEATMAPS === */}
          <TabsContent value="heatmaps">
            {isPro ? (
              <HeatmapGrid data={data?.heatmap || []} />
            ) : (
              <div className="text-center py-20">
                <Lock className="h-20 w-20 mx-auto text-gray-400 mb-4" />
                <p className="text-2xl font-bold">Fonctionnalité Pro</p>
                <Button className="mt-6">Upgrade</Button>
              </div>
            )}
          </TabsContent>

          {/* === SESSION REPLAY === */}
          <TabsContent value="sessions">
            {isPremium ? (
              <SessionReplayPlayer sessions={data?.sessions || []} />
            ) : (
              <div className="text-center py-20">
                <Lock className="h-20 w-20 mx-auto text-gray-400 mb-4" />
                <p className="text-2xl font-bold">Session Replay Premium</p>
                <Button className="mt-6">Passer à Premium</Button>
              </div>
            )}
          </TabsContent>

          {/* === SEO & MOTS-CLÉS */}
          <TabsContent value="seo">
            {isPremium ? (
              <div className="grid gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Mots-clés les plus performants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.google_keywords?.map((kw: any) => (
                        <div key={kw.keyword} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                          <span className="font-medium">{kw.keyword}</span>
                          <div className="flex items-center gap-6">
                            <span className="text-sm">Position: <strong>{kw.position}</strong></span>
                            <span className="text-sm">Volume: <strong>{kw.volume}</strong></span>
                            <Badge variant="outline">{kw.difficulty}/100</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="h-20 w-20 mx-auto text-gray-400 mb-4" />
                <p className="text-2xl font-bold">Analyse SEO Premium</p>
                <Button className="mt-6">Upgrade</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}