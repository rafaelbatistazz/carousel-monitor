# Carousel Monitor

Scaffold inicial de um dashboard com **Next.js 14 + TypeScript + Tailwind CSS** para monitorar conteúdos e scripts.

## Páginas incluídas

- `/` → visão geral com cards mock de métricas (extraídos, criados, postados, pendentes)
- `/conteudos` → lista básica de conteúdos monitorados
- `/scripts` → status de scripts/jobs

## Requisitos

- Node.js 18.17+ (recomendado 20+)
- npm

## Comandos

```bash
npm install
npm run dev
```

Aplicação em desenvolvimento: `http://localhost:3000`

```bash
npm run build
npm run start
```

## Estrutura mínima

- `app/layout.tsx`
- `app/page.tsx`
- `app/conteudos/page.tsx`
- `app/scripts/page.tsx`
- `components/sidebar.tsx`
- `lib/types.ts`
