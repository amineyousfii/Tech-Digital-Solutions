# Chatbot proxy

The website chatbot sends messages to this Cloudflare Worker, which calls Gemini with a key kept as a Worker secret. The site itself (GitHub Pages) never sees the key.

## 1. Revoke the old key first

The previous key was committed to `app.js` and is still in this repository's public git history. Removing it from the code does not make it safe.

1. Open [Google AI Studio → API keys](https://aistudio.google.com/apikey) and delete the old key.
2. Create a new key. Restrict it to the Generative Language API, and set a usage quota or budget alert in Google Cloud.
3. If your visitors are in the EU, use a billing-enabled (paid) project. Check the current Gemini API terms on how prompts and images are used on the free tier.

## 2. Deploy the Worker

From this `worker/` folder:

```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, for example `https://tds-chat.<your-subdomain>.workers.dev`.

## 3. Point the site at it

In `app.js`, set `CHAT_API_URL` to that URL, then publish the site. Until you do, the chat button stays hidden, so the site never sends messages to an address you don't control.

## Configuration

`wrangler.toml` holds:

- `ALLOWED_ORIGINS`: the sites allowed to call the proxy. Update it whenever the site moves to a new domain (for example a custom domain on GitHub Pages). For local testing, override it on the command line instead of editing this file: `npx wrangler dev --var ALLOWED_ORIGINS:http://127.0.0.1:8765`. Put a local key in `worker/.dev.vars`, which `.gitignore` keeps out of git.
- `GEMINI_MODEL`: the model ID. Use a stable ID listed in AI Studio; `-latest` aliases can change without warning.
- `RATE_LIMITER` and `GLOBAL_RATE_LIMITER`: approximate limits of 20 messages per minute per visitor (IPv6 visitors per /64) and 200 per minute for the whole site. Both are required: without them the Worker refuses requests rather than run unmetered.

Also set a request quota on the Google Cloud project as a final backstop. Image requests decode up to 6 MB per call, which can exceed the Workers Free plan CPU limit; use the Workers Paid plan if image chats fail.

## Tests

```bash
node --test worker/
```

Gemini is mocked, so no key or network is needed.

The assistant's business facts (services, plans, prices, contact details) live in `SYSTEM_INSTRUCTION` in `chat-proxy.js`. Update them there whenever pricing changes.
