import { describe, expect, it } from 'vitest'
import { startServer } from './helpers.js'

async function postLogin(url: string, body: unknown) {
  const response = await fetch(`${url}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

describe('HTTP API', () => {
  it('reports health', async () => {
    const { url } = await startServer()
    const response = await fetch(`${url}/api/health`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
  })

  it('issues a token for a valid nickname', async () => {
    const { url, server } = await startServer()
    const { status, body } = await postLogin(url, { nickname: '  Ana  ', color: '#22c55e' })

    expect(status).toBe(201)
    expect(body.user).toMatchObject({ nickname: 'Ana', color: '#22c55e' })
    const user = server.tokens.verify(body.token as string)
    expect(user).toEqual(body.user)
  })

  it('assigns a palette color when none is given', async () => {
    const { url } = await startServer()
    const { body } = await postLogin(url, { nickname: 'Bia' })
    expect((body.user as { color: string }).color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it.each([
    [{ nickname: 'a' }, 'NICKNAME_TOO_SHORT'],
    [{ nickname: 'x'.repeat(30) }, 'NICKNAME_TOO_LONG'],
    [{ nickname: '<script>' }, 'NICKNAME_INVALID_CHARS'],
    [{ nickname: 'Caio', color: 'red' }, 'COLOR_INVALID'],
    [{}, 'INVALID_PAYLOAD'],
  ])('rejects invalid payload %j with a code, not a text', async (payload, detail) => {
    const { url } = await startServer()
    const { status, body } = await postLogin(url, payload)
    expect(status).toBe(400)
    expect(body.error).toEqual({ code: 'VALIDATION', detail })
  })

  it('rejects a nickname that is online right now, case-insensitively', async () => {
    const { url, connectAs } = await startServer()
    const { client } = await connectAs('Duda')

    const taken = await postLogin(url, { nickname: 'duda' })
    expect(taken.status).toBe(409)
    expect(taken.body.error).toEqual({ code: 'CONFLICT' })

    client.disconnect()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const free = await postLogin(url, { nickname: 'duda' })
    expect(free.status).toBe(201)
  })

  it('answers unknown routes with a JSON 404', async () => {
    const { url } = await startServer()
    const response = await fetch(`${url}/api/nope`)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: { code: 'NOT_FOUND' } })
  })
})
