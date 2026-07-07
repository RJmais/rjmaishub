# H1 — Snippet de assinatura HMAC para os chatbots Ana/Sofia

Para colar no **backend** dos chatbots (o código que hoje faz `POST` em
`/webhooks/ana-lead` e `/webhooks/sofia-lead`). Usa o mesmo `WEBHOOK_SECRET`
configurado no Worker `rjmaishub-api`.

O Worker verifica: `X-RJ-Signature: sha256=<hex(HMAC_SHA256(secret, rawBody))>`.
A assinatura é sobre o **corpo exato** enviado — assine a mesma string que vai no `body`.

## Cloudflare Worker / Web Crypto (recomendado — igual ao lado do servidor)

```js
async function signBody(secret, rawBody) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  return "sha256=" + Array.from(sig).map(b => b.toString(16).padStart(2, "0")).join("");
}

// uso ao enviar o lead:
const rawBody = JSON.stringify({ email, name, phone, message, utmSource, utmCampaign, utmMedium });
const signature = await signBody(env.WEBHOOK_SECRET, rawBody);

await fetch("https://api.rjmais.com/webhooks/ana-lead", {  // ou /sofia-lead
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-RJ-Signature": signature,
  },
  body: rawBody,   // ⚠️ enviar EXATAMENTE a mesma string que foi assinada
});
```

## Node.js (se o chatbot rodar em Node)

```js
import { createHmac } from "node:crypto";
const rawBody = JSON.stringify({ email, name, phone /* ... */ });
const signature = "sha256=" + createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(rawBody).digest("hex");
// enviar rawBody com header X-RJ-Signature: signature
```

## Sequência de ativação (para NÃO derrubar captura de lead)

1. Gerar `WEBHOOK_SECRET` (já gerado em `src/api/.dev.vars` para dev).
2. **Primeiro** publicar os chatbots Ana e Sofia já assinando (com o secret).
3. **Só depois** setar `WEBHOOK_SECRET` no Worker de produção → enforcement liga.
   Enquanto o secret não existir no Worker, ele aceita não-assinado (rollout faseado)
   e loga aviso — nenhum lead é perdido.
4. Confirmar nos logs do Worker que não há mais `WEBHOOK_SECRET ausente` nem
   `bad_signature`, então a migração está completa.
