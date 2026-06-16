Déploiement du frontend sur Render

1) Créer un nouveau service Static Site sur Render
   - Connectez votre dépôt GitHub/GitLab
   - Pour `Build Command` mettez : `npm run build`
   - Pour `Publish Directory` mettez : `dist`

2) Variables d'environnement
   - Ajoutez `VITE_API_BASE` avec la valeur : `https://backennfc.onrender.com`
   - Si vous voulez permettre l'accès en local, gardez vos valeurs locales dans `.env.local` (ne pas committer)

3) Commandes utiles en local
   - Builder :
```bash
npm install
npm run build
```
   - Servir localement le dossier `dist` pour vérification :
```bash
npx serve -s dist -l 5000
```

4) Notes
   - Le frontend en production appellera l'URL définie dans `VITE_API_BASE`. Si elle est vide, le code utilise `https://backennfc.onrender.com` par défaut.
   - Assurez-vous que votre backend autorise l'origine du frontend via CORS (par ex. `https://frontend-nfc.vercel.app` ou le domaine Render si vous le déployez là-bas). Voir `backend/src/index.js`.
