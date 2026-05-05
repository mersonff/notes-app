# Seed data for development and demos.
#
# Idempotent: re-running `bin/rails db:seed` does NOT duplicate records —
# each note is upserted by title via find_or_initialize_by + save!. To
# start fresh, use `bin/rails db:reset` (drops + recreates + reseeds).
#
# The set deliberately exercises every UX state the app can render:
#   - long and short titles (including one near the 120-char boundary)
#   - notes without content (so the "(sem conteúdo)" placeholder shows)
#   - multi-paragraph content (so the textarea's whitespace preservation
#     and the card's line-clamp both get exercised)
#   - 30+ records (enough to span 2 pages at the default page size of 20)

# Test env runs in transactional fixtures — seeds would corrupt the empty
# baseline that specs expect.
return if Rails.env.test?

NOTES_FIXTURES = [
  {
    title: "Reunião semanal com o time de produto",
    content: <<~TXT
      Pauta:
      - Status das releases pendentes
      - Métricas da semana (DAU, retenção, churn)
      - Próximas prioridades para o sprint
      - Bloqueios e dependências entre squads

      Trazer dúvidas sobre o roadmap do Q3.
    TXT
  },
  {
    title: "Lista de compras — supermercado",
    content: <<~TXT
      Frutas e verduras:
      - Banana, maçã, mamão
      - Alface, tomate, cenoura

      Padaria:
      - Pão integral
      - Café em grão (500g)

      Limpeza:
      - Detergente
      - Sabão em pó
    TXT
  },
  {
    title: "Ideias para melhoria do onboarding",
    content: "Adicionar tooltips contextuais nos primeiros usos. Considerar um tour guiado opcional. Reduzir os campos obrigatórios do cadastro de 8 para 4."
  },
  {
    title: "Estudar paginação keyset",
    content: "Diferente de offset/limit, keyset usa o último valor da página anterior como cursor. Vantagem: performance constante mesmo em milhões de registros. Desvantagem: não permite pular para uma página arbitrária. Bom para feeds infinitos."
  },
  {
    title: "Lembrete: renovar certificado SSL",
    content: "Vence em 15 dias. Configurar auto-renovação via Let's Encrypt + cronjob no servidor de produção. Documentar o processo no runbook."
  },
  {
    title: "Receita de pão de queijo",
    content: <<~TXT
      Ingredientes:
      - 500g de polvilho azedo
      - 250ml de leite
      - 100ml de óleo
      - 2 ovos
      - 200g de queijo meia cura ralado
      - Sal a gosto

      Modo de preparo: ferver leite e óleo, escaldar o polvilho, deixar amornar, incorporar ovos e queijo. Modelar bolinhas e assar a 200°C por 25 minutos.
    TXT
  },
  { title: "Comprar presente de aniversário do João" }, # no content — exercises the placeholder
  {
    title: "Anotações da palestra sobre arquitetura hexagonal",
    content: "Ports & adapters separam domínio de infraestrutura. Driving adapters (controllers, jobs) chamam ports de entrada. Driven adapters (DBs, APIs) implementam ports de saída. Testes do domínio rodam sem framework. Trade-off: mais arquivos, mas testabilidade muito maior."
  },
  {
    title: "Plano de leitura — outubro",
    content: <<~TXT
      Lista priorizada:
      1. Designing Data-Intensive Applications (cap. 5-7)
      2. Domain-Driven Design — Eric Evans
      3. The Pragmatic Programmer (releitura)
      4. Refactoring — Martin Fowler

      Meta: 30 minutos por dia + 2h aos sábados.
    TXT
  },
  { title: "Trocar pneu do carro" },
  {
    title: "Ideias para a apresentação do TechTalk",
    content: "Tema sugerido: \"Custo cognitivo das abstrações prematuras\". Estrutura: caso real (10min), princípio teórico (5min), heurísticas práticas (10min), Q&A (10min). Pedir feedback do João antes de submeter o resumo."
  },
  {
    title: "Configurar backup automático do PostgreSQL",
    content: "Usar pg_dump + cron diário. Reter 7 dias localmente + sincronizar com S3 (lifecycle: 30 dias quente, 90 dias glacier). Testar restore mensalmente — backup que nunca foi restaurado é só um arquivo."
  },
  {
    title: "Brainstorm: nome para o novo produto",
    content: "Critérios: até 3 sílabas, .com disponível, sem conflito com marcas existentes. Candidatos: Trilha, Brisa, Folga, Pauta, Lapso. Pedir voto da equipe na reunião de sexta."
  },
  {
    title: "Chamar dentista — limpeza semestral",
    content: "Liberada terça à tarde ou quinta de manhã. Confirmar convênio antes de marcar."
  },
  {
    title: "Notas da entrevista com o candidato senior backend",
    content: <<~TXT
      Pontos fortes:
      - Sólida base em sistemas distribuídos
      - Experiência real com PostgreSQL em produção
      - Boa comunicação técnica

      Pontos de atenção:
      - Pouca experiência com Ruby (vem de Go)
      - Não tinha visão clara sobre observabilidade

      Recomendação: avançar para a próxima fase com tech case focado em legacy refactoring.
    TXT
  },
  { title: "Estudar regex lookahead" },
  {
    title: "Reflexão de fim de semana",
    content: "Trabalho rendeu menos do que eu queria, mas li bem e dormi melhor. Talvez a heurística \"métrica única\" (linhas escritas) esteja me sabotando — qualidade > volume nesse momento. Tentar timer de 90 minutos focado + 30 de pausa real."
  },
  {
    title: "Lista de filmes para assistir",
    content: "- Cidade de Deus (rever)\n- Bacurau\n- Aquarius\n- Que Horas Ela Volta?\n- Marighella"
  },
  {
    title: "Configuração do meu setup de dev",
    content: <<~TXT
      Editor: Neovim com LazyVim
      Terminal: Ghostty + tmux
      Shell: zsh + Starship
      Multiplexer: tmux com sessões por projeto
      Browser: Arc (work) + Firefox (personal)

      Atalhos chave:
      - Cmd+Shift+P: command palette
      - Ctrl+a + s: lista de sessões tmux
      - Cmd+t: nova aba
    TXT
  },
  {
    title: "Investigar lentidão na query de relatórios",
    content: "EXPLAIN ANALYZE mostra full table scan em transactions (~2M rows). Falta índice composto em (account_id, created_at). Criar em produção com CONCURRENTLY pra não travar a tabela."
  },
  { title: "Pagar boleto da internet" },
  {
    title: "Conversa com o mentor — pontos importantes",
    content: "Mentor sugeriu focar em profundidade técnica antes de buscar gestão. \"Senioridade vem de resolver problemas que outros não conseguem, não de coordenar quem resolve.\" Considerar 1 ano mais de IC antes do próximo movimento."
  },
  {
    title: "Lista de podcasts para escutar na corrida",
    content: "- Fronteiras da Ciência\n- Hipsters Ponto Tech\n- Café Brasil\n- The Changelog\n- Software Engineering Daily"
  },
  {
    title: "Planejamento de viagem para o Nordeste",
    content: <<~TXT
      Cidades cogitadas:
      - Jericoacoara (3 dias)
      - Lençóis Maranhenses (4 dias)
      - Salvador (2 dias)

      Janela: segunda quinzena de novembro (baixa temporada).
      Orçamento: até R$ 4500 por pessoa, all-in.
      Reservar voos com 60 dias de antecedência mínima.
    TXT
  },
  {
    title: "Refatoração do módulo de cobrança",
    content: "O ChargeService cresceu pra 800 linhas e 14 responsabilidades. Quebrar em: ChargeCalculator (regras), ChargeProcessor (gateway), ChargeNotifier (emails/SMS). Manter ChargeService como facade durante a migração — strangler pattern."
  },
  { title: "Marcar consulta médica de rotina" },
  {
    title: "Notas sobre acessibilidade — WCAG AA",
    content: "Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande (>=18pt). Todo elemento interativo precisa ter foco visível. Form labels associados via for/id. Navegação por teclado funcional sem mouse."
  },
  {
    title: "Lições aprendidas no incidente de quinta",
    content: <<~TXT
      Causa raiz: connection pool esgotado por queries N+1 no endpoint de exportação.

      O que funcionou:
      - Alarme do Datadog disparou em 90s
      - Rollback levou 4 minutos
      - Comunicação no Slack #status foi clara

      O que falhou:
      - Não tínhamos métricas de pool size em dashboard
      - Endpoint exportação nunca foi testado com volume real
      - On-call era novo e demorou pra encontrar o runbook

      Ações: dashboard novo, load test mensal, runbook atualizado.
    TXT
  },
  {
    title: "Comprar livros indicados na lista da Companhia das Letras de melhores do ano de não-ficção brasileira",
    # 119 chars — right at the visual edge of the title field
    content: "Pelo menos 3 dos 10 indicados. Priorizar autoras."
  },
  {
    title: "Aprender alemão — meta semanal",
    content: "30 minutos diários no Anki + 1 episódio do podcast \"Slow German\" + 1 página de leitura no Easy German Magazine. Avaliar progresso mensalmente com teste do Goethe-Institut online."
  },
  {
    title: "Café com a Marina sexta às 14h",
    content: "Lugar: Café Suplicy, Vila Madalena. Temas: parceria no projeto open-source, indicação para a vaga na startup dela, atualização sobre a mudança pra Lisboa."
  }
].freeze

puts "Seeding notes…"
puts "  current count: #{Note.count}"

created = 0
skipped = 0

# Spread timestamps backwards from "now" so the most-recent-first list looks
# realistic (oldest seed ~ a month ago, newest seed today).
NOTES_FIXTURES.each_with_index do |attrs, i|
  hours_ago = (NOTES_FIXTURES.size - i) * 24 + rand(0..23)
  timestamp = hours_ago.hours.ago

  note = Note.find_or_initialize_by(title: attrs[:title])
  if note.persisted?
    skipped += 1
    next
  end

  note.assign_attributes(
    content: attrs[:content],
    created_at: timestamp,
    updated_at: timestamp
  )
  note.save!
  created += 1
end

puts "  created: #{created}"
puts "  skipped (already present): #{skipped}"
puts "  new total: #{Note.count}"
