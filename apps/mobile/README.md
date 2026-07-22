# apps/mobile

App React Native (entra depois do MVP web estar validado).

Vai consumir a **mesma API** (`apps/api`) que o web, reaproveitando os tipos
de `packages/shared`. Sugestão: iniciar com Expo

```bash
npx create-expo-app@latest . --template
```

Reaproveite `packages/shared` para tipos e enums, e replique a lógica de
`apps/web/src/lib/api.ts` (trocando localStorage por AsyncStorage/SecureStore).
