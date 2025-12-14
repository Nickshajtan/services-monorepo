const fetch = require("node-fetch");
const kleur = require("kleur");

const githubRequest = async ({ method, endpoint, body, token }) => {
  const url = `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "labels-sync-script"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error( kleur.red( `${method} ${endpoint} failed: ${res.status} ${res.statusText}\n${text}`) );
  }

  return res.json();
};

module.exports = { githubRequest };
