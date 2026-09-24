import type { ChatMessage, PublicUser } from '@chat/shared'
import type { Language } from '../../i18n/languages'
import { DIEGO, MARINA } from './demo-users'

/**
 * Texts of the demo "database" in both languages. Seed messages are stored once
 * (in localStorage, shared by every tab) and re-localized when read, so switching
 * the language also switches the seeded conversation.
 */
export const SEED_TEXTS: Record<Language, Record<string, string>> = {
  'pt-BR': {
    'seed-geral-12': 'Bom dia, pessoal! ☀️',
    'seed-geral-3':
      'Oi! Eu sou a Lia, o bot deste modo demo 🤖 Mande uma mensagem aqui em #geral que eu respondo. ' +
      'Abra esta página em outra aba para ver o chat em tempo real entre abas.',
    'seed-dev-50': 'Alguém já testou o Vite 8? O build ficou absurdo de rápido ⚡',
    'seed-dev-48': 'Testei! O Rolldown por baixo faz muita diferença.',
    'seed-dev-47': 'E o HMR continua instantâneo.',
    'seed-random-30': 'Bom dia! ☕',
  },
  en: {
    'seed-geral-12': 'Good morning, everyone! ☀️',
    'seed-geral-3':
      "Hi! I'm Lia, the bot of this demo mode 🤖 Send a message here in #geral and I'll answer. " +
      'Open this page in another tab to see the chat working in real time between tabs.',
    'seed-dev-50': 'Has anyone tried Vite 8 yet? The build got ridiculously fast ⚡',
    'seed-dev-48': 'I did! Rolldown under the hood makes a big difference.',
    'seed-dev-47': 'And HMR is still instant.',
    'seed-random-30': 'Good morning! ☕',
  },
}

export function localizeSeed(message: ChatMessage, language: Language): ChatMessage {
  const text = SEED_TEXTS[language][message.id]
  return text ? { ...message, text } : message
}

type AmbientLine = { user: PublicUser; text: string }

/** Small talk the simulated users post from time to time, per room and language. */
export const AMBIENT_LINES: Record<Language, Record<string, readonly AmbientLine[]>> = {
  'pt-BR': {
    geral: [
      { user: MARINA, text: 'Alguém mais tomando o terceiro café do dia? ☕' },
      { user: MARINA, text: 'Dica: abre esta página em outra aba e conversa com você mesmo 😄' },
      { user: MARINA, text: 'Sextou? Ainda não, mas a gente finge 🎉' },
    ],
    dev: [
      { user: DIEGO, text: 'Subi um PR com os testes do rate limiter, se alguém puder revisar 🙏' },
      {
        user: MARINA,
        text: 'TIL: BroadcastChannel funciona entre abas da mesma origem, sem servidor.',
      },
      { user: DIEGO, text: 'Socket.io com acks tipados é outro nível de DX.' },
      {
        user: MARINA,
        text: 'Quem nunca esqueceu de limpar um setTimeout no useEffect que atire a primeira pedra.',
      },
    ],
    random: [
      { user: DIEGO, text: 'Recomendação de podcast pra hoje: qualquer um sobre café 😅' },
      { user: DIEGO, text: 'Alguém viu o jogo ontem? ⚽' },
    ],
  },
  en: {
    geral: [
      { user: MARINA, text: 'Anyone else on their third coffee of the day? ☕' },
      { user: MARINA, text: 'Tip: open this page in another tab and talk to yourself 😄' },
      { user: MARINA, text: "Is it Friday yet? No, but let's pretend 🎉" },
    ],
    dev: [
      { user: DIEGO, text: 'Opened a PR with the rate limiter tests, reviews welcome 🙏' },
      {
        user: MARINA,
        text: 'TIL: BroadcastChannel works across same-origin tabs, no server needed.',
      },
      { user: DIEGO, text: 'Socket.io with typed acks is a whole new level of DX.' },
      {
        user: MARINA,
        text: 'Let whoever never forgot to clear a setTimeout in useEffect cast the first stone.',
      },
    ],
    random: [
      { user: DIEGO, text: 'Podcast tip of the day: anything about coffee 😅' },
      { user: DIEGO, text: 'Did anyone watch the game last night? ⚽' },
    ],
  },
}
