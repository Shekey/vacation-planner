// Letters NFKD does not decompose into a base letter.
const special: Record<string, string> = { đ: "d", ł: "l", ø: "o", ß: "ss", æ: "ae", œ: "oe" };

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[đłøßæœ]/g, (c) => special[c])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** Returns `base`, or `base-2`, `base-3`, ... whichever is not taken. */
export async function uniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "workspace";
  let candidate = base;
  for (let n = 2; await isTaken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}
