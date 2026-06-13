import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check, ChevronRight, Upload, X, Loader2, Copy, CheckCircle2,
  Smartphone, Clock, FileImage, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const WAVE_NUMBER = import.meta.env.VITE_WAVE_MERCHANT_NUMBER || '+221 78 131 13 71';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PricingOption {
  duree: number;
  label: string;
  montant_base: number;
  remise: number;
  montant_final: number;
  currency: string;
}

interface ConfirmData {
  planName: string;
  dureeLabel: string;
  montant: number;
  waveRef: string;
}

interface Props {
  planId: number;
  onSuccess: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatXOF = (n: number) =>
  n.toLocaleString('fr-FR') + ' FCFA';

const STEP_LABELS = ['Durée', 'Paiement', 'Confirmation'];

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = current > step;
        const active = current === step;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  done
                    ? 'bg-[#2E7D32] border-[#2E7D32] text-white'
                    : active
                    ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32]'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={`text-xs font-medium leading-none whitespace-nowrap ${
                  active ? 'text-[#2E7D32]' : done ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-1 mb-5 transition-colors duration-300 ${
                  current > step ? 'bg-[#2E7D32]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DurationCard({
  option,
  selected,
  onSelect,
}: {
  option: PricingOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasDiscount = option.remise > 0;
  const discountPct = Math.round(option.remise * 100);
  const isYear = option.duree === 12;
  const isThree = option.duree === 3;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none ${
        selected
          ? 'border-[#2E7D32] bg-[#E8F5E9] shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Badge */}
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
          hasDiscount
            ? 'bg-[#2E7D32] text-white'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}
      >
        {hasDiscount ? `Économisez ${discountPct}%` : 'Flexible'}
      </span>

      {/* Popular ring */}
      {isThree && (
        <div className="absolute -top-px -left-px -right-px -bottom-px rounded-2xl border-2 border-[#2E7D32] pointer-events-none opacity-40" />
      )}

      <div className="pt-2 text-center space-y-1">
        <p className={`font-bold text-base ${selected ? 'text-[#2E7D32]' : 'text-gray-700'}`}>
          {option.label}
        </p>

        {hasDiscount ? (
          <>
            <p className="text-2xl font-black text-gray-900">{formatXOF(option.montant_final)}</p>
            <p className="text-sm text-gray-400 line-through">{formatXOF(option.montant_base)}</p>
            <p className="text-xs font-semibold text-[#2E7D32]">
              Économie : {formatXOF(option.montant_base - option.montant_final)}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-black text-gray-900">{formatXOF(option.montant_final)}</p>
            <p className="text-xs text-gray-400">Sans remise</p>
          </>
        )}
      </div>

      {/* Selection indicator */}
      <div
        className={`mt-4 mx-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'border-[#2E7D32] bg-[#2E7D32]' : 'border-gray-300'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
}

function AnimatedCheck() {
  return (
    <div className="flex justify-center">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#E8F5E9] flex items-center justify-center ring-8 ring-[#E8F5E9]">
          <CheckCircle2 className="w-14 h-14 text-[#2E7D32] animate-in zoom-in duration-500" />
        </div>
        <div className="absolute inset-0 rounded-full bg-[#2E7D32] opacity-10 animate-ping" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WavePaymentForm({ planId, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [options, setOptions] = useState<PricingOption[]>([]);
  const [planName, setPlanName] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedDuree, setSelectedDuree] = useState<number | null>(null);
  const [waveRef, setWaveRef] = useState('');
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [preuveUrl, setPreuveUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = profile?.email || user?.email || '';

  // ── Step 1: fetch pricing options ─────────────────────────────────────────

  useEffect(() => {
    setLoadingOptions(true);
    fetch(`${API_BASE}/api/payment/wave/options/${planId}`)
      .then(r => r.json())
      .then(json => {
        setOptions(json.options ?? []);
        setPlanName(json.plan?.name ?? '');
      })
      .catch(() => toast({ title: 'Erreur', description: 'Impossible de charger les tarifs', variant: 'destructive' }))
      .finally(() => setLoadingOptions(false));
  }, [planId]);

  const selectedOption = options.find(o => o.duree === selectedDuree) ?? null;

  // ── Copy to clipboard ─────────────────────────────────────────────────────

  const copyAmount = useCallback(() => {
    if (!selectedOption) return;
    navigator.clipboard.writeText(String(selectedOption.montant_final)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedOption]);

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Fichier trop lourd', description: 'Maximum 5 MB', variant: 'destructive' });
      return;
    }

    setPreuveFile(file);
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_BASE}/api/uploads/cloudinary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      const url = json.secure_url || json.url || json.result?.secure_url;
      if (!url) throw new Error('URL manquante dans la réponse');
      setPreuveUrl(url);
    } catch {
      toast({ title: 'Erreur upload', description: 'Réessayez ou continuez sans capture', variant: 'destructive' });
      setPreuveFile(null);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setPreuveFile(null);
    setPreuveUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Step 2 → 3: submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedOption || !waveRef.trim()) return;

    const ref = waveRef.trim();
    if (ref.length < 4) {
      toast({ title: 'Référence invalide', description: 'Minimum 4 caractères', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/payment/wave/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planId,
          duree_mois: selectedOption.duree,
          reference_wave: ref,
          preuve_paiement_url: preuveUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la soumission');

      // Persister la ref pour la page PendingValidation
      localStorage.setItem('wave_reference', ref);

      setConfirmData({
        planName,
        dureeLabel: selectedOption.label,
        montant: selectedOption.montant_final,
        waveRef: ref,
      });
      setStep(3);
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto font-[Inter,sans-serif]">
      <Stepper current={step} />

      {/* ── ÉTAPE 1 : Choix de la durée ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Choisissez votre engagement</h2>
            <p className="text-gray-500 text-sm mt-1">Payez plus longtemps, économisez davantage</p>
          </div>

          {loadingOptions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E7D32]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
              {options.map(option => (
                <DurationCard
                  key={option.duree}
                  option={option}
                  selected={selectedDuree === option.duree}
                  onSelect={() => setSelectedDuree(option.duree)}
                />
              ))}
            </div>
          )}

          <Button
            onClick={() => setStep(2)}
            disabled={!selectedDuree || loadingOptions}
            className="w-full h-12 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-base rounded-xl gap-2 disabled:opacity-40 transition-all"
          >
            Continuer
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* ── ÉTAPE 2 : Instructions Wave ──────────────────────────────────── */}
      {step === 2 && selectedOption && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Effectuez le paiement Wave</h2>
            <p className="text-gray-500 text-sm mt-1">
              Suivez les instructions ci-dessous puis soumettez votre référence
            </p>
          </div>

          {/* Montant + QR code */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            {/* QR Code */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-[#E8F5E9] p-1 bg-white shadow-sm">
                <img
                  src="/qr_code_marchant_wave.png"
                  alt="QR code marchand Wave Portefolia"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs text-gray-400 font-medium">Scanner avec Wave</span>
            </div>

            {/* Montant */}
            <div className="flex-1 space-y-3 w-full">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Montant exact à envoyer</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#E8F5E9] rounded-xl px-4 py-3">
                  <p className="text-3xl font-black text-[#2E7D32] leading-none">
                    {formatXOF(selectedOption.montant_final)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
                  title="Copier le montant"
                >
                  {copied ? <Check className="w-4 h-4 text-[#2E7D32]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Numéro marchand :{' '}
                <span className="font-bold text-gray-800 tracking-wide">{WAVE_NUMBER}</span>
              </p>
            </div>
          </div>

          {/* Instructions pas-à-pas */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#2E7D32]" /> Instructions
            </h3>
            <ol className="space-y-3">
              {[
                'Ouvrez l\'application Wave sur votre téléphone',
                <>Envoyez <strong className="text-[#2E7D32]">{formatXOF(selectedOption.montant_final)}</strong> au <strong>{WAVE_NUMBER}</strong> (ou scannez le QR code)</>,
                <>Dans l'objet du transfert, écrivez : <strong className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-sm">Portefolia - {userEmail || 'votre email'}</strong></>,
                'Copiez la référence de transaction affichée après le transfert',
              ].map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-bold text-xs flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Référence Wave */}
          <div className="space-y-2">
            <Label htmlFor="wave-ref" className="font-semibold text-gray-700">
              Référence de transaction Wave <span className="text-red-500">*</span>
            </Label>
            <Input
              id="wave-ref"
              placeholder="ex. TRX_ABC123456789"
              value={waveRef}
              onChange={e => setWaveRef(e.target.value)}
              className="h-12 rounded-xl border-gray-300 font-mono text-sm focus:border-[#2E7D32] focus:ring-[#2E7D32]/20"
            />
            <p className="text-xs text-gray-400">
              Disponible dans l'historique Wave après le transfert
            </p>
          </div>

          {/* Upload capture d'écran */}
          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">
              Capture d'écran{' '}
              <span className="text-gray-400 font-normal">(optionnel — max 5 MB)</span>
            </Label>

            {!preuveFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 hover:border-[#2E7D32] hover:bg-[#E8F5E9]/40 rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:text-[#2E7D32] transition-all"
              >
                <FileImage className="w-8 h-8" />
                <span className="text-sm font-medium">Cliquez pour ajouter une capture</span>
                <span className="text-xs">PNG, JPG, JPEG acceptés</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-[#E8F5E9] border border-[#2E7D32]/30 rounded-xl px-4 py-3">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#2E7D32] shrink-0" />
                ) : (
                  <Check className="w-5 h-5 text-[#2E7D32] shrink-0" />
                )}
                <span className="text-sm text-gray-700 flex-1 truncate">{preuveFile.name}</span>
                <button type="button" onClick={removeFile} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Vérifiez bien votre référence Wave avant de soumettre.
              Notre équipe valide sous <strong>24h ouvrables</strong>.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="rounded-xl h-12"
            >
              Retour
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!waveRef.trim() || waveRef.trim().length < 4 || uploading || submitting}
              className="flex-1 h-12 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl gap-2 disabled:opacity-40 transition-all"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              ) : (
                <><Check className="w-4 h-4" /> J'ai effectué le paiement</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 : Confirmation ───────────────────────────────────────── */}
      {step === 3 && confirmData && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500 text-center">
          <AnimatedCheck />

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900">Paiement soumis !</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
              Notre équipe valide votre paiement sous{' '}
              <strong className="text-gray-700">24h ouvrables</strong>.
              Vous recevrez un email de confirmation dès l'activation.
            </p>
          </div>

          {/* Récapitulatif */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left space-y-3 max-w-sm mx-auto">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Récapitulatif</h3>
            {[
              { label: 'Plan',     value: confirmData.planName },
              { label: 'Durée',    value: confirmData.dureeLabel },
              { label: 'Montant',  value: formatXOF(confirmData.montant) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">Référence Wave</span>
              <span className="font-mono font-bold text-[#2E7D32] text-xs bg-[#E8F5E9] px-2 py-1 rounded-lg tracking-wide">
                {confirmData.waveRef}
              </span>
            </div>
          </div>

          {/* Délai */}
          <div className="inline-flex items-center gap-2 bg-[#E8F5E9] text-[#2E7D32] px-4 py-2.5 rounded-full text-sm font-semibold mx-auto">
            <Clock className="w-4 h-4" />
            Validation sous 24h ouvrables
          </div>

          <Button
            onClick={() => navigate('/')}
            className="w-full max-w-sm mx-auto h-12 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl"
          >
            Retour à l'accueil
          </Button>

          <p className="text-xs text-gray-400">
            Un problème ?{' '}
            <a
              href="mailto:support@portefolia.tech"
              className="text-[#2E7D32] font-semibold hover:underline"
            >
              support@portefolia.tech
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
