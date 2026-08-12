export default {
  async fetch(request, env) {
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Alethia is ready.", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
