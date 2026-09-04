import type { PublicUser } from '@chat/shared'

export interface BotContext {
  now: Date
  random: () => number
}

const FALLBACK_REPLIES = [
  'Interessante! Conta mais 👀',
  'Anotado ✍️',
  'Concordo totalmente.',
  'Haha, boa! 😄',
  'Hmm, nunca tinha pensado por esse lado 🤔',
  'Se quiser ver o que eu sei fazer, digite "ajuda".',
]

const JOKES = [
  'Por que o JavaScript foi ao terapeuta? Porque tinha muitos problemas de "this" 😅',
  'Existem 10 tipos de pessoas: as que entendem binário e as que não entendem.',
  'Funciona na minha máquina ¯\\_(ツ)_/¯ — então vamos mandar a máquina pra produção!',
  'Um SQL entra num bar, vai até duas mesas e pergunta: "Posso me juntar a vocês?"',
]

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Case-insensitive whole-word match that understands accents (`\b` does not: "olá"). */
function words(...alternatives: string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'iu')
}

interface Rule {
  test: RegExp
  reply: (author: PublicUser, context: BotContext) => string
}

const RULES: Rule[] = [
  {
    test: words('ajuda', 'help', 'comandos?', 'como funciona'),
    reply: () =>
      'Este é o modo demo: não há servidor, as mensagens viajam entre as abas deste navegador ' +
      'via BroadcastChannel. Experimente: "piada", "que horas são?" ou abra outra aba e converse com você mesmo.',
  },
  {
    test: words(
      'oi+',
      'ol[áa]',
      'e a[íi]',
      'eai',
      'opa',
      'bom dia',
      'boa tarde',
      'boa noite',
      'hey',
    ),
    reply: (author) => `Oi, ${author.nickname}! 👋 Que bom te ver por aqui.`,
  },
  {
    test: words('horas?', 'hor[áa]rio'),
    reply: (_author, { now }) => `Agora são ${timeFormatter.format(now)} por aqui ⏰`,
  },
  {
    test: words('piadas?'),
    reply: (_author, { random }) => pick(JOKES, random),
  },
  {
    test: words('servidor', 'server', 'socket', 'socket\\.io', 'backend', 'websocket'),
    reply: () =>
      'Com o servidor Node rodando (npm run dev), o app usa Socket.io de verdade: JWT, salas, ' +
      'presença e rate limiting. Aqui no GitHub Pages eu simulo tudo isso no navegador 🤖',
  },
  {
    test: words('obrigad[oa]', 'valeu', 'vlw'),
    reply: () => 'De nada! 💜',
  },
  {
    test: words('tchau', 'at[ée] mais', 'falou', 'flw'),
    reply: (author) => `Até mais, ${author.nickname}! 👋`,
  },
]

/** Picks the bot answer for a message in #geral. Pure, so it is trivial to test. */
export function botReply(text: string, author: PublicUser, context: BotContext): string {
  const rule = RULES.find(({ test }) => test.test(text))
  return rule ? rule.reply(author, context) : pick(FALLBACK_REPLIES, context.random)
}

function pick<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.floor(random() * items.length) % items.length]
  if (item === undefined) throw new Error('Cannot pick from an empty list')
  return item
}
