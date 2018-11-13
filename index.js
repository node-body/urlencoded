const appendField = require('append-field')
const getStream = require('get-stream')
const pTry = require('p-try')

const getBodyStream = require('@body/stream')

function decode (input) {
  const withoutPlus = input.replace(/\+/g, ' ')

  try {
    return decodeURIComponent(withoutPlus)
  } catch (e) {
    return withoutPlus
  }
}

function parseBody (source) {
  const result = Object.create(null)

  const parts = source.split('&')

  for (const part of parts) {
    if (part === '') continue

    const bracketEqualsPos = part.indexOf(']=')
    const pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1

    const key = decode(pos === -1 ? part : part.slice(0, pos))
    const val = decode(pos === -1 ? '' : part.slice(pos + 1))

    appendField(result, key, val)
  }

  return result
}

module.exports = function getUrlencodedBody (req, options = {}) {
  return pTry(getBodyStream, req, { inflate: options.inflate }).then(getStream).then(parseBody)
}
