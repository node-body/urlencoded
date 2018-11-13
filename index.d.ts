/// <reference types="node" />

import { IncomingMessage } from 'http'

declare namespace getUrlencodedBody {
  interface Options {
    inflate?: boolean
  }
}

declare function getUrlencodedBody (req: IncomingMessage, options?: getUrlencodedBody.Options): Promise<object>

export = getUrlencodedBody
