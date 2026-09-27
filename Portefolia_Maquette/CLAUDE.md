# Portefolia — Instructions projet

## Périmètre STRICT — Frontend uniquement
Modifier UNIQUEMENT :
- `/src/components/**`
- `/src/pages/**`
- `/src/styles/**`
- `/src/assets/**`
- `tailwind.config.js` (couleurs uniquement)

## NE PAS TOUCHER — Zéro modification
- `/backend/**` (controllers, models, routes, middlewares)
- `/migrations/**`
- `.env` et `.env.example`
- `package.json` du backend
- Toute logique métier, endpoint, requête SQL
- Ne pas modifier les appels API existants
- Ne pas changer les noms des props des composants
- Ne pas réorganiser la structure des fichiers
- Uniquement changer le style visuel (CSS, classes Tailwind, couleurs, espacements)

## Charte graphique
- Couleur primaire : `#2E7D32`
- Couleur secondaire : `#43A047`
- Police : **Inter** (Google Fonts)
- Border-radius cards : `12px`
- Border-radius boutons : `8px`
- Ombre : `0 2px 12px rgba(0,0,0,0.08)`
- Header pages admin : dégradé `#1B5E20 → #2E7D32`

## Note prototype
Le fichier `Portefolia - Refonte.html` est une maquette HTML/React standalone (design only),
pas le vrai codebase. Elle suit la même charte graphique pour servir de référence visuelle.
