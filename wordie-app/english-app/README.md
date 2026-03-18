# 📖 Wordie — Aprende inglés con IA

App móvil para aprender inglés con ejercicios adaptativos generados por IA (Groq + Llama 3.1).

## ✨ Características

- **Vocabulario y gramática** — ejercicios de selección múltiple, rellenar huecos y corrección de errores
- **Sistema adaptativo** — sube de nivel A1 → A2 → B1 → B2 → C1 según tu rendimiento
- **XP y racha** — gamificación para mantener la motivación
- **IA generativa** — ejercicios únicos cada sesión gracias a Groq (Llama 3.1-8B, gratis)
- **Diseño mobile-first** — pensada para usarse desde el móvil

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL + Auth)
- **IA**: Groq API (Llama 3.1-8B-instant, gratis)
- **Deploy**: Netlify (con Netlify Functions para proxy de Groq)

---

## 🚀 Configuración paso a paso

### 1. Clonar y preparar

```bash
git clone https://github.com/TU_USUARIO/wordie.git
cd wordie
npm install
```

### 2. Configurar Supabase

1. Ve a [app.supabase.com](https://app.supabase.com) y crea un proyecto nuevo
2. En **SQL Editor**, ejecuta todo el contenido de `supabase/schema.sql`
3. Ve a **Settings → API** y copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 3. Obtener API key de Groq

1. Ve a [console.groq.com](https://console.groq.com)
2. Crea una API key gratuita
3. Guárdala como `GROQ_API_KEY`

### 4. Variables de entorno locales

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

### 5. Desarrollo local

Para desarrollo local con Netlify Functions necesitas [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

Esto inicia la app en `http://localhost:8888` con las funciones activas.

> ⚠️ Si solo quieres probar el frontend sin funciones, usa `npm run dev` pero los ejercicios no funcionarán sin la función de Groq.

---

## 🌐 Deploy en Netlify desde GitHub

### Opción A: Interface web (recomendado)

1. Sube el proyecto a GitHub
2. Ve a [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Selecciona tu repositorio
4. En **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. En **Environment variables** añade:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   GROQ_API_KEY=gsk_...
   ```
6. Click **Deploy site** 🎉

### Opción B: Netlify CLI

```bash
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://xxxx.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJ..."
netlify env:set GROQ_API_KEY "gsk_..."
netlify deploy --prod
```

---

## 📁 Estructura del proyecto

```
wordie/
├── netlify/
│   └── functions/
│       └── generate-exercise.js   # Proxy seguro para Groq API
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Layout.jsx             # Navegación bottom bar
│   │   ├── LevelBadge.jsx         # Badge de nivel (A1-C1)
│   │   └── XPBar.jsx              # Barra de experiencia
│   ├── hooks/
│   │   ├── useAuth.js             # Autenticación Supabase
│   │   └── useProgress.js         # XP, nivel, historial
│   ├── lib/
│   │   ├── supabase.js            # Cliente Supabase
│   │   └── groq.js                # Helper Groq + constantes
│   ├── pages/
│   │   ├── Auth.jsx               # Login / Registro
│   │   ├── Home.jsx               # Dashboard
│   │   ├── Study.jsx              # Pantalla de ejercicios
│   │   └── Progress.jsx           # Estadísticas y progreso
│   ├── App.jsx                    # Router principal
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Estilos globales + Tailwind
├── supabase/
│   └── schema.sql                 # Schema de la BD
├── .env.example
├── netlify.toml
├── tailwind.config.js
└── vite.config.js
```

---

## 🎮 Sistema de progreso

| Nivel | Nombre | XP necesario |
|-------|--------|-------------|
| 1 | 🌱 A1 Principiante | 0 XP |
| 2 | 🌿 A2 Elemental | 100 XP |
| 3 | 🌳 B1 Intermedio | 300 XP |
| 4 | 🦅 B2 Avanzado | 600 XP |
| 5 | 👑 C1 Experto | 1000 XP |

- ✅ Respuesta correcta: **+10 XP**
- 🔥 Bonus por racha >2 días: **+2 XP** extra por acierto
- Sesiones de 10 ejercicios por defecto

---

## 🔒 Seguridad

- La API key de Groq nunca llega al navegador — se usa solo en Netlify Functions (servidor)
- Supabase RLS activado — cada usuario solo accede a sus propios datos
- Variables de entorno `VITE_` solo exponen URLs públicas de Supabase

---

## 📝 Notas

- El modelo usado es `llama-3.1-8b-instant` de Groq (rápido y gratuito)
- Los ejercicios se generan dinámicamente cada sesión — nunca son los mismos
- La app funciona completamente offline después de cargar (PWA-ready, pero sin service worker configurado)
