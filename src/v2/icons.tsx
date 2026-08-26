import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps, children: React.ReactNode) {
  const { size = 20, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) =>
  base(p, <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />);

export const ListIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>,
  );

export const DialIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2" />
    </>,
  );

export const FlagIcon = (p: IconProps) =>
  base(p, <path d="M5 3v18M5 4h11l-2 4 2 4H5" />);

export const GearIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.4-2.4.7a8 8 0 0 0-1.7-1L14.8 3H9.2l-.5 2.8a8 8 0 0 0-1.7 1l-2.4-.7-2 3.4L4.6 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.4 2.4-.7a8 8 0 0 0 1.7 1l.5 2.8h5.6l.5-2.8a8 8 0 0 0 1.7-1l2.4.7 2-3.4-2-1.5Z" />
    </>,
  );

export const ClockIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>,
  );

export const WalletIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M16 12h3" />
    </>,
  );

export const RefreshIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 4v4h-4" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 20v-4h4" />
    </>,
  );

export const ChartIcon = (p: IconProps) =>
  base(p, <path d="M4 19V9m6 10V4m6 15v-7" />);

export const UserIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>,
  );

export const ChevronRightIcon = (p: IconProps) => base(p, <path d="m9 6 6 6-6 6" />);

export const CheckIcon = (p: IconProps) => base(p, <path d="M5 13l4 4L19 7" />);

export const PlusIcon = (p: IconProps) => base(p, <path d="M12 5v14M5 12h14" />);

export const CloudIcon = (p: IconProps) =>
  base(p, <path d="M7 18a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 12.5 3.5 3.5 0 0 1 17.5 18H7Z" />);

export const DownloadIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 19h16" />
    </>,
  );

export const UploadIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 21V9m0 0-4 4m4-4 4 4" />
      <path d="M4 19h16" />
    </>,
  );

export const HelpIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </>,
  );

export const PencilIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l4 4" />
    </>,
  );

export const TrashIcon = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </>,
  );

export const XIcon = (p: IconProps) => base(p, <path d="M6 6l12 12M18 6 6 18" />);

export const InfoCircleIcon = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>,
  );
