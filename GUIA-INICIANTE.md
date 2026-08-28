# 📖 Guia Passo a Passo para Iniciantes

**EstudaAí — do zero até o ar na internet**

Você nunca usou GitHub, Turso ou Vercel? **Sem problema.** Este guia foi escrito
para você. Tudo aqui é por **interface web (cliques)** — você só precisa saber
usar o navegador.

⏱️ **Tempo total:** ~30 minutos
💰 **Custo:** R$ 0 (tudo grátis)
🎯 **Resultado:** seu app com URL pública (ex: `estudaai.vercel.app`)

---

## 📋 O que vamos fazer (visão geral)

1. **Baixar** o projeto (um arquivo zip)
2. **Criar conta no GitHub** e enviar o código pra lá
3. **Criar conta no Turso** (banco de dados online grátis)
4. **Criar conta na Vercel** e publicar o app

No final, você terá um link público para acessar de qualquer lugar 🚀

---

## ✅ Antes de começar, tenha em mãos

- Seu e-mail
- Uma senha que você vai usar nas 3 contas (pode ser a mesma)
- O navegador aberto

---

## ETAPA 1 — Baixar o projeto (2 min)

1. No **Painel de Pré-visualização** (à direita), procure pela pasta
   **`download`**.
2. Dentro dela há um arquivo chamado **`estudaai.zip`**.
3. Clique nele para baixar no seu computador.
4. **Descompacte** o zip (clique com botão direito → "Extrair" ou
   "Extrair tudo"). Vai criar uma pasta chamada `estudaai-clean`.

> 💡 Guarde essa pasta. Você vai precisar dela na Etapa 2.

---

## ETAPA 2 — GitHub: criar conta e enviar o código (10 min)

O GitHub é como um "Google Drive para código". É onde o código do seu app vai
ficar guardado, para a Vercel poder acessá-lo depois.

### 2.1 Criar conta no GitHub

1. Acesse **https://github.com/signup**
2. Digite seu **e-mail** → clique "Continue"
3. Crie uma **senha** → clique "Continue"
4. Escolha um **nome de usuário** (ex: `joaosilva`) → clique "Continue"
5. Digite `n` (não) quando perguntar sobre anúncios por e-mail → "Continue"
6. **Resolva o puzzle** de verificação (clique nas imagens pedidas)
7. Vai chegar um **código no seu e-mail** → digite o código → "Verify"

✅ Pronto! Conta criada.

### 2.2 Criar um repositório (pasta do projeto)

1. No GitHub, clique no ícone **"+"** no canto superior direito →
   **"New repository"**
2. Em **"Repository name"**, digite: `estudaai`
3. Em **"Description"** (opcional), digite: `Gerenciador de tarefas acadêmico`
4. Selecione **"Public"** (para a Vercel poder acessar grátis)
5. **NÃO** marque nenhuma caixa (não add README, não add .gitignore, não add
   license) — deixe tudo vazio
6. Clique no botão verde **"Create repository"**

✅ Vai aparecer uma página com instruções. **Pode ignorá-las** — vamos usar o
GitHub Desktop (mais fácil).

### 2.3 Instalar o GitHub Desktop

O GitHub Desktop é um programinha gratuito que deixa você enviar arquivos para
o GitHub arrastando e soltando (sem digitar comandos).

1. Acesse **https://desktop.github.com**
2. Clique no botão roxo **"Download for Windows"** (ou Mac, conforme seu
   sistema)
3. **Instale** o programa (próximo, próximo, concluir)
4. Abra o **GitHub Desktop**
5. Na tela inicial, clique em **"Sign in to GitHub.com"**
6. Digite seu e-mail e senha do GitHub → "Sign in"
7. Preencha seu nome e e-mail quando pedir → "Finish"

✅ GitHub Desktop instalado e conectado à sua conta!

### 2.4 Enviar o projeto para o GitHub

1. No GitHub Desktop, clique em **"File"** (canto superior esquerdo) →
   **"Add local repository..."**
2. Em **"Local path"**, clique em **"Choose..."** e selecione a pasta
   `estudaai-clean` (aquela que você descompactou na Etapa 1)
3. Clique em **"Add repository"**

> ⚠️ Pode aparecer um aviso "This directory does not appear to be a Git
> repository". Se aparecer, clique em **"create a repository here"** e depois
> em **"Create repository"**.

4. Agora você vê a lista de arquivos do projeto. No campo **"Summary"**
   (canto inferior esquerdo), digite: `Projeto inicial`
5. Clique no botão azul **"Commit to main"**
6. Agora clique em **"Publish repository"** (ou "Publish branch")
7. **NÃO** marque "Keep this code private" (deixe público para a Vercel)
8. Clique em **"Publish repository"**

✅ Seu código está no GitHub! Para conferir, vá em
**https://github.com/SEU_USUARIO/estudaai** — você vai ver todos os arquivos.

---

## ETAPA 3 — Turso: criar o banco de dados online (7 min)

O Turso guarda os dados do seu app (tarefas, disciplinas, etc.) na nuvem, de
graça. É como um "SQLite que funciona na internet".

### 3.1 Criar conta no Turso

1. Acesse **https://turso.tech**
2. Clique em **"Start free"** (ou "Sign up") no canto superior direito
3. Clique em **"Sign in with GitHub"** (usa a mesma conta que você criou!)
4. Autorize o Turso a acessar seu GitHub → clique **"Authorize"**
5. Preencha seu **nome** e clique em **"Continue"**
6. Pode pular o questionário (clique em "Skip" ou nas opções qualquer uma)

✅ Conta criada!

### 3.2 Criar o banco de dados

1. No painel do Turso, clique no botão **"New database"** (ou "+ Create
   database")
2. Em **"Database name"**, digite: `estudaai`
3. Em **"Location"**, escolha a mais próxima de você (ex: `nrt1` para Japão,
   `ams1` para Europa, `sfo1` para EUA oeste)
4. Clique em **"Create database"**

✅ Banco criado! Vai aparecer na lista.

### 3.3 Criar as tabelas (MUITO IMPORTANTE)

Agora precisamos "explicar" ao banco quais tabelas ele deve ter (Disciplinas,
Tarefas, Links, etc.). Para isso, vamos colar um comando SQL pronto.

1. Na lista de databases, **clique em `estudaai`**
2. No menu superior, clique em **"SQL Shell"** (ou "Console" ou "Query")
3. Você vai ver um editor de texto em branco
4. **Abra o arquivo `turso-schema.sql`** (que está dentro da pasta
   `estudaai-clean` que você baixou) com o Bloco de Notas
5. **Selecione todo o texto** (Ctrl+A) e **copie** (Ctrl+C)
6. **Cole** no editor do Turso (Ctrl+V)
7. Clique no botão **"Run"** (ou "Execute")

✅ Se aparecer "Query executed successfully" (ou sem mensagem de erro), as 6
tabelas foram criadas!

### 3.4 Pegar as credenciais (vai usar na Etapa 4)

Precisamos de duas informações para conectar a Vercel ao Turso:

**A URL do banco:**
1. Na página do banco `estudaai`, procure por **"Database URL"** ou clique em
   **"Settings"**
2. Vai ter um endereço tipo: `libsql://estudaai-seunome.turso.io`
3. **Copie** esse endereço e **guarde** (cole num bloco de notas)

**O token de acesso:**
1. Ainda no banco `estudaai`, clique em **"Settings"** → **"Access tokens"**
   (ou clique em "Create token")
2. Clique em **"Generate token"** (ou "Create new token")
3. Vai aparecer um código longo tipo: `eyJhbGciOi...` (muito comprido)
4. **COPIE IMEDIATAMENTE** e **guarde** — ele só aparece uma vez!

> ⚠️ Guarde esses dois valores (URL e token) em um bloco de notas. Você vai
> usar na Etapa 4.

---

## ETAPA 4 — Vercel: publicar o app na internet (8 min)

A Vercel pega o código do GitHub e o transforma em um site público, de graça.

### 4.1 Criar conta na Vercel

1. Acesse **https://vercel.com**
2. Clique em **"Sign Up"** (canto superior direito)
3. Clique em **"Continue with GitHub"** (mesma conta do GitHub!)
4. Autorize a Vercel → clique em **"Authorize Vercel"**
5. Preencha seu nome → "Continue"
6. Se perguntar sobre um projeto, **pule** ("Skip")

✅ Conta criada!

### 4.2 Importar o projeto do GitHub

1. No painel da Vercel, clique em **"Add New..."** → **"Project"**
2. Você verá a lista dos seus repositórios do GitHub. Procure por **`estudaai`**
3. Clique em **"Import"** ao lado dele

### 4.3 Configurar o deploy

**NÃO clique em Deploy ainda!** Precisamos adicionar as variáveis de ambiente
(o banco de dados).

1. Na página de configuração, role para baixo até ver **"Environment Variables"**
2. Clique nele para expandir

**Adicionar a primeira variável (URL do banco):**
3. Em **"Key"**, digite: `DATABASE_URL`
4. Em **"Value"**, cole a **URL do Turso** (aquela tipo
   `libsql://estudaai-seunome.turso.io` que você copiou na Etapa 3.4)
5. Clique em **"Add"**

**Adicionar a segunda variável (Token de acesso):**
6. Em **"Key"**, digite: `DATABASE_AUTH_TOKEN`
7. Em **"Value"**, cole o **token** (aquele código longo `eyJhbGciOi...`)
8. Clique em **"Add"**

✅ Duas variáveis adicionadas. Agora sim!

### 4.4 Publicar!

1. Clique no botão azul **"Deploy"**
2. **Aguarde** ~2-3 minutos. Vai aparecer uma animação de foguete 🚀
3. Quando aparecer um **confete** e a mensagem "Congratulations!", está pronto!
4. Clique em **"Visit"** para ver seu app no ar!

✅🎉 **PARABÉNS!** Seu app está publicado na internet, com URL tipo:
`https://estudaai.vercel.app` (ou parecido)

---

## 🎯 Depois de publicar

### Adicionar dados de exemplo
Quando abrir seu app pela primeira vez, vai estar vazio. Aparecerá um banner
**"Criar dados de exemplo"** — clique nele para preencher com disciplinas e
tarefas de demonstração.

### Compartilhar com amigos
Mande o link (`https://estudaai-xxxx.vercel.app`) para qualquer pessoa. Ela
vai ver o MESMO conteúdo que você (neste momento o app não tem sistema de
login — todo mundo vê e edita os mesmos dados).

> 💡 No futuro, dá pra adicionar sistema de login (cada estudante com suas
> tarefas). É uma evolução natural.

### Atualizar o app (se eu fizer mudanças pra você)
Se eu alterar o código aqui e você quiser a nova versão no ar:
1. Baixe o novo zip e substitua os arquivos na pasta `estudaai-clean`
2. Abra o **GitHub Desktop**
3. Ele vai mostrar os arquivos modificados
4. Digite algo em "Summary" (ex: "atualização") → **"Commit to main"**
5. Clique em **"Push origin"** (canto superior)
6. A Vercel atualiza **sozinha** em ~1 minuto! 🔄

---

## 🆘 Deu erro? Veja aqui

**"Build failed" na Vercel**
→ Veja os detalhes: clique no deploy que falhou → "Build Logs". O erro mais
comum é esquecer de adicionar as variáveis de ambiente (Etapa 4.3).

**App abre mas aparece erro de banco de dados**
→ Você esqueceu de criar as tabelas no Turso (Etapa 3.3). Volte lá e cole o
SQL.

**Não lembro o token do Turso**
→ Tokens não podem ser recuperados. Crie um novo: Turso → seu banco →
Settings → Access tokens → Generate new token. Depois atualize a variável
na Vercel: Settings → Environment Variables → edite `DATABASE_AUTH_TOKEN`.

**Onde encontro minha URL do app?**
→ vercel.com → seu projeto → no topo aparece a URL (ex:
`estudaai.vercel.app`)

---

## 📞 Resumo das suas contas

| Serviço | Para que serve | Login |
|---------|---------------|-------|
| **GitHub** | Guardar o código | github.com |
| **Turso** | Banco de dados online | turso.tech (com GitHub) |
| **Vercel** | Hospedar o site | vercel.com (com GitHub) |

As três são **grátis** e se conectam entre si. Você só precisa manter as
senhas e os tokens em segurança.

---


---

## 📱 Instalar no celular (PWA)

Depois que o app estiver no ar, você pode instalá-lo como um app nativo no
celular ou desktop — sem precisar de loja de apps!

### No Android (Chrome)
1. Abra a URL do app no Chrome
2. Faça login
3. O Chrome vai mostrar um banner **"Instalar EstudaAí"** — toque em **Instalar**
4. Se o banner não aparecer, toque no menu (3 pontos) → **"Instalar aplicativo"**
5. Pronto! Ícone aparece na tela inicial, abre em tela cheia

### No iPhone/iPad (Safari)
1. Abra a URL no Safari
2. Faça login
3. Toque no botão **Compartilhar** (quadrado com seta para cima)
4. Role e toque em **"Adicionar à Tela de Início"**
5. Toque em **Adicionar** — ícone aparece na tela inicial

### No Desktop (Chrome/Edge)
1. Abra a URL e faça login
2. Clique no ícone de **instalar** na barra de endereço (à direita)
3. Ou clique no menu → **"Instalar EstudaAí..."**
4. O app abre em janela própria, como um programa

### O que você ganha instalando
- ✅ **Ícone na tela inicial** — acesso rápido como um app
- ✅ **Tela cheia** — sem barra do navegador
- ✅ **Funciona offline** — dados já carregados ficam disponíveis sem internet
- ✅ **Atalhos** (Android): pressione longamente o ícone para ver Calendário,
  Nova tarefa e Pomodoro
- ✅ **Notificações** — lembretes funcionam mesmo com o app em background

> 💡 As atualizações do app aparecem automaticamente — você não precisa
> "atualizar" nada, é só abrir e usar.


---

## 🔐 Login com Google (OPCIONAL)

Seu app já funciona com login por e-mail + senha. Mas você pode **adicionar
"Entrar com Google"** para deixar o acesso mais fácil (o usuário não precisa
decorar senha).

### Passo 1 — Criar projeto no Google Cloud Console

1. Acesse **https://console.cloud.google.com**
2. Faça login com sua conta Google
3. No topo, clique no seletor de projeto → **"Novo projeto"**
4. Nome: `estudaai` → **Criar**
5. Aguarde ~30s, depois selecione o projeto

### Passo 2 — Configurar a tela de consentimento

1. No menu lateral esquerdo: **APIs & Services → OAuth consent screen**
2. Escolha **External** (se perguntar) → **Criar**
3. Preencha:
   - **App name**: `EstudaAí`
   - **User support email**: seu e-mail
   - **Developer contact**: seu e-mail
4. **Salvar e continuar**
5. **Scopes**: clique "Add or Remove Scopes" → marque:
   - `userinfo.email` (e-mail)
   - `userinfo.profile` (nome)
   - **Salvar e continuar**
6. **Test users**: adicione seu e-mail → **Salvar e continuar**

### Passo 3 — Criar credenciais OAuth

1. No menu lateral: **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth client ID**
3. **Application type**: `Web application`
4. **Name**: `EstudaAí Web`
5. **Authorized redirect URIs** — adicione DUAS URLs:
   - `http://localhost:3000/api/auth/callback/google` (para dev)
   - `https://SUA-URL-NA-VERCEL.vercel.app/api/auth/callback/google` (produção)
6. **Criar**
7. Vai aparecer um popup com **Client ID** e **Client Secret** — **copie os dois**

### Passo 4 — Adicionar variáveis na Vercel

1. Vá na Vercel: seu projeto → **Settings → Environment Variables**
2. Adicione:
   - **Key**: `GOOGLE_CLIENT_ID` → **Value**: cole o Client ID
   - **Key**: `GOOGLE_CLIENT_SECRET` → **Value**: cole o Client Secret
3. **Deployments → "..." → Redeploy** (para aplicar)

### Passo 5 — Testar

1. Acesse sua URL do app
2. Na tela de login, vai aparecer **"Entrar com Google"** no topo
3. Clique → autorize → pronto! 🎉

> 💡 Se o usuário nunca logou com senha, o login Google **cria a conta
> automaticamente** na primeira vez. Se já tem conta com o mesmo e-mail, ele
> entra na conta existente (dados são unificados por e-mail).

> ⚠️ **Importante:** se você não configurar o Google, o botão aparece mas não
> funciona (não redireciona). O login por senha continua 100% funcional.

**Precisa de ajuda com algum passo específico?** Me diga qual etapa travou e
eu te ajudo a destravar! 👍
