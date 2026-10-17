/* Line icons drawn for the landing page; they inherit the text color. */

type Props = { className?: string };

function Icon({ className = "size-6", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const icons = {
  balance: (p: Props) => (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 14h3M8 17h6" />
      <circle cx="16.5" cy="15" r="2" />
    </Icon>
  ),
  halfDay: (p: Props) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  region: (p: Props) => (
    <Icon {...p}>
      <path d="M12 21s-6-5.5-6-10.5a6 6 0 0 1 12 0C18 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </Icon>
  ),
  approve: (p: Props) => (
    <Icon {...p}>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Icon>
  ),
  calendar: (p: Props) => (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7 14h2M11 14h2M15 14h2M7 17.5h2M11 17.5h2" />
    </Icon>
  ),
  chat: (p: Props) => (
    <Icon {...p}>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 10h8M8 13h5" />
    </Icon>
  ),
  feed: (p: Props) => (
    <Icon {...p}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18.5h4M9 8h6M9 11h6M9 14h3" />
    </Icon>
  ),
  bridge: (p: Props) => (
    <Icon {...p}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M12 2.5v1.2M12 14.3v1.2M5.5 9h1.2M17.3 9h1.2M7.4 4.4l.9.9M15.7 12.7l.9.9M7.4 13.6l.9-.9M15.7 5.3l.9-.9" />
      <path d="M3 20c3-2.5 6-2.5 9 0s6 2.5 9 0" />
    </Icon>
  ),
  lock: (p: Props) => (
    <Icon {...p}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.5" />
    </Icon>
  ),
  check: (p: Props) => (
    <Icon {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  ),
};

export type IconName = keyof typeof icons;
