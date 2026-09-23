import type { Resources } from './types'

export const en = {
  common: {
    appName: 'Realtime Chat',
    language: {
      label: 'Language',
    },
  },
  errors: {
    codes: {
      VALIDATION: 'Invalid data.',
      RATE_LIMITED: 'Easy there! You are sending messages too fast.',
      NOT_FOUND: 'Room not found.',
      NOT_IN_ROOM: 'Join the room before sending.',
      CONFLICT: 'That already exists.',
      LIMIT_REACHED: 'The room limit has been reached.',
      NETWORK: 'Could not reach the server. Is it running?',
      TIMEOUT: 'The server took too long to answer.',
      OFFLINE: 'No connection to the server right now.',
      UNKNOWN: 'Something went wrong. Please try again.',
    },
    conflict: {
      nickname: 'That nickname is in use right now.',
      room: 'A room with that name already exists.',
    },
    validation: {
      NICKNAME_TOO_SHORT: 'Your nickname needs at least {{min}} characters.',
      NICKNAME_TOO_LONG: 'Your nickname can have at most {{max}} characters.',
      NICKNAME_INVALID_CHARS: 'Use only letters, numbers, spaces, dots, _ or -.',
      COLOR_INVALID: 'Invalid color.',
      ROOM_NAME_TOO_SHORT: 'The name needs at least {{min}} characters.',
      ROOM_NAME_TOO_LONG: 'The name can have at most {{max}} characters.',
      ROOM_NAME_INVALID_CHARS: 'Use only letters, numbers, spaces, _ or -.',
      MESSAGE_EMPTY: 'The message is empty.',
      MESSAGE_TOO_LONG: 'Messages can have at most {{max}} characters.',
      INVALID_PAYLOAD: 'Invalid data.',
    },
  },
} satisfies Resources
