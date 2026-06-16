Deployment notes for Vercel

1) Build command
   npm run vercel-build

2) Output directory
   dist

3) Environment variables
   - Set the Vite prefixed vars in Vercel dashboard (VITE_API_BASE, VITE_CLOUDINARY_UPLOAD_URL, VITE_CLOUDINARY_UPLOAD_PRESET)
   - Add any backend API credentials separately in the backend project or as Vercel environment variables if hosting the backend on Vercel as well.

4) SPA routing
   - `vercel.json` includes a route that rewrites all paths to `/index.html` so client-side routing works.

5) Backend
   - If you deploy the backend separately, set `VITE_API_BASE` to the backend's public URL.

6) Static assets
   - If you upload images directly to Cloudinary from the frontend, ensure `VITE_CLOUDINARY_UPLOAD_URL` and `VITE_CLOUDINARY_UPLOAD_PRESET` are configured.

7) Troubleshooting
   - If your build fails, check the Vercel build logs and ensure Node & npm versions are compatible with Vite.
