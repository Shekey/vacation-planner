import type { Locale } from "./config";
import { account } from "./messages/account";
import { adminOverview } from "./messages/adminOverview";
import { approvals } from "./messages/approvals";
import { audit } from "./messages/audit";
import { billing } from "./messages/billing";
import { book } from "./messages/book";
import { calendar } from "./messages/calendar";
import { chat } from "./messages/chat";
import { common } from "./messages/common";
import { email } from "./messages/email";
import { errors } from "./messages/errors";
import { holidays } from "./messages/holidays";
import { home } from "./messages/home";
import { importer } from "./messages/importer";
import { invite } from "./messages/invite";
import { landing } from "./messages/landing";
import { leaveTypes } from "./messages/leaveTypes";
import { legal } from "./messages/legal";
import { me } from "./messages/me";
import { members } from "./messages/members";
import { newWorkspace } from "./messages/newWorkspace";
import { outlook } from "./messages/outlook";
import { overview } from "./messages/overview";
import { people } from "./messages/people";
import { settings } from "./messages/settings";
import { signIn } from "./messages/signIn";
import { superadmin } from "./messages/superadmin";
import { twoFactor } from "./messages/twoFactor";
import { workspace } from "./messages/workspace";

export * from "./config";

const NAMESPACES = {
  account,
  adminOverview,
  approvals,
  audit,
  billing,
  book,
  calendar,
  chat,
  common,
  email,
  errors,
  holidays,
  home,
  importer,
  invite,
  landing,
  leaveTypes,
  legal,
  me,
  members,
  newWorkspace,
  outlook,
  overview,
  people,
  settings,
  signIn,
  superadmin,
  twoFactor,
  workspace,
};

export type Messages = { [K in keyof typeof NAMESPACES]: (typeof NAMESPACES)[K]["en"] };

const cache = new Map<Locale, Messages>();

/** All UI text in one language. Synchronous and client-safe, so shared components can take a `locale` prop. */
export function messagesFor(locale: Locale): Messages {
  let m = cache.get(locale);
  if (!m) {
    m = Object.fromEntries(Object.entries(NAMESPACES).map(([k, v]) => [k, v[locale]])) as Messages;
    cache.set(locale, m);
  }
  return m;
}
