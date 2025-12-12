const fetch = require("node-fetch");
const kleur = require("kleur");

const gitlabRequest = async ({ method, endpoint, body, gitlabUrl, token }) => {
  const url = `${gitlabUrl}/api/v4${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error( kleur.red( `${method} ${endpoint} failed: ${res.status} ${res.statusText}\n${text}` ) );
  }

  return res.json();
};

module.exports = { gitlabRequest };
