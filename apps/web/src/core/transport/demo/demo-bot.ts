import type { PublicUser } from '@chat/shared'
import type { Language } from '../../i18n/languages'

export interface BotContext {
  now: Date
  random: () => number
  /** The bot always answers in the language the sender is using. */
  language: Language
}

type Texts = {
  help: string
  greeting: (name: string) => string
  time: (time: string) => string
  server: string
  thanks: string
  bye: (name: string) => string
  jokes: readonly string[]
  fallback: readonly string[]
}

const TEXTS: Record<Language, Texts> = {
  'pt-BR': {
    help:
      'Este é o modo demo: não há servidor, as mensagens viajam entre as abas deste navegador ' +
      'via BroadcastChannel. Experimente: "piada", "que horas são?" ou abra outra aba e converse com você mesmo.',
    greeting: (name) => `Oi, ${name}! 👋 Que bom te ver por aqui.`,
    time: (time) => `Agora são ${time} por aqui ⏰`,
    server:
      'Com o servidor Node rodando (npm run dev), o app usa Socket.io de verdade: JWT, salas, ' +
      'presença e rate limiting. Aqui no GitHub Pages eu simulo tudo isso no navegador 🤖',
    thanks: 'De nada! 💜',
    bye: (name) => `Até mais, ${name}! 👋`,
    jokes: [
      'Por que o JavaScript foi ao terapeuta? Porque tinha muitos problemas de "this" 😅',
      'Existem 10 tipos de pessoas: as que entendem binário e as que não entendem.',
      'Funciona na minha máquina ¯\\_(ツ)_/¯ — então vamos mandar a máquina pra produção!',
      'Um SQL entra num bar, vai até duas mesas e pergunta: "Posso me juntar a vocês?"',
    ],
    fallback: [
      'Interessante! Conta mais 👀',
      'Anotado ✍️',
      'Concordo totalmente.',
      'Haha, boa! 😄',
      'Hmm, nunca tinha pensado por esse lado 🤔',
      'Se quiser ver o que eu sei fazer, digite "ajuda".',
    ],
  },
  en: {
    help:
      'This is demo mode: there is no server, messages travel between the tabs of this browser ' +
      'over BroadcastChannel. Try "joke", "what time is it?" or open another tab and talk to yourself.',
    greeting: (name) => `Hi, ${name}! 👋 Great to see you here.`,
    time: (time) => `It is ${time} over here ⏰`,
    server:
      'With the Node server running (npm run dev) the app uses real Socket.io: JWT, rooms, ' +
      'presence and rate limiting. Here on GitHub Pages I simulate all of that in the browser 🤖',
    thanks: "You're welcome! 💜",
    bye: (name) => `See you, ${name}! 👋`,
    jokes: [
      'Why did the JavaScript developer go to therapy? Too many issues with "this" 😅',
      'There are 10 kinds of people: those who understand binary and those who don’t.',
      'It works on my machine ¯\\_(ツ)_/¯ — so let’s ship my machine to production!',
      'A SQL query walks into a bar, goes up to two tables and asks: "Can I join you?"',
    ],
    fallback: [
      'Interesting! Tell me more 👀',
      'Noted ✍️',
      'Totally agree.',
      'Haha, nice! 😄',
      "Hmm, I'd never thought about it that way 🤔",
      'Type "help" to see what I can do.',
    ],
  },
}

/** Case-insensitive whole-word match that understands accents (`\b` does not: "olá"). */
function words(...alternatives: string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'iu')
}

interface Rule {
  /** Keywords in both languages: people mix them, and either should work. */
  test: RegExp
  reply: (texts: Texts, author: PublicUser, context: BotContext) => string
}

const RULES: Rule[] = [
  {
    test: words('ajuda', 'help', 'comandos?', 'commands?', 'como funciona', 'how does it work'),
    reply: (texts) => texts.help,
  },
  {
    test: words('horas?', 'hor[áa]rio', 'time'),
    reply: (texts, _author, { now, language }) =>
      texts.time(
        new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(now),
      ),
  },
  {
    test: words('piadas?', 'jokes?'),
    reply: (texts, _author, { random }) => pick(texts.jokes, random),
  },
  {
    test: words('servidor', 'server', 'socket', 'socket\\.io', 'backend', 'websocket'),
    reply: (texts) => texts.server,
  },
  {
    test: words('obrigad[oa]', 'valeu', 'vlw', 'thanks', 'thank you', 'thx'),
    reply: (texts) => texts.thanks,
  },
  {
    test: words('tchau', 'at[ée] mais', 'falou', 'flw', 'bye', 'see you', 'goodbye'),
    reply: (texts, author) => texts.bye(author.nickname),
  },
  // Greetings last, so "oi, conta uma piada" / "hi, tell me a joke" gets the joke.
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
      'hi',
      'hello',
      'good (?:morning|afternoon|evening)',
    ),
    reply: (texts, author) => texts.greeting(author.nickname),
  },
]

/** Picks the bot answer for a message in #geral. Pure, so it is trivial to test. */
export function botReply(text: string, author: PublicUser, context: BotContext): string {
  const texts = TEXTS[context.language]
  const rule = RULES.find(({ test }) => test.test(text))
  return rule ? rule.reply(texts, author, context) : pick(texts.fallback, context.random)
}

function pick<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.floor(random() * items.length) % items.length]
  if (item === undefined) throw new Error('Cannot pick from an empty list')
  return item
}
