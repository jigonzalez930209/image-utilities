# Image Tools (React + TypeScript + Vite)

Conversión de imágenes y eliminación de fondos con IA en el navegador (Magick WASM, @imgly/background-removal, RMBG-1.4).

## Despliegue en GitHub Pages (todo estático)

La app está preparada para publicarse como **página estática en GitHub Pages**, con todos los assets (modelos IA incluidos) servidos desde el mismo origen.

1. **En el repo**: Settings → Pages → Source: **GitHub Actions**.
2. Cada push a `main` ejecuta el workflow **Deploy to GitHub Pages**:
   - Instala dependencias
   - Ejecuta `pnpm run download:bg` (descarga ~280 MB de modelos a `public/`)
   - Hace `pnpm run build` (el `dist` incluye la app y `assets/background-removal/`)
   - Despliega el contenido de `dist` a GitHub Pages

La URL quedará en `https://<usuario>.github.io/image-utilities/` (o el nombre de tu repo). Los modelos no se suben al repo (están en `.gitignore`); se descargan en CI en cada build.

## Desarrollo local

Los modelos **Express**, **Medium** y **Pro** se sirven desde `public/assets/background-removal/`. **Una vez** en tu máquina:

```bash
pnpm run download:bg
pnpm dev
```

El modelo **Ultra** (RMBG-1.4) se carga bajo demanda desde Hugging Face.

---

*This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.*

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
