/** How long a personal token (#45) can be valid, in days; shared with the account page's form. */
export const TOKEN_DAYS = [30, 90, 365] as const;
export type TokenDays = (typeof TOKEN_DAYS)[number];

export function isTokenDays(value: number): value is TokenDays {
  return (TOKEN_DAYS as readonly number[]).includes(value);
}
