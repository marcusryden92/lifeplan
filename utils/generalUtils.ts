export function objectsAreEqual<T extends object>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => obj1[key as keyof T] === obj2[key as keyof T]);
}

export function safeParse<T>(data: unknown): T {
  let parsed: unknown = typeof data === "string" ? JSON.parse(data) : data;

  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed as T;
}
