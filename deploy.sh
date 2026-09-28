#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Déploiement Portefolia sur le VPS (185.215.165.43)
#
#   /opt/portefolia/deploy.sh              → déploie la dernière version de main
#   /opt/portefolia/deploy.sh --force      → rebuild même sans nouveau commit
#   /opt/portefolia/deploy.sh --rollback   → revient au déploiement précédent
#   BRANCH=autre /opt/portefolia/deploy.sh → déploie une autre branche
#
# Depuis ta machine :  ssh root@185.215.165.43 /opt/portefolia/deploy.sh
#
# Ce que fait le script :
#   1. verrou (un seul déploiement à la fois) + vérifications
#   2. sauvegarde des fichiers de config du VPS (.env, ecosystem…) puis
#      récupération du code GitHub, puis restauration de ces fichiers
#      (backend/.env est suivi par git : sans ça la prod serait écrasée)
#   3. npm ci uniquement si les dépendances ont changé
#   4. build Vite dans dist.new puis bascule instantanée vers dist
#      (Nginx sert toujours un build complet, jamais un dossier vide)
#   5. rechargement PM2 du backend + test de santé
#   6. en cas d'échec : retour automatique à la version précédente
#
# Tout le code est dans des fonctions appelées à la dernière ligne : bash lit
# donc le fichier en entier avant de l'exécuter, et le script peut se mettre
# à jour lui-même pendant le git reset sans planter.
# ─────────────────────────────────────────────────────────────────────────────

APP_DIR="${APP_DIR:-/opt/portefolia}"
BRANCH="${BRANCH:-main}"
PM2_APP="portefolia-backend"
BACKEND_PORT="${BACKEND_PORT:-3001}"
HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/api/plans"
LOG_FILE="${LOG_FILE:-/var/log/portefolia-deploy.log}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/portefolia-backups}"
LOCK_FILE="${LOCK_FILE:-/var/lock/portefolia-deploy.lock}"
KEEP_BACKUPS=5

# Fichiers propres au VPS, jamais remplacés par ceux du dépôt
PROTECTED_FILES=(
  "backend/.env"
  ".env"
  ".env.production"
  "ecosystem.config.cjs"
  "ecosystem.config.js"
)

STATE_FILE="$BACKUP_ROOT/last_success"   # commit du dernier déploiement réussi

# ── Utilitaires ──────────────────────────────────────────────────────────────
log()  { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
step() { printf '\n[%s] ── %s\n' "$(date '+%H:%M:%S')" "$*"; }
die()  { log "ERREUR : $*"; exit 1; }

require_cmds() {
  local c
  for c in git node npm npx pm2 curl flock; do
    command -v "$c" >/dev/null 2>&1 || die "commande introuvable : $c"
  done
}

backup_protected() {
  local dest="$1" f
  mkdir -p "$dest"
  for f in "${PROTECTED_FILES[@]}"; do
    if [[ -f "$APP_DIR/$f" ]]; then
      mkdir -p "$dest/$(dirname "$f")"
      cp -p "$APP_DIR/$f" "$dest/$f"
    fi
  done
  chmod -R go-rwx "$dest"
}

restore_protected() {
  local src="$1" f
  for f in "${PROTECTED_FILES[@]}"; do
    if [[ -f "$src/$f" ]]; then
      mkdir -p "$APP_DIR/$(dirname "$f")"
      cp -p "$src/$f" "$APP_DIR/$f"
    fi
  done
}

changed_between() {
  # changed_between <ancien> <nouveau> <motif-grep> → vrai si un fichier correspondant a changé
  [[ "$1" == "$2" ]] && return 1
  git -C "$APP_DIR" diff --name-only "$1" "$2" -- 2>/dev/null | grep -qE "$3"
}

# node_modules est actuellement suivi par git : chaque git reset le remet dans
# l'état du dépôt, il faut donc réinstaller à chaque fois tant que c'est le cas
tracked() { [[ -n "$(git -C "$APP_DIR" ls-files -- "$1" | head -1)" ]]; }

install_deps() {
  local old="$1" new="$2" force="$3"
  tracked node_modules && force=1 && log "node_modules suivi par git → réinstallation complète"
  if [[ "$force" == 1 || ! -d "$APP_DIR/node_modules/vite" ]] \
     || changed_between "$old" "$new" '^(package(-lock)?\.json|node_modules/)'; then
    step "Dépendances frontend (npm ci)"
    (cd "$APP_DIR" && npm ci --no-audit --no-fund) || return 1
  else
    log "Dépendances frontend inchangées"
  fi

  if [[ "$force" == 1 || ! -d "$APP_DIR/backend/node_modules/express" ]] \
     || changed_between "$old" "$new" '^backend/(package(-lock)?\.json|node_modules/)'; then
    step "Dépendances backend (npm ci --omit=dev)"
    (cd "$APP_DIR/backend" && npm ci --omit=dev --no-audit --no-fund) || return 1
  else
    log "Dépendances backend inchangées"
  fi
}

build_frontend() {
  step "Build du frontend"
  cd "$APP_DIR" || return 1
  rm -rf dist.new
  npx vite build --outDir dist.new --emptyOutDir || return 1
  [[ -f dist.new/index.html ]] || { log "dist.new/index.html absent"; return 1; }

  # Bascule quasi atomique : Nginx sert /opt/portefolia/dist
  rm -rf dist.prev
  [[ -d dist ]] && mv dist dist.prev
  mv dist.new dist
  log "Nouveau build en ligne ($(du -sh dist | cut -f1))"
}

reload_backend() {
  step "Rechargement du backend ($PM2_APP)"
  cd "$APP_DIR" || return 1
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 reload "$PM2_APP" --update-env || return 1
  elif [[ -f ecosystem.config.cjs ]]; then
    pm2 start ecosystem.config.cjs --update-env || return 1
  else
    die "processus $PM2_APP absent de PM2 et ecosystem.config.cjs introuvable"
  fi
  pm2 save >/dev/null
}

health_check() {
  step "Test de santé : $HEALTH_URL"
  local i code
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)
    if [[ "$code" =~ ^[234] ]]; then
      log "Backend OK (HTTP $code, après ${i} essai(s))"
      return 0
    fi
    sleep 2
  done
  log "Backend KO (dernier code HTTP : ${code:-aucun})"
  pm2 logs "$PM2_APP" --lines 30 --nostream 2>/dev/null || true
  return 1
}

rollback_to() {
  # rollback_to <commit> <sauvegarde-config> <1 si dist a déjà été basculé>
  local commit="$1" env_backup="$2" swapped="${3:-0}" cur
  step "RETOUR ARRIÈRE vers $commit"
  cd "$APP_DIR" || return 1
  cur=$(git rev-parse HEAD)
  git reset --hard "$commit" -q
  restore_protected "$env_backup"
  if [[ "$swapped" == 1 && -d dist.prev ]]; then
    rm -rf dist.new; mv dist dist.new 2>/dev/null; mv dist.prev dist; rm -rf dist.new
    log "Ancien build frontend restauré"
  fi
  if tracked backend/node_modules || changed_between "$commit" "$cur" '^backend/(package(-lock)?\.json|node_modules/)'; then
    log "Réinstallation des dépendances backend de l'ancienne version…"
    (cd backend && npm ci --omit=dev --no-audit --no-fund) >/dev/null 2>&1 || log "npm ci backend a échoué"
  fi
  pm2 reload "$PM2_APP" --update-env >/dev/null 2>&1 || true
  health_check && log "Retour arrière terminé : $(git log --oneline -1)"
}

prune_backups() {
  ls -1dt "$BACKUP_ROOT"/config-* 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -rf
}

# ── Déploiement ──────────────────────────────────────────────────────────────
deploy() {
  local force=0
  [[ "${1:-}" == "--force" ]] && force=1

  cd "$APP_DIR" || die "$APP_DIR introuvable"
  [[ -d .git ]] || die "$APP_DIR n'est pas un dépôt git"

  local old new ts cfg_backup
  old=$(git rev-parse HEAD)
  ts=$(date +%Y%m%d-%H%M%S)
  cfg_backup="$BACKUP_ROOT/config-$ts"

  step "Récupération de GitHub (branche $BRANCH)"
  git fetch --prune origin "$BRANCH" || die "git fetch a échoué (réseau / accès GitHub ?)"
  new=$(git rev-parse "origin/$BRANCH")

  if [[ "$old" == "$new" && $force == 0 ]]; then
    log "Déjà à jour ($(git log --oneline -1)). Utilise --force pour reconstruire."
    exit 0
  fi
  log "Version actuelle : $(git log --oneline -1 "$old")"
  log "Nouvelle version : $(git log --oneline -1 "$new")"

  backup_protected "$cfg_backup"
  log "Config du VPS sauvegardée dans $cfg_backup"

  git reset --hard "$new" -q || die "git reset a échoué"
  restore_protected "$cfg_backup"
  log "Code à jour, config du VPS restaurée"

  if changed_between "$old" "$new" '^backend/migrations/'; then
    log "ATTENTION : nouvelles migrations SQL à appliquer à la main :"
    git diff --name-only --diff-filter=A "$old" "$new" -- backend/migrations/ | sed 's/^/    /'
  fi

  if ! install_deps "$old" "$new" "$force"; then
    rollback_to "$old" "$cfg_backup" 0; die "installation des dépendances échouée"
  fi
  if ! build_frontend; then
    rm -rf "$APP_DIR/dist.new"
    rollback_to "$old" "$cfg_backup" 0; die "build frontend échoué (le site sert toujours l'ancienne version)"
  fi
  if ! reload_backend || ! health_check; then
    rollback_to "$old" "$cfg_backup" 1; die "le backend ne répond pas avec la nouvelle version"
  fi

  echo "$new" > "$STATE_FILE"
  prune_backups
  step "DÉPLOIEMENT RÉUSSI : $(git log --oneline -1)"
  pm2 describe "$PM2_APP" 2>/dev/null | grep -E 'status|uptime|restarts' | head -3
}

manual_rollback() {
  cd "$APP_DIR" || die "$APP_DIR introuvable"
  local prev
  prev=$(git rev-parse HEAD@{1} 2>/dev/null) || die "aucune version précédente dans l'historique git"
  local last_cfg
  last_cfg=$(ls -1dt "$BACKUP_ROOT"/config-* 2>/dev/null | head -1)
  [[ -n "$last_cfg" ]] || die "aucune sauvegarde de config trouvée"
  [[ -d dist.prev ]] || die "aucun build précédent (dist.prev) : retour arrière déjà fait ?"
  rollback_to "$prev" "$last_cfg" 1
}

main() {
  [[ $EUID -eq 0 ]] || die "à lancer en root (ou avec sudo)"
  mkdir -p "$BACKUP_ROOT" "$(dirname "$LOG_FILE")"
  chmod 700 "$BACKUP_ROOT"

  exec 9>"$LOCK_FILE"
  flock -n 9 || die "un déploiement est déjà en cours"

  # Tout est affiché à l'écran ET ajouté au journal
  exec > >(tee -a "$LOG_FILE") 2>&1
  log "═══ Déploiement Portefolia — $(hostname) ═══"
  require_cmds

  case "${1:-}" in
    --rollback) manual_rollback ;;
    ""|--force) deploy "${1:-}" ;;
    -h|--help)  sed -n '2,12p' "$0" ;;
    *) die "option inconnue : $1 (voir --help)" ;;
  esac
}

main "$@"
exit $?
