# Relatorio de preparacao para deploy na Vercel

## Diagnostico

- Framework identificado: site estatico em HTML/CSS/JavaScript puro.
- Arquivo principal: `index.html`.
- Nao ha Next.js, React, Vite, backend Node.js ou dependencias de runtime.
- Versao de Node recomendada: `24.x`, que e a versao padrao atual disponivel na Vercel.
- Variaveis de ambiente necessarias: nenhuma.

## Problemas encontrados

### Ausencia de `package.json`

Os comandos npm solicitados falhavam porque o projeto nao possuia `package.json`.

Log original:

```text
npm error code ENOENT
npm error syscall open
npm error path C:\Users\muril\Documents\Parking-Spaces\package.json
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

### Ausencia de build configurado para Vercel

O repositorio tinha apenas arquivos estaticos na raiz. Embora a Vercel consiga servir arquivos estaticos, faltava uma saida de build clara e reproduzivel.

### Ausencia de validacao local

Nao havia scripts de `build`, `lint` ou `test`, entao nao existia um caminho padrao para validar HTML, anchors e referencias locais antes do deploy.

## Correcoes realizadas

- Criado `package.json` com scripts `build`, `lint` e `test`.
- Criado `package-lock.json` com instalacao npm sem dependencias externas.
- Criado `scripts/build-static.mjs` para:
  - validar estrutura basica do `index.html`;
  - validar charset, viewport e titulo;
  - validar anchors internas;
  - validar referencias locais;
  - detectar caminhos com barras invertidas;
  - detectar problemas de case sensitivity que poderiam falhar no Linux;
  - gerar a pasta `dist` com `index.html` e `404.html`.
- Criado `vercel.json` para:
  - rodar `npm run build`;
  - publicar `dist`;
  - aplicar fallback para `index.html`.
- Criado `.gitignore` para evitar commit de `node_modules`, `dist`, `.vercel` e arquivos temporarios locais.
- Criado `.gitattributes` para normalizar arquivos de texto com LF no repositorio e reduzir diferencas entre Windows e Linux.

## Arquivos modificados/adicionados

- `.gitignore`
- `.gitattributes`
- `DEPLOYMENT_REPORT.md`
- `package-lock.json`
- `package.json`
- `scripts/build-static.mjs`
- `vercel.json`

## Dependencias

- Dependencias adicionadas: nenhuma.
- Dependencias removidas: nenhuma.
- Vulnerabilidades npm encontradas: nenhuma.

## Validacoes locais

```text
npm install
up to date, audited 1 package
found 0 vulnerabilities
```

```text
npm run build
[build] Static site written to dist
```

```text
npm run lint
[check] Static site validation passed.
```

```text
npm run test
[check] Static site validation passed.
```

## Deploy na Vercel

- Projeto Vercel criado: `parking-spaces`.
- Deploy de producao concluido com status `Ready`.
- URL de producao: `https://parking-spaces.vercel.app`.
- URL tecnica do deployment: `https://parking-spaces-fc59ozbnl-murilomoncao7-cryptos-projects.vercel.app`.
- Verificacao HTTP: `200 OK`.

### Erro de nome do projeto

A primeira tentativa de deploy usou o nome inferido da pasta local (`Parking-Spaces`) e falhou porque a Vercel exige nomes de projeto em minusculo.

Log:

```text
Error: Project names can be up to 100 characters long and must be lowercase.
They can include letters, digits, and the following characters: '.', '_', '-'.
```

Resolucao:

```text
vercel projects add parking-spaces
vercel link --yes --project parking-spaces
```

### Conexao Git na Vercel

A tentativa de conectar o projeto Vercel diretamente ao repositorio GitHub falhou por permissao/acesso da conta Vercel ao repositorio.

Log:

```text
Error: Failed to connect leomunhoz1/Parking-Spaces to project.
Make sure there aren't any typos and that you have access to the repository if it's private.
```

Resolucao aplicada:

- A branch `fix/vercel-deployment` foi enviada para o GitHub.
- O deploy de producao foi realizado pela Vercel CLI a partir da branch local.
- Para habilitar deploys automaticos por push no GitHub, a conta/organizacao correta precisa autorizar o Vercel GitHub App para `leomunhoz1/Parking-Spaces` no dashboard da Vercel.

## Instrucoes para futuros deploys

1. Alterar os arquivos do site, principalmente `index.html`.
2. Rodar `npm install` se o lockfile mudar.
3. Rodar `npm run build`.
4. Rodar `npm run lint`.
5. Rodar `npm run test`.
6. Fazer commit e push.
7. Enquanto a conexao Git nao estiver autorizada na Vercel, publicar com `vercel --prod`.
8. Depois que o Vercel GitHub App for autorizado para o repositorio, a Vercel fara novo deploy automaticamente quando a branch conectada receber push.
