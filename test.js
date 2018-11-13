/* eslint-env mocha */

'use strict'

const assert = require('assert')
const assertRejects = require('assert-rejects')
const errorHandler = require('api-error-handler')
const express = require('express')
const got = require('got')
const zlib = require('zlib')

const getUrlencodedBody = require('./')

describe('URL-encoded body parser', () => {
  let app, server

  before((done) => {
    app = express()

    app.post('/', (req, res, next) => {
      getUrlencodedBody(req).then(
        (data) => res.json(data),
        (err) => next(err)
      )
    })

    app.post('/inflate', (req, res, next) => {
      getUrlencodedBody(req, { inflate: true }).then(
        (data) => res.json(data),
        (err) => next(err)
      )
    })

    app.use(errorHandler())

    server = app.listen(26934, () => done())
  })

  after((done) => {
    server.close(done)
  })

  it('should parse urlencoded data', () => {
    const input = 'a=1&b=2'
    const expected = { a: '1', b: '2' }

    return got('http://localhost:26934/', { body: input }).then((res) => {
      assert.strictEqual(res.statusCode, 200)
      assert.deepStrictEqual(JSON.parse(res.body), expected)
    })
  })

  it('should parse data encoded with "gzip"', () => {
    const input = 'a=1&b=2'
    const expected = { a: '1', b: '2' }
    const encoded = zlib.gzipSync(input)
    const headers = { 'Content-Encoding': 'gzip' }

    return got('http://localhost:26934/inflate', { body: encoded, headers }).then((res) => {
      assert.strictEqual(res.statusCode, 200)
      assert.deepStrictEqual(JSON.parse(res.body), expected)
    })
  })

  it('should reject "gzip" content-encoding', () => {
    const body = zlib.gzipSync('{ "a": 1 }')
    const headers = { 'Content-Encoding': 'gzip' }

    return assertRejects(
      got('http://localhost:26934/', { body, headers }),
      (err) => (err.statusCode === 415 && JSON.parse(err.response.body).code === 'UNSUPPORTED_ENCODING')
    )
  })

  it('cannot access Object prototype', async () => {
    await got('http://localhost:26934/', { body: 'constructor[prototype][bad]=bad' })
    await got('http://localhost:26934/', { body: 'bad[constructor][prototype][bad]=bad' })

    assert.strictEqual(typeof Object.prototype.bad, 'undefined')
  })

  const testCases = [
    ['empty body', '', {}],
    ['numeric keys', '0=foo', { 0: 'foo' }],
    ['encoded spaces', 'foo=c++', { foo: 'c  ' }],
    ['special keys (1)', 'a[>=]=23', { a: { '>=': '23' } }],
    ['special keys (2)', 'a[<=>]==23', { a: { '<=>': '=23' } }],
    ['special keys (3)', 'a[==]=23', { a: { '==': '23' } }],
    ['empty values (1)', 'foo', { foo: '' }],
    ['empty values (2)', 'foo=', { foo: '' }],
    ['simple key/value', 'foo=bar', { foo: 'bar' }],
    ['multiple equals (1)', ' foo = bar = baz ', { ' foo ': ' bar = baz ' }],
    ['multiple equals (2)', 'foo=bar=baz', { foo: 'bar=baz' }],
    ['multiple key/values (1)', 'foo=bar&bar=baz', { foo: 'bar', bar: 'baz' }],
    ['multiple key/values (2)', 'foo2=bar2&baz2=', { foo2: 'bar2', baz2: '' }],
    ['multiple key/values (3)', 'foo=bar&baz', { foo: 'bar', baz: '' }],
    ['strange characters', 'cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World', { cht: 'p3', chd: 't:60,40', chs: '250x100', chl: 'Hello|World' }],
    ['single nested strings', 'a[b]=c', { a: { b: 'c' } }],
    ['double nested strings', 'a[b][c]=d', { a: { b: { c: 'd' } } }],
    ['simple arrays', 'a=b&a=c', { a: ['b', 'c'] }],
    ['explicit arrays (1)', 'a[]=b', { a: ['b'] }],
    ['explicit arrays (2)', 'a[]=b&a[]=c', { a: ['b', 'c'] }],
    ['explicit arrays (3)', 'a[]=b&a[]=c&a[]=d', { a: ['b', 'c', 'd'] }],
    ['a mix of simple and explicit arrays (1)', 'a=b&a[]=c', { a: ['b', 'c'] }],
    ['a mix of simple and explicit arrays (2)', 'a[]=b&a=c', { a: ['b', 'c'] }],
    ['a mix of simple and explicit arrays (3)', 'a[0]=b&a=c', { a: ['b', 'c'] }],
    ['a mix of simple and explicit arrays (4)', 'a[]=b&a=c', { a: ['b', 'c'] }],
    ['a mix of simple and explicit arrays (5)', 'a=b&a[]=c', { a: ['b', 'c'] }],
    ['nested arrays', 'a[b][]=c&a[b][]=d', { a: { b: ['c', 'd'] } }],
    ['encoded = signs', 'he%3Dllo=th%3Dere', { 'he=llo': 'th=ere' }],
    ['url encoded strings (1)', 'a[b%20c]=d', { a: { 'b c': 'd' } }],
    ['url encoded strings (2)', 'a[b]=c%20d', { a: { b: 'c d' } }],
    ['allows brackets in the value (1)', 'pets=["tobi"]', { pets: '["tobi"]' }],
    ['allows brackets in the value (2)', 'operators=[">=", "<="]', { operators: '[">=", "<="]' }],
    ['transforms arrays to objects (1)', 'foo[0]=bar&foo[bad]=baz', { foo: { 0: 'bar', bad: 'baz' } }],
    ['transforms arrays to objects (2)', 'foo[bad]=baz&foo[0]=bar', { foo: { bad: 'baz', 0: 'bar' } }],
    ['transforms arrays to objects (3)', 'foo[]=bar&foo[bad]=baz', { foo: { 0: 'bar', bad: 'baz' } }],
    ['transforms arrays to objects (4)', 'foo[0][a]=a&foo[0][b]=b&foo[1][a]=aa&foo[1][b]=bb', { foo: [{ a: 'a', b: 'b' }, { a: 'aa', b: 'bb' }] }],
    ['transforms arrays to objects (5)', 'a[]=b&a[t]=u&a[hasOwnProperty]=c', { a: { 0: 'b', t: 'u', hasOwnProperty: 'c' } }],
    ['transforms arrays to objects (6)', 'a[]=b&a[hasOwnProperty]=c&a[x]=y', { a: { 0: 'b', hasOwnProperty: 'c', x: 'y' } }],
    ['supports malformed uri characters (1)', '{%:%}', { '{%:%}': '' }],
    ['supports malformed uri characters (2)', '{%:%}=', { '{%:%}': '' }],
    ['supports malformed uri characters (3)', 'foo=%:%}', { foo: '%:%}' }],
    ['empty keys', '_r=1&', { _r: '1' }],
    ['arrays of objects', 'a[0][b]=c', { a: [{ b: 'c' }] }],
    ['empty strings in arrays (1)', 'a[]=b&a[]=&a[]=c', { a: ['b', '', 'c'] }],
    ['empty strings in arrays (2)', 'a[]=&a[]=b&a[]=c', { a: ['', 'b', 'c'] }]
  ]

  for (const [name, input, expected] of testCases) {
    it(`should handle ${name}`, () => {
      return got('http://localhost:26934/', { body: input }).then((res) => {
        assert.strictEqual(res.statusCode, 200)
        assert.deepStrictEqual(JSON.parse(res.body), expected)
      })
    })
  }
})
