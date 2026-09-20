import type { ptBR } from './pt-BR'

/** Same keys as the pt-BR source of truth, but any string value (used to type other languages). */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

export type Resources = Widen<typeof ptBR>
