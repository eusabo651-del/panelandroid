# PURPOU AUXÍLIO DE MIRA

Aplicação PWA em Next.js com validação de keys no servidor, painel administrativo e dados de licenças na MockAPI `androidkeys`.

## Fluxo do usuário

- Usuários entram com uma key validada no servidor e seguem para `/dashboard`.
- No primeiro login, a licença é vinculada ao identificador gerado localmente para o navegador/dispositivo. O prazo começa nessa primeira ativação.
- A tela **Conta** (`/conta`) mostra o nome associado à key, a própria key, o identificador local do dispositivo (HWID usado pelo painel), plano, datas e contagem regressiva até a expiração.
- O botão **Abrir Free Fire** permite escolher Free Fire Normal ou Free Fire MAX. No Android, tenta abrir o app selecionado e encaminha à página da Play Store correspondente se não estiver disponível.
- O convite do Discord fica na tela de login, no painel e na Conta.
- O aviso global publicado pelo admin aparece no login e nas telas dos usuários; as páginas consultam o aviso periodicamente.
- O ícone do PWA é um “A” com coroa, incluído em tamanhos Android e Apple.

## Painel administrativo

- O login usa a chave privada `RBXIS_ADMIN_KEY`; a sessão permanece em cookie `HttpOnly` assinado com `RBXIS_SESSION_SECRET`.
- O menu superior oferece **Licenças**, **Criar key** e **Configurações**.
- A administração de keys permite criar, listar, bloquear/reativar, desvincular e excluir licenças.
- Configurações registra os IPs vistos em logins administrativos bem-sucedidos e permite bloquear/liberar cada endereço. O bloqueio impede novos logins desse IP e invalida as sessões admin associadas. A API impede bloquear o último IP liberado.
- O aviso global pode ser publicado, atualizado ou removido pelas configurações.

## Dados internos de administração

Para não exigir outra base de dados, o painel guarda registros de controle ocultos dentro da coleção `androidkeys`:

- Os IPs são cifrados com AES-256-GCM usando uma chave derivada de `RBXIS_SESSION_SECRET`. O identificador do registro usa um hash do IP. Os registros internos não aparecem no CRUD de licenças.
- O texto do aviso é salvo em um registro separado porque é público por definição e precisa ser lido pelas telas do site.
- Não apague nem edite manualmente registros cuja key começa com `__PURPOU_SYSTEM_V1__`. Eles são usados para manter IPs bloqueados e o aviso global.
- Trocar `RBXIS_SESSION_SECRET` torna ilegíveis os registros de IP cifrados existentes e invalida as sessões assinadas; configure um segredo estável e mantenha-o guardado.

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

O endpoint da MockAPI é consultado pelo servidor Next.js; a URL, os registros internos e as operações administrativas não são chamados diretamente pelo navegador.
