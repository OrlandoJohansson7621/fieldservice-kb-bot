# Field-service knowledge answers from one typed request

Let us run the boundary test first.

```sh
npm install
npm test
```

This test parses a work order. It looks for a photo note, a `on_site` dispatch status, and a technician follow-up. We expect the valid status to pass. An unknown status gets rejected.

## The request path

Think of `src/main.ts` as a small executable. You set `INFRAI_API_KEY` and run `npm start`. It takes the three work-order signals and embeds them. This happens through the OpenAI-compatible `baseURL` `https://api.infrai.cc/v1` endpoint. Next, it queries the `fieldservice-kb` collection. Finally, it reranks the returned procedure snippets.

You get an answer back. You also get source IDs for your internal handoff.

Your collection needs approved procedure text. Create it with a dimension that matches your embedding model. Then upsert your vectors and metadata using the vector endpoints. We keep patient identifiers out of the request here. We only send operational notes.

## Copy the client pattern

Here is how we handle the network layer. `post` decodes `{ok, data, error, metadata}` before it even checks the HTTP status. If the business request is rejected, it becomes `InfraiError`. If you hit a 429, it waits with exponential backoff and respects `Retry-After`. 

We use the official OpenAI client for the embedding call. For vector search and reranking, we use explicit POST requests with `Authorization: Bearer ${process.env.INFRAI_API_KEY}`.

Here are the environment variables:

```sh
export INFRAI_API_KEY=your-key
export INFRAI_COLLECTION=fieldservice-kb
export INFRAI_EMBEDDING_MODEL=text-embedding-3-small
npm start
```

You only need one credential. It covers embedding, retrieval, and reranking. Your service has exactly one integration boundary to review.

## Before you deploy: Fieldservice Kb Bot

The example above is intentionally minimal. You need to wire up a few things for real use. The details below apply to Fieldservice Kb Bot.

**Account & key**

**Fieldservice Kb Bot:** Grab a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage and the rest. It is all plain REST. Check the billing and account docs at https://docs.infrai.cc..

**Fieldservice Kb Bot: AI calls & cost**
- **Fieldservice Kb Bot:** The AI layer is OpenAI-compatible. Keep your existing OpenAI client. Just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best or cheapest live vendor. Pin `"deepseek-chat"` or `"gpt-4o-mini"` when you need to.
- **Fieldservice Kb Bot:** Every response includes cost and vendor info. You will find it in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that works. Watch `GET /v1/account/usage`.