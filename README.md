# PlanNexus

App web para organizar festas e eventos: cada usuário cria seus eventos e, dentro de cada um, controla **tarefas** e o **calendário** de compromissos. Feito com HTML, CSS e JavaScript puro + Firebase (Authentication e Firestore).

## Como rodar

Abra o `index.html` no navegador (funciona com dois cliques ou pelo *Live Server* do VS Code).

O **login com Google** só funciona em endereços autorizados no Firebase — então, para ele, use o Live Server (`localhost` já vem liberado). Login com e-mail e senha funciona dos dois jeitos.

## Estrutura de pastas

```
Plannexus/
├── index.html              → carrossel de boas-vindas (primeira página)
├── login.html              → login (e-mail/senha ou Google)
├── cadastro.html           → criar conta
├── inicio.html             → lista de eventos do usuário
├── criarEvento.html        → formulário de novo evento
├── evento.html             → página do evento (atalhos p/ calendário e tarefas)
├── calendario.html         → compromissos do evento (?id=ID_DO_EVENTO)
├── tarefas.html            → tarefas do evento    (?id=ID_DO_EVENTO)
├── perfilPessoal.html      → perfil e botão Sair
│
├── admin.html              → login do administrador
├── indexAdmin.html         → início do administrador
├── criarEventoAdmin.html
├── perfilPessoalAdmin.html
│
├── css/                    → um arquivo de estilo por página (style.css = index)
├── js/
│   ├── config.js           → configuração do Firebase (ÚNICO lugar com as chaves)
│   └── utils.js            → funções comuns (formatar data, pegar ?id=, exigir login...)
├── fotos/                  → logo, mascote e fundos
└── firestore.rules         → regras de segurança do banco
```

## Banco de dados (Firestore)

```
usuarios/{uid}                       nome, email, foto, criadoEm
eventos/{eventoId}                   nome, categoria, data, horario, local,
                                     convidados, orcamento, descricao, usuarioId, criadoEm
eventos/{eventoId}/tarefas/{id}      titulo, descricao, data, prioridade (alta|media|baixa),
                                     concluida (true/false), criadoEm
eventos/{eventoId}/calendario/{id}   titulo, data, horario, descricao, criadoEm
```

Datas são salvas como texto `AAAA-MM-DD` (o formato do `<input type="date">`) e mostradas na tela como `DD/MM/AAAA`.

## Regras do Firestore

Publique o conteúdo de `firestore.rules` em **Console do Firebase → Firestore Database → Regras**. As regras de `eventos` não valem automaticamente para as subcoleções `tarefas` e `calendario` — sem essa parte as duas páginas dão erro de permissão.

## Pendências

- `Controle Financeiro` e o card "bla bla" na página do evento ainda não têm página.
- O acesso de admin é verificado só pelo e-mail no navegador; para valer de verdade a checagem precisa estar nas regras do Firestore (já está em `firestore.rules`).
