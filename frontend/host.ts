export function getReflectServer(val: string | undefined, name: string) {
  if (!val) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return val;
}
