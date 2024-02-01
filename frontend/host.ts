export function getReflectServer(template: string | undefined) {
  if (!template) {
    throw new Error("Environment variable is required");
  }
  return applyTemplate(template);
}

function applyTemplate(template: string) {
  const f = new Function(
    "NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF",
    `return \`${template}\``
  );
  const branchName = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? "";
  return f(branchName.replace(/[^a-zA-Z0-9]/g, "-"));
}
