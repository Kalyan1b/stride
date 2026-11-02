// Public assets must follow Vite's base path on repository-hosted GitHub Pages.
export function publicAsset(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
