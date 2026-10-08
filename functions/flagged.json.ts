// Cloudflare Pages Function for alps.wtf/flagged.json, the list of flagged wallets that the site and the
// Discord bot read. The live list is the "flagged" key in the FLAGS KV namespace (alps-flags), so a wallet
// can be flagged without a rebuild: edit it in the Cloudflare dashboard or with
// packages/nouns-webapp/scripts/flags.mjs. If KV has no valid list, the copy deployed with the site
// (packages/nouns-webapp/src/utils/moderation/flagged.json) is served instead.
//
// wrangler deploys the functions/ folder of the directory it runs in, the repo root.

interface Env {
  FLAGS?: { get(key: string, options?: { cacheTtl?: number }): Promise<string | null> };
}

const isFlagList = (text: string) => {
  try {
    const list = JSON.parse(text);
    return (
      Array.isArray(list?.wallets) &&
      list.wallets.every(
        (w: any) => /^0x[0-9a-fA-F]{40}$/.test(w?.address) && typeof w?.reason === 'string',
      )
    );
  } catch {
    return false;
  }
};

export const onRequestGet = async ({
  env,
  next,
}: {
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const stored = await env.FLAGS?.get('flagged', { cacheTtl: 60 }).catch(() => null);
  if (!stored || !isFlagList(stored)) return next();
  return new Response(stored, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
};
