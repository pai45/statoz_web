import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const env = {
  ...process.env,
  GITHUB_PAGES: "true",
  NEXT_PUBLIC_BASE_PATH:
    process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== "/"
      ? process.env.NEXT_PUBLIC_BASE_PATH
      : "/statoz_web",
};

const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const outDir = join(root, "out");
  if (existsSync(outDir)) {
    writeFileSync(join(outDir, ".nojekyll"), "");
  }
});
