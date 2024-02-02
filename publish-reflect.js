import { spawn } from "child_process";
import fs from "fs";

run();

async function run() {
  // Could do in parallel but output harder to read that way.
  await publish(
    "loop-orchestrator",
    "./reflect/orchestrator/server.ts",
    "NEXT_PUBLIC_ORCHESTRATOR_SERVER"
  );
  await publish(
    "loop-share",
    "./reflect/share/server.ts",
    "NEXT_PUBLIC_SHARE_SERVER"
  );
  await publish(
    "loop-play",
    "./reflect/play/server.ts",
    "NEXT_PUBLIC_PLAY_SERVER"
  );

  console.log("Wrote .env");
  console.log(fs.readFileSync("./.env").toString());
}

async function publish(appBaseName, serverPath, envVar) {
  const refName = getEnv(
    process.env.VERCEL_GIT_COMMIT_REF,
    "VERCEL_GIT_COMMIT_REF"
  );

  const appName = `${appBaseName}-${refName}`
    .toLowerCase()
    .replace(/^[^a-z]/, "")
    .replace(/[^a-z0-9-]/g, "-");

  const output = await runCommand("npx", [
    "reflect",
    "publish",
    `--app=${appName}`,
    `--server-path=${serverPath}`,
    "--reflect-channel=canary",
    "--auth-key-from-env=REFLECT_AUTH_KEY",
  ]);
  const lines = output.toString().split("\n");
  const success = lines.findIndex((line) =>
    line.includes("🎁 Published successfully to:")
  );
  const url = lines[success + 1];

  fs.appendFileSync("./.env", `${envVar}=${url}` + "\n");
}

function runCommand(command, args) {
  console.log("running command: " + command + " " + args.join(" "));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
      process.stdout.write(data);
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve(output);
      }
    });
  });
}

function getEnv(v, name) {
  if (!v) {
    throw new Error("Missing required env var: " + name);
  }
  return v;
}
