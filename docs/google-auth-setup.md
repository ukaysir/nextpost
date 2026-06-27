# Google 로그인 설정

NEXTPOST 앱 코드는 Supabase OAuth로 Google 로그인을 시작합니다. Supabase 프로젝트에서 Google provider가 켜져 있어야 실제 Gmail 로그인이 완료됩니다.

## 현재 프로젝트 값

- Supabase project URL: `https://ffbnlmdzzcjrcevmejzf.supabase.co`
- Production site URL: `https://nextpost-wine.vercel.app`
- App callback URL: `https://nextpost-wine.vercel.app/auth/callback`
- Google Cloud authorized redirect URI: `https://ffbnlmdzzcjrcevmejzf.supabase.co/auth/v1/callback`

## Supabase Dashboard 설정

1. Supabase Dashboard에서 프로젝트 `ffbnlmdzzcjrcevmejzf`를 엽니다.
2. `Authentication` -> `Providers` -> `Google`로 이동합니다.
3. `Enable Sign in with Google`을 켭니다.
4. Google Cloud OAuth에서 발급한 `Client ID`, `Client Secret`을 입력합니다.
5. `Authentication` -> `URL Configuration`에서 Site URL을 `https://nextpost-wine.vercel.app`로 설정합니다.
6. Additional Redirect URLs에 `https://nextpost-wine.vercel.app/auth/callback`을 추가합니다.

## Google Cloud 설정

Google Cloud Console의 OAuth Client 설정에서 Authorized redirect URIs에 아래 값을 추가합니다.

```text
https://ffbnlmdzzcjrcevmejzf.supabase.co/auth/v1/callback
```

## 검증

```bash
npm run auth:google:check
```

성공하면 `Google provider enabled: yes`가 표시됩니다. `no`가 나오면 Supabase provider가 아직 꺼져 있는 상태입니다.
