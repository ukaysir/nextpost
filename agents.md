# NEXTPOST Agents Guide

## Project
- NEXTPOST is a Next.js 16 app for Korean defense-career analysis.
- Main stack: Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, OpenAI API.
- Production URL: `https://nextpost-wine.vercel.app`
- Project path: `C:\Users\User\Downloads\nextpost (2)`

## Commands
- Install dependencies: `npm install`
- Development server: `npm run dev`
- Type check: `npm run typecheck`
- Production build: `npm run build`
- Lint: `npm run lint`
- Deploy production: `vercel --prod --yes`

## Data And APIs
- Supabase data is loaded through `lib/runtime-data.ts` and related helpers.
- OpenDART enrichment scripts live in `scripts/` and generated SQL files live in `supabase/`.
- Do not commit or print secrets from `.env.local`, Supabase auth tokens, Vercel tokens, or API keys.
- Chat and analysis requests run on the server through OpenAI API using `OPENAI_API_KEY`.

## Important App Areas
- Landing page: `app/page.tsx`
- About page: `app/about/page.tsx`
- Analyze form: `app/analyze/page.tsx`, `components/analyze-form.tsx`
- Results dashboard: `app/results/page.tsx`, `components/results-dashboard.tsx`
- Chat panel: `components/data-chat.tsx`
- Analysis logic: `lib/analysis.ts`
- Shared types: `lib/types.ts`
- Supabase schema and enrichment SQL: `supabase/`

## Development Rules
- Before editing, inspect the existing pattern and keep changes scoped.
- Use `apply_patch` for manual file edits.
- Run `npm run typecheck` and `npm run build` before deployment.
- Do not delete generated data, seed data, SQL enrichment files, or user-provided reference documents unless the user explicitly approves the exact deletion list.
- Keep Korean UI text in UTF-8. PowerShell may display mojibake, so verify actual file content with Node or build output if needed.
- Avoid exposing raw AI provider JSON in UI. Use text extraction helpers before rendering chat responses.

## Deployment Checklist
1. `npm run typecheck`
2. `npm run build`
3. `vercel --prod --yes`
4. Confirm the production alias is attached to `https://nextpost-wine.vercel.app`
5. Smoke-test changed pages with `Invoke-WebRequest` or browser verification.
