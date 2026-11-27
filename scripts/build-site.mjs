import { cp, mkdir } from "node:fs/promises";

// Only public assets enter the deployment; source, credentials and drafts stay out.
await mkdir("dist", { recursive: true });
for (const name of ["index.html", "style.css", "app.js", "projects", "research-log", "research-progress"]) {
  await cp(name, `dist/${name}`, { recursive: true });
}
