import type { Locale } from "./config";
import { account } from "./messages/account";
import { approvals } from "./messages/approvals";
import { billing } from "./messages/billing";
import { book } from "./messages/book";
import { calendar } from "./messages/calendar";
import { chat } from "./messages/chat";
import { common } from "./messages/common";
import { email } from "./messages/email";
import { errors } from "./messages/errors";
import { holidays } from "./messages/holidays";
import { home } from "./messages/home";
import { invite } from "./messages/invite";
import { landing } from "./messages/landing";
import { legal } from "./messages/legal";
import { me } from "./messages/me";
import { members } from "./messages/members";
import { newWorkspace } from "./messages/newWorkspace";
import { overview } from "./messages/overview";
import { people } from "./messages/people";
import { settings } from "./messages/settings";
import { signIn } from "./messages/signIn";
import { workspace } from "./messages/workspace";

export * from "./config";

const NAMESPACES = {
  account,
  approvals,
  billing,
  book,
  calendar,
  chat,
  common,
  email,
  errors,
  holidays,
  home,
  invite,
  landing,
  legal,
  me,
  members,
  newWorkspace,
  overview,
  people,
  settings,
  signIn,
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
