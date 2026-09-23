export const ptBR = {
  common: {
    appName: 'Realtime Chat',
    language: {
      label: 'Idioma',
    },
  },
  errors: {
    codes: {
      VALIDATION: 'Dados inválidos.',
      RATE_LIMITED: 'Calma! Você está enviando rápido demais.',
      NOT_FOUND: 'Sala não encontrada.',
      NOT_IN_ROOM: 'Entre na sala antes de enviar.',
      CONFLICT: 'Isso já existe.',
      LIMIT_REACHED: 'O limite de salas foi atingido.',
      NETWORK: 'Não foi possível falar com o servidor. Ele está rodando?',
      TIMEOUT: 'O servidor demorou demais para responder.',
      OFFLINE: 'Sem conexão com o servidor no momento.',
      UNKNOWN: 'Algo deu errado. Tente novamente.',
    },
    conflict: {
      nickname: 'Esse apelido já está em uso agora.',
      room: 'Já existe uma sala com esse nome.',
    },
    validation: {
      NICKNAME_TOO_SHORT: 'O apelido precisa ter ao menos {{min}} caracteres.',
      NICKNAME_TOO_LONG: 'O apelido pode ter no máximo {{max}} caracteres.',
      NICKNAME_INVALID_CHARS: 'Use apenas letras, números, espaço, ponto, _ ou -.',
      COLOR_INVALID: 'Cor inválida.',
      ROOM_NAME_TOO_SHORT: 'O nome precisa ter ao menos {{min}} caracteres.',
      ROOM_NAME_TOO_LONG: 'O nome pode ter no máximo {{max}} caracteres.',
      ROOM_NAME_INVALID_CHARS: 'Use apenas letras, números, espaço, _ ou -.',
      MESSAGE_EMPTY: 'A mensagem está vazia.',
      MESSAGE_TOO_LONG: 'A mensagem pode ter no máximo {{max}} caracteres.',
      INVALID_PAYLOAD: 'Dados inválidos.',
    },
  },
} as const
