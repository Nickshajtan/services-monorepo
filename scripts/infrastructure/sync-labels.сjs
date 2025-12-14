const fs = require("fs");
const path = require("path");
const kleur = require("kleur");

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error(kleur.red("TOKEN not set"));
  process.exit(1);
}

const ACTIONS = {
  list: "list",
  create: "create",
  update: "update",
  delete: "delete",
};

const main = async (makeRequest, labelsPath) => {
  const desiredLabels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
  console.log(kleur.blue(`Desired labels: ${desiredLabels.length}`));

  const desiredMap = new Map(
    desiredLabels.map((label) => [label.name.toLowerCase(), label])
  );

  let page = 1;
  const perPage = 100;
  const existingLabels = [];
  while (true) {
    const pageLabels = await makeRequest({
      action: ACTIONS.list,
      body: { page, perPage },
    });
    if (!pageLabels.length) break;
    existingLabels.push(...pageLabels);
    page++;
  }

  const existingMap = new Map(
    existingLabels.map((label) => [label.name.toLowerCase(), label])
  );

  for (const { name, color, description = "" } of desiredLabels) {
    const key = name.toLowerCase();
    const existingLabel = existingMap.get(key);

    if (!existingLabel) {
      console.log(kleur.blue(`Creating label: ${name}`));
      await makeRequest({
        action: ACTIONS.create,
        body: {
          name,
          color: color.replace("#", ""),
          description,
        },
      });
    } else {
      const existingColorNorm = (existingLabel.color || "")
        .replace("#", "")
        .toLowerCase();
      const desiredColorNorm = color.replace("#", "").toLowerCase();
      const needsUpdate =
        existingColorNorm !== desiredColorNorm ||
        description !== (existingLabel.description || "");

      if (needsUpdate) {
        console.log(kleur.blue(`Updating label: ${name}`));
        await makeRequest({
          action: ACTIONS.update,
          body: {
            name,
            color: color.replace("#", ""),
            description,
          },
          existingLabel,
        });
      } else {
        console.log(kleur.green(`Label up-to-date: ${name}`));
      }
    }
  }

  const deleteExtra = process.env.DELETE_EXTRA_LABELS === "true";
  if (deleteExtra) {
    for (const existingLabel of existingLabels) {
      const key = existingLabel.name.toLowerCase();
      if (!desiredMap.has(key)) {
        console.log(kleur.blue(`Deleting extra label: ${existingLabel.name}`));
        await makeRequest({
          action: ACTIONS.delete,
          existingLabel,
        });
      }
    }
  }

  console.log(kleur.green("Done syncing labels."));
  process.exit(0);
};

// ---------------------- GITHUB ----------------------
if (process.env.GITHUB_ACTIONS === "true") {
  const REPO = process.env.GITHUB_REPOSITORY;
  if (!REPO) {
    console.error(kleur.red("GITHUB_REPOSITORY not set"));
    process.exit(1);
  }

  const [owner, repo] = REPO.split("/");
  const { githubRequest } = require("./utils/github.utils");
  const baseEndpoint = `/repos/${owner}/${repo}/labels`;
  const makeRequest = async ({ action, body, existingLabel }) => {
    let data = { token: TOKEN };

    if (action === ACTIONS.list) {
      data = {
        ...data,
        method: "GET",
        endpoint: `${baseEndpoint}?per_page=${body.perPage}&page=${body.page}`,
      };
    }

    if (action === ACTIONS.create) {
      data = {
        ...data,
        method: "POST",
        endpoint: baseEndpoint,
        body: {
          name: body.name,
          color: body.color,
          description: body.description || "",
        },
      };
    }

    if (action === ACTIONS.update) {
      data = {
        ...data,
        method: "PATCH",
        endpoint: `${baseEndpoint}/${encodeURIComponent(existingLabel.name)}`,
        body: {
          new_name: body.name,
          color: body.color,
          description: body.description || "",
        },
      };
    }

    if (action === ACTIONS.delete) {
      data = {
        ...data,
        method: "DELETE",
        endpoint: `${baseEndpoint}/${encodeURIComponent(existingLabel.name)}`,
      };
    }

    return githubRequest(data);
  };

  main(makeRequest, path.join(process.cwd(), ".github", "labels.json")).catch(
    (err) => {
      console.error(kleur.red(err));
      process.exit(1);
    }
  );
} else if (process.env.GITLAB_CI === "true") {
  // ---------------------- GITLAB ----------------------
  const GITLAB_PROJECT_ID = process.env.GITLAB_PROJECT_ID;
  const GITLAB_URL = process.env.GITLAB_URL || "https://gitlab.com";
  if (!GITLAB_PROJECT_ID) {
    console.error(kleur.red("GITLAB_PROJECT_ID not set"));
    process.exit(1);
  }

  const { gitlabRequest } = require("./utils/gitlab.utils");
  const baseEndpoint = `/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/labels`;
  const makeRequest = async ({ action, body, existingLabel }) => {
    let data = { gitlabUrl: GITLAB_URL, token: TOKEN };

    if (action === ACTIONS.list) {
      data = {
        ...data,
        method: "GET",
        endpoint: `${baseEndpoint}?per_page=${body.perPage}&page=${body.page}`,
      };
    }

    if (action === ACTIONS.create) {
      data = {
        ...data,
        method: "POST",
        endpoint: baseEndpoint,
        body: {
          name: body.name,
          color: `#${body.color}`,
          description: body.description || "",
        },
      };
    }

    if (action === ACTIONS.update) {
      data = {
        ...data,
        method: "PUT",
        endpoint: baseEndpoint,
        body: {
          name: existingLabel.name,
          new_name: body.name,
          color: `#${body.color}`,
          description: body.description || "",
        },
      };
    }

    if (action === ACTIONS.delete) {
      data = {
        ...data,
        method: "DELETE",
        endpoint: `${baseEndpoint}?name=${encodeURIComponent(existingLabel.name)}`,
      };
    }

    return gitlabRequest(data);
  };

  main(makeRequest, path.join(process.cwd(), ".gitlab", "labels.json")).catch(
    (err) => {
      console.error(kleur.red(err));
      process.exit(1);
    }
  );
} else {
  console.log(kleur.yellow("Nothing happened..."));
}
