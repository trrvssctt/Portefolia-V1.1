import { useState, useCallback } from 'react';
import { Eye, EyeOff, Wand2, Copy, Check } from 'lucide-react';

// ── Calcul de la force ────────────────────────────────────────────────────────

export interface PasswordStrength {
  score:  number;   // 0-5
  label:  string;
  color:  string;   // couleur CSS
  bg:     string;   // background pill
}

export function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: '', color: '#D1D5DB', bg: '#F3F4F6' };
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (pwd.length >= 12)             score++;
  if (/[A-Z]/.test(pwd))           score++;
  if (/[0-9]/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd))   score++;
  if (score <= 1) return { score, label: 'Trop faible',  color: '#EF4444', bg: '#FEF2F2' };
  if (score === 2) return { score, label: 'Faible',       color: '#F97316', bg: '#FFF7ED' };
  if (score === 3) return { score, label: 'Moyen',        color: '#F59E0B', bg: '#FFFBEB' };
  if (score === 4) return { score, label: 'Fort',         color: '#3B82F6', bg: '#EFF6FF' };
  return                { score,    label: 'Très fort',   color: '#22C55E', bg: '#F0FDF4' };
}

// ── Générateur ────────────────────────────────────────────────────────────────

const LOWER   = 'abcdefghijkmnpqrstuvwxyz';   // sans l, o (ambigus)
const UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // sans I, O
const DIGITS  = '23456789';                    // sans 0, 1
const SPECIAL = '!@#$%&*-_=+?';

export function generatePassword(length = 16): string {
  const all = LOWER + UPPER + DIGITS + SPECIAL;
  const mandatory = [
    LOWER[Math.floor(Math.random() * LOWER.length)],
    LOWER[Math.floor(Math.random() * LOWER.length)],
    UPPER[Math.floor(Math.random() * UPPER.length)],
    UPPER[Math.floor(Math.random() * UPPER.length)],
    DIGITS[Math.floor(Math.random() * DIGITS.length)],
    DIGITS[Math.floor(Math.random() * DIGITS.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
  ];
  const rest = Array.from(
    { length: Math.max(0, length - mandatory.length) },
    () => all[Math.floor(Math.random() * all.length)]
  );
  return [...mandatory, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('');
}

// ── Barre de force ────────────────────────────────────────────────────────────

export function PasswordStrengthBar({ password }: { password: string }) {
  const s = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: i < s.score ? s.color : '#E5E7EB' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
        {s.score < 3 && (
          <p className="text-[10px] text-gray-400">Utilisez majuscules, chiffres et symboles</p>
        )}
      </div>
    </div>
  );
}

// ── Champ mot de passe complet ────────────────────────────────────────────────

interface PasswordInputProps {
  id?:           string;
  label?:        string;
  value:         string;
  onChange:      (v: string) => void;
  placeholder?:  string;
  showStrength?: boolean;
  showGenerator?: boolean;
  required?:     boolean;
  className?:    string;
  labelClassName?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = '8 caractères minimum',
  showStrength  = false,
  showGenerator = false,
  required,
  className = '',
  labelClassName = '',
}: PasswordInputProps) {
  const [show,    setShow]    = useState(false);
  const [copied,  setCopied]  = useState(false);

  const handleGenerate = useCallback(() => {
    const pwd = generatePassword();
    onChange(pwd);
    setShow(true); // montrer le mot de passe généré
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [onChange]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={`block text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1.5 ${labelClassName}`}>
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="new-password"
          className="w-full h-11 pl-3.5 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] transition-colors"
          style={{ paddingRight: showGenerator ? '5.5rem' : '2.75rem' }}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {showGenerator && (
            <button
              type="button"
              onClick={handleGenerate}
              title="Générer un mot de passe fort"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: copied ? '#22C55E' : '#6B7280' }}
            >
              {copied ? <Check size={14} /> : <Wand2 size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-gray-100 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {showStrength && <PasswordStrengthBar password={value} />}

      {showGenerator && copied && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Copy size={11} className="text-green-500" />
          <p className="text-xs text-green-600 font-medium">Mot de passe copié dans le presse-papiers</p>
        </div>
      )}
    </div>
  );
}
