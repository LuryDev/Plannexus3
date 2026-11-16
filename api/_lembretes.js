// ==========================================================
//  Regras dos lembretes por data (sem Firebase, fácil de testar).
//  Usado por /api/lembretes, que roda uma vez por dia.
//
//  gerarLembretes({ hoje, evento, tarefas, calendario, financeiro, qtdPresentes })
//    -> [{ chave, categoria, prioridade, ferramenta, mensagem }]
//
//  "chave" identifica o lembrete: o mesmo lembrete nunca é enviado duas vezes.
//  Categorias (o usuário liga/desliga cada uma em Notificações):
//     contagem | tarefas | calendario | orcamento | dicas
// ==========================================================

export const CATEGORIAS = ["colaboracao", "contagem", "tarefas", "calendario", "orcamento", "dicas"];

// "AAAA-MM-DD" -> número de dias (para subtrair datas sem se perder com fuso)
function dias(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

function horaCurta(hhmm) {
    const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return "";
    return " às " + Number(m[1]) + "h" + (m[2] === "00" ? "" : m[2]);
}

function plural(n, um, varios) {
    return n === 1 ? um : varios;
}

export function gerarLembretes({ hoje, evento, tarefas = [], calendario = [], financeiro = [], qtdPresentes = 0 }) {
    const saida = [];
    const dHoje = dias(hoje);
    const nome = evento.nome || "seu evento";
    const dEvento = dias(evento.data);

    if (dHoje === null) return saida;

    const abertas = tarefas.filter((t) => !t.concluida);

    // ---- contagem regressiva do evento (+ resumo com pendências na véspera) ----
    if (dEvento !== null) {
        const falta = dEvento - dHoje;

        if (falta === 7) {
            saida.push({ chave: "contagem_7", categoria: "contagem", prioridade: 3, ferramenta: "evento",
                mensagem: `Faltam 7 dias para "${nome}"! Que tal conferir as tarefas e o orçamento?` });
        }
        if (falta === 1) {
            const pend = abertas.length
                ? ` Ainda ${plural(abertas.length, "há 1 tarefa pendente", "há " + abertas.length + " tarefas pendentes")}.`
                : " Todas as tarefas estão em dia!";
            saida.push({ chave: "contagem_1", categoria: "contagem", prioridade: 1, ferramenta: "evento",
                mensagem: `É amanhã! "${nome}"${horaCurta(evento.horario)}.${pend}` });
        }
        if (falta === 0) {
            saida.push({ chave: "contagem_0", categoria: "contagem", prioridade: 1, ferramenta: "evento",
                mensagem: `Hoje é o dia! "${nome}"${horaCurta(evento.horario)}. Aproveite! 🎉` });
        }
    }

    // ---- tarefas com prazo ----
    for (const t of abertas) {
        const d = dias(t.data);
        if (d === null || !t.titulo) continue;

        const falta = d - dHoje;
        const titulo = String(t.titulo).slice(0, 60);

        if (falta === 1) {
            saida.push({ chave: `tarefa_${t.id}_1`, categoria: "tarefas", prioridade: 2, ferramenta: "tarefas",
                mensagem: `A tarefa "${titulo}" vence amanhã — ${nome}` });
        } else if (falta === 0) {
            saida.push({ chave: `tarefa_${t.id}_0`, categoria: "tarefas", prioridade: 2, ferramenta: "tarefas",
                mensagem: `A tarefa "${titulo}" vence hoje — ${nome}` });
        } else if (falta < 0 && falta >= -30) {
            saida.push({ chave: `tarefa_${t.id}_atrasada`, categoria: "tarefas", prioridade: 2, ferramenta: "tarefas",
                mensagem: `A tarefa "${titulo}" está atrasada — ${nome}` });
        }
    }

    // ---- compromissos do calendário ----
    for (const c of calendario) {
        const d = dias(c.data);
        if (d === null || !c.titulo) continue;

        const falta = d - dHoje;
        const titulo = String(c.titulo).slice(0, 60);

        if (falta === 1) {
            saida.push({ chave: `cal_${c.id}_1`, categoria: "calendario", prioridade: 2, ferramenta: "calendario",
                mensagem: `Amanhã: "${titulo}"${horaCurta(c.horario)} — ${nome}` });
        } else if (falta === 0) {
            saida.push({ chave: `cal_${c.id}_0`, categoria: "calendario", prioridade: 1, ferramenta: "calendario",
                mensagem: `Hoje: "${titulo}"${horaCurta(c.horario)} — ${nome}` });
        }
    }

    // ---- orçamento (gastos x orçamento inicial + receitas) ----
    const inicial = Number(evento.orcamento) || 0;
    if (inicial > 0 && financeiro.length) {
        let receitas = 0;
        let despesas = 0;

        for (const item of financeiro) {
            const valor = Number(item.valor);
            if (!Number.isFinite(valor)) continue;
            if (item.tipo === "receita") receitas += valor;
            else if (item.tipo === "despesa") despesas += valor;
        }

        const disponivel = inicial + receitas;
        const usado = disponivel > 0 ? despesas / disponivel : 0;

        if (usado >= 1) {
            saida.push({ chave: "orcamento_100", categoria: "orcamento", prioridade: 1, ferramenta: "financeiro",
                mensagem: `Os gastos de "${nome}" chegaram a 100% do orçamento. Vale rever o controle financeiro.` });
        } else if (usado >= 0.8) {
            saida.push({ chave: "orcamento_80", categoria: "orcamento", prioridade: 2, ferramenta: "financeiro",
                mensagem: `Atenção: os gastos de "${nome}" já passaram de 80% do orçamento.` });
        }
    }

    // ---- dicas leves (uma vez só, e só se o evento ainda vai acontecer) ----
    const segundos = evento.criadoEm ? (evento.criadoEm.seconds ?? evento.criadoEm._seconds) : null;
    const criado = Number.isFinite(segundos) ? Math.floor(segundos / 86400) : null;
    const idade = criado === null ? null : dHoje - criado;
    const futuro = dEvento === null || dEvento > dHoje;

    if (futuro && idade !== null && idade >= 3) {
        if (tarefas.length === 0) {
            saida.push({ chave: "dica_sem_tarefas", categoria: "dicas", prioridade: 5, ferramenta: "nexus",
                mensagem: `"${nome}" ainda não tem tarefas. Que tal pedir ao Nexus para sugerir algumas?` });
        }
        if (evento.criadorConvites === true && evento.conviteGerado !== true && idade >= 3) {
            saida.push({ chave: "dica_convite", categoria: "dicas", prioridade: 5, ferramenta: "convite",
                mensagem: `Você ativou o criador de convites em "${nome}" mas ainda não criou o convite. Que tal fazer agora?` });
        }
        if (evento.listaPresentes === true && qtdPresentes === 0) {
            saida.push({ chave: "dica_lista_vazia", categoria: "dicas", prioridade: 5, ferramenta: "presentes",
                mensagem: `A lista de presentes de "${nome}" ainda está vazia. Que tal adicionar os primeiros itens?` });
        }
    }

    return saida;
}

// no máximo N lembretes novos por pessoa por rodada, os mais importantes primeiro
export function limitarPorPessoa(lista, maximo = 3) {
    return [...lista].sort((a, b) => a.prioridade - b.prioridade).slice(0, maximo);
}
