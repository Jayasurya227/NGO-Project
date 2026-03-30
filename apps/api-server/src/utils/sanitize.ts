/**
 * Recursively removes null bytes (\u0000) from string values in an object or array.
 * PostgreSQL does not allow null bytes in UTF-8 strings.
 */
export function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj.replace(/\u0000/g, '') as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize) as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = sanitize(obj[key]);
      }
    }
    return newObj as T;
  }

  return obj;
}
