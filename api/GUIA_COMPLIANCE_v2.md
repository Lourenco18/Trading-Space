# 🛡️ Compliance Tracker v2 — Guia de Instalação

## O que mudou nesta versão

1. **Corrigido o "Request failed"** — agora qualquer erro do servidor aparece com a mensagem real, em vez de um erro genérico
2. **Frequência de Payouts** — define se os payouts são On-Demand, Semanal, Quinzenal ou Mensal, com contagem decrescente automática
3. **Sistema de Alertas (🔔)** — avisa automaticamente quando violas uma regra (e podes "perder" a conta) e quando fazes ganhos

---

## Ficheiros a substituir/adicionar

| Ficheiro | Onde colocar |
|---|---|
| `migration_compliance_v2.sql` | Correr no phpMyAdmin |
| `config.php` | `api/config.php` (substituir) |
| `accounts.php` | `api/accounts.php` (substituir) |
| `payouts.php` | `api/payouts.php` (substituir) |
| `load.php` | `api/load.php` (substituir) |
| `index.html` | Substituir o ficheiro principal |

⚠️ **Se já tinhas instalado a v1**, precisas de correr só esta linha extra no SQL (a única coluna nova):
```sql
ALTER TABLE accounts ADD COLUMN payout_freq_days INT DEFAULT 0;
```
Se é a primeira vez, corre o `migration_compliance_v2.sql` completo (linha a linha, como descrito no próprio ficheiro).

---

## 🔧 Porque dava "Request failed"

O erro acontecia porque, quando uma query SQL falha (ex: porque uma coluna nova ainda não existe na tua base de dados), o PHP não devolvia uma resposta em JSON — devolvia um erro em HTML que o teu frontend não conseguia interpretar, por isso só aparecia "Request failed" sem dizer o motivo real.

O novo `config.php` tem um **handler global de erros** que converte qualquer erro do servidor (SQL, PHP, etc.) numa mensagem JSON legível. A partir de agora, se algo correr mal, vais ver a mensagem real do erro em vez de "Request failed".

👉 **Mais importante:** corre sempre a migração SQL antes de testar — é a causa mais provável do erro que tiveste (a tabela `accounts` ainda não tinha as colunas novas como `phase`, `phase1_target`, etc.)

---

## 💸 Frequência de Payouts

No formulário de criar conta, tens agora um campo **"Frequência de Payout"**:
- **On-Demand** — sem limite, podes pedir quando quiseres
- **Semanal** (7 dias) · **Quinzenal** (14 dias) · **Mensal** (30 dias)

Na conta Funded, o sistema mostra:
- ✅ "Payout disponível agora" — se já passou o tempo necessário
- ⏳ "Próximo payout em X dia(s) — DD/MM" — se ainda não podes pedir

O botão de payout fica desativado automaticamente enquanto não chegar a data. A validação acontece tanto no site como no servidor (para garantir que não há forma de contornar o limite).

---

## 🔔 Sistema de Alertas

### Avisos de violação de regras
Sempre que uma conta excede o Daily DD ou o Max DD, vais ver:
- Um **toast** automático a avisar (aparece sempre que entras na app ou registas uma trade nova)
- Um número **vermelho** no sininho 🔔 da sidebar
- Dentro do alerta, o botão **"Marcar como Perdida"** — regista a conta como "Encerrada" (perdida), guardando o histórico mas parando os alertas repetidos sobre ela

### Avisos de ganhos
O sistema avisa automaticamente quando:
- Cumpres os objetivos de uma fase e podes avançar
- Tens lucro elegível disponível para payout (e já passou o tempo de espera)
- Fazes lucro num dia (resumo "Lucro total de hoje: +$X")

Clica no sininho 🔔 a qualquer momento para ver a lista completa de alertas activos (violações em vermelho, conquistas em verde).

> Os toasts só aparecem uma vez por alerta nessa sessão (não vais ser espamado a cada clique) — mas o número no sininho mantém-se visível enquanto o alerta for válido.

---

## Resumo de tudo o que o sistema já faz

✅ Presets de regras FundingPips (2-Step Standard/Pro, 1-Step)
✅ Tracker automático de Daily DD, Max DD, Profit Target e dias mínimos
✅ Avanço automático Fase 1 → Fase 2 → Funded
✅ Payouts de teste com frequência configurável
✅ Alertas de violação (com opção de marcar conta como perdida)
✅ Alertas de conquistas e ganhos
✅ Erros do servidor legíveis (sem mais "Request failed" sem explicação)
