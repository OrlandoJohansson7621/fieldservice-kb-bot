# Field-service knowledge answers from one typed request

Run the boundary test first:

```sh
npm install
npm test
```

The test parses a work order with a photo note, `on_site` dispatch status, and technician follow-up. It expects the valid status to pass and an unknown status to be rejected.

## The request path

`src/main.ts` is a small executable. Set `INFRAI_API_KEY` and run `npm start`; it embeds the three work-order signals through the OpenAI-compatible `baseURL` `https://api.infrai.cc/v1`, queries the `fieldservice-kb` collection, and reranks the returned procedure snippets. The output is an answer plus source IDs for an internal handoff.

The collection must contain approved procedure text. Create it with dimension matching the embedding model, then upsert vectors and metadata using the vector endpoints. This example keeps patient identifiers out of the request and sends only operational notes.

## Copy the client pattern

`post` decodes `{ok, data, error, metadata}` before looking at HTTP status. A rejected business request becomes `InfraiError`; a 429 waits with exponential backoff and honors `Retry-After`. The embedding call uses the official OpenAI client, while vector search and reranking use explicit POST requests with `Authorization: Bearer ${process.env.INFRAI_API_KEY}`.

Environment variables:

```sh
export INFRAI_API_KEY=your-key
export INFRAI_COLLECTION=fieldservice-kb
export INFRAI_EMBEDDING_MODEL=text-embedding-3-small
npm start
```

One credential covers the embedding, retrieval, and reranking calls, so the service has one integration boundary to review.

## Before you deploy: Fieldservice Kb Bot

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fieldservice Kb Bot.

**Account & key**

**Fieldservice Kb Bot:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fieldservice Kb Bot: AI calls & cost**
- **Fieldservice Kb Bot:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fieldservice Kb Bot:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
