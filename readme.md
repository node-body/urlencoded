# URL-encoded body parser

Parse an URL-encoded body of an incoming HTTP request.

## Installation

```sh
npm install --save @body/urlencoded
```

## Usage

```js
const getUrlencodedBody = require('@body/urlencoded')

// ...

app.post('/v1/users', async (req, res, next) => {
  try {
    const body = await getUrlencodedBody(req)

    // ...
  } catch (err) {
    return next(err)
  }
})

// ...
```

## API

### `getUrlencodedBody(req: Request, options: Options): Promise<any>`

Parse the body of the incoming request `req`. Returns a promise of the parsed body.

#### Options

##### `inflate` (boolean)

When set to `true`, then bodies with a `deflate` or `gzip` content-encoding will be inflated before being parsed.

Defaults to `false`.
