## Goal
Allow installing the Admin area as its own PWA on iOS that opens directly on `/admin` — separate icon, name, and start URL from the user app.

## Changes

### 1. New file: `public/manifest-admin.webmanifest`
Static manifest mirroring the user manifest but with admin-specific values:
- `name`: "SheX Admin"
- `short_name`: "SheX Admin"
- `start_url`: "/admin"
- `id`: "/admin"
- `scope`: "/admin"
- `display`: "standalone"
- `theme_color` / `background_color`: "#0a0a0a"
- Icons: reuse `/pwa-192.png` and `/pwa-512.png` for now (user can supply a distinct admin icon later if wanted)

### 2. `index.html`
Add a tiny inline script in `<head>` that runs **before** anything else and swaps the manifest link + Apple meta tags when the path starts with `/admin`:
- Replace `<link rel="manifest" href="/manifest.webmanifest">` with `/manifest-admin.webmanifest`
- Update `apple-mobile-web-app-title` to "SheX Admin"
- (Optional) swap `apple-touch-icon` if a separate icon is added later

This way Safari sees the correct manifest at "Add to Home Screen" time depending on which page the user installs from.

### 3. `vite.config.ts`
No change to the existing VitePWA `manifest` block (stays `/dashboard`). The second manifest is a static file in `public/` and is served as-is — VitePWA does not need to know about it. The injected service worker continues to handle both scopes.

### 4. Note on existing installs
The current homescreen icon on the user's iPhone has `start_url: "/dashboard"` baked in and cannot be updated. They must:
1. Delete the existing icon
2. Open `/admin` in Safari → Share → Add to Home Screen → gets "SheX Admin" with `/admin` start URL
3. Open `/dashboard` in Safari → Share → Add to Home Screen → gets "SheX 💛" with `/dashboard` start URL

Result: two separate apps on the homescreen, each opening on its intended page.

## Files touched
- `public/manifest-admin.webmanifest` (new)
- `index.html` (small inline script + conditional manifest link)
