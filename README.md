# PURPOU AUXÍLIO DE MIRA

Aplicação PWA em Next.js com validação de keys no servidor e painel administrativo de licenças.

## Fluxo

- Usuários entram com uma key salva na coleção MockAPI `androidkeys`. Após validar, são direcionados para `/dashboard`.
- No primeiro login, a licença é vinculada ao identificador local do dispositivo. O prazo começa nessa primeira ativação.
- A opção **Acesso administrativo** autentica a área `/admin` com a variável privada `RBXIS_ADMIN_KEY`.
- A sessão é mantida em cookie `HttpOnly`, assinado no servidor usando `RBXIS_SESSION_SECRET`.
- O painel admin cria, lista, bloqueia/reativa, desvincula e exclui registros da mesma coleção.
- Os módulos da tela original (`Remover Tremedeira`, `Estabilizar Mira`, `Sensi Sem Congelamento` e `Clean`) persistem seus flags no registro da key.

## Variáveis de ambiente

Configure na Vercel (Production, Preview e Development):

- `RBXIS_ADMIN_KEY`: chave administrativa privada, definida pelo proprietário do projeto.
- `RBXIS_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres (64 hex recomendado).
- `MOCKAPI_KEYS_URL`: `https://6ac92b96fd7c536b1bda8e99.mockapi.io/androidkeys`.

Não salve valores reais de segredos no Git. Depois de alterar variáveis de ambiente na Vercel, faça um novo deployment para que as funções recebam os valores.

Para desenvolvimento local, copie `.env.example` para `.env.local` e substitua os valores de exemplo por segredos locais. O arquivo `.env.local` está ignorado pelo Git.

## Desenvolvimento e validação

```bash
npm ci
npm run dev
npm run typecheck
npm run build
```

O endpoint da MockAPI é consultado pelo servidor Next.js; a URL e as operações de administração não são chamadas diretamente pelo navegador.
