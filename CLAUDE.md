# manolo-costeo

> Migrado al meta-repo el 2026-05-09. CLAUDE.md por completar al trabajar en él.
> **Naturaleza**: demo / prueba técnica. Sin cliente real.

## Qué es

App de costeo (planilla de costos fijos). Originalmente nació como prueba técnica — no tiene cliente productivo asignado.

## Stack

- **Framework**: Next.js + TypeScript
- **DB**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **LLM**: Anthropic SDK directo (`@anthropic-ai/sdk`)

## Estado actual

- **Funcionando**: por completar.
- **Disposición**: demo, si falla puede rehacerse o corregirse sin impacto en clientes reales.

## Notas

- `package.json` `name` es `"cafe-gastos"` (no coincide con el slug del proyecto). Probable fork/rebrand. Revisar.

---

*Última actualización: 2026-05-09 (creación post-migración).*


---

## Contexto de sesión

`SESSION.md` en la raíz del proyecto. Leerlo al iniciar sesión antes de cualquier otra cosa y confirmar al usuario en qué estamos. Claude lo actualiza automáticamente al cerrar sesión.
