import React from "react";
import {
  Icon as RawIcon,
} from "@iconify/react/dist/iconify.js";

export * from "@iconify/react/dist/iconify.js";

type RawIconProps = React.ComponentProps<typeof RawIcon>;
type LocalIconName = string;
type SvgIconProps = React.SVGProps<SVGSVGElement>;

function SvgIcon({
  children,
  className,
  color,
  height,
  style,
  title,
  width,
  ...rest
}: SvgIconProps & { color?: string; title?: string }) {
  const resolvedWidth = width ?? height ?? 24;
  const resolvedHeight = height ?? width ?? 24;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      height={resolvedHeight}
      role={title ? "img" : "presentation"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      style={{ color, ...style }}
      viewBox="0 0 24 24"
      width={resolvedWidth}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

function DashboardGridIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </SvgIcon>
  );
}

function BookIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 4.5h7.5a3.5 3.5 0 0 1 3.5 3.5v11H9a3 3 0 0 0-3 3V4.5Z" />
      <path d="M6 4.5h-.5A2.5 2.5 0 0 0 3 7v11.5A2.5 2.5 0 0 0 5.5 21H9" />
      <path d="M8.5 8.5h6" />
      <path d="M8.5 12h6" />
    </SvgIcon>
  );
}

function BookBookmarkIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V4.5Z" />
      <path d="M5 4.5h-.5A2.5 2.5 0 0 0 2 7v12a2 2 0 0 0 2 2h4" />
      <path d="M13 5.5v6l-2-1.5-2 1.5v-6" />
    </SvgIcon>
  );
}

function HomeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V20h11V10.5" />
      <path d="M10 20v-5h4v5" />
    </SvgIcon>
  );
}

function LibraryIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 5h3v14H5z" />
      <path d="M10 4h4v15h-4z" />
      <path d="M16 6h3v13h-3z" />
      <path d="M4 20h16" />
    </SvgIcon>
  );
}

function CopyIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="8" y="5" width="11" height="13" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </SvgIcon>
  );
}

function IdCardIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="10" r="2" />
      <path d="M5.5 15c.7-1.5 2-2.5 3.5-2.5S11.8 13.5 12.5 15" />
      <path d="M14 9h4" />
      <path d="M14 13h4" />
    </SvgIcon>
  );
}

function LayersIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 4 4 8l8 4 8-4-8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </SvgIcon>
  );
}

function BuildingIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H12v15" />
      <path d="M12 20V9.5A1.5 1.5 0 0 1 13.5 8H19v12" />
      <path d="M8 9h.01" />
      <path d="M8 12h.01" />
      <path d="M8 15h.01" />
      <path d="M16 12h.01" />
      <path d="M16 15h.01" />
      <path d="M3 20h18" />
    </SvgIcon>
  );
}

function UsersIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="9" cy="9" r="3" />
      <path d="M4.5 18c1-2.5 2.8-4 4.5-4s3.5 1.5 4.5 4" />
      <path d="M15.5 7.5a2.5 2.5 0 1 1 0 5" />
      <path d="M17.5 18c-.5-1.5-1.4-2.7-2.8-3.5" />
    </SvgIcon>
  );
}

function ReceiptIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 4h12v16l-2-1-2 1-2-1-2 1-2-1-2 1V4Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </SvgIcon>
  );
}

function CalendarIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="m12 14 0 4" />
      <path d="m10 16h4" />
    </SvgIcon>
  );
}

function BookmarkIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
    </SvgIcon>
  );
}

function BookmarkSquareIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 7h6a1 1 0 0 1 1 1v9l-4-2-4 2V8a1 1 0 0 1 1-1Z" />
    </SvgIcon>
  );
}

function WalletIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2H6.5A2.5 2.5 0 0 1 4 6.5Z" />
      <path d="M4 9h16v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5V9Z" />
      <path d="M16 14h2" />
    </SvgIcon>
  );
}

function SettingsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2" />
      <path d="M12 18.3v2.2" />
      <path d="m5.6 5.6 1.6 1.6" />
      <path d="m16.8 16.8 1.6 1.6" />
      <path d="M3.5 12h2.2" />
      <path d="M18.3 12h2.2" />
      <path d="m5.6 18.4 1.6-1.6" />
      <path d="m16.8 7.2 1.6-1.6" />
    </SvgIcon>
  );
}

function ChatIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-9A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 3v-3Z" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
    </SvgIcon>
  );
}

function ReviewIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v7A1.5 1.5 0 0 1 17.5 15H11l-4 3v-3H6.5A1.5 1.5 0 0 1 5 13.5v-7Z" />
      <path d="m12 8.5.9 1.9 2.1.3-1.5 1.4.4 2.1L12 13.2l-1.9 1 .4-2.1-1.5-1.4 2.1-.3.9-1.9Z" />
    </SvgIcon>
  );
}

function ArrowLeftIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m10 7-5 5 5 5" />
    </SvgIcon>
  );
}

function ArrowRightIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </SvgIcon>
  );
}

function ArrowDownIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <path d="m7 14 5 5 5-5" />
    </SvgIcon>
  );
}

function ArrowDownRightIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 7h10v10" />
      <path d="m7 17 10-10" />
    </SvgIcon>
  );
}

function BellIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 10a5 5 0 1 1 10 0v3.5l1.5 2.5h-13L7 13.5V10Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </SvgIcon>
  );
}

function ClockIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </SvgIcon>
  );
}

function MinimizeSquareIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 16h8" />
    </SvgIcon>
  );
}

function HourglassIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 4h10" />
      <path d="M7 20h10" />
      <path d="M8 4c0 3 2.5 4.5 4 6 1.5 1.5 4 3 4 6" />
      <path d="M16 4c0 3-2.5 4.5-4 6-1.5 1.5-4 3-4 6" />
    </SvgIcon>
  );
}

function CheckCircleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5.1" />
    </SvgIcon>
  );
}

function CloseCircleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </SvgIcon>
  );
}

function DangerCircleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 16h.01" />
    </SvgIcon>
  );
}

function DangerTriangleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 4 21 19H3L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </SvgIcon>
  );
}

function EyeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </SvgIcon>
  );
}

function KeyIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="8" cy="12" r="3" />
      <path d="M11 12h10" />
      <path d="M17 12v-2" />
      <path d="M20 12v-2" />
    </SvgIcon>
  );
}

function SearchIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </SvgIcon>
  );
}

function PenIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m4 20 4.5-1 9-9a2 2 0 0 0-2.8-2.8l-9 9L4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </SvgIcon>
  );
}

function TrashIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </SvgIcon>
  );
}

function ShieldIcon({
  variant = "check",
  ...props
}: SvgIconProps & { variant?: "check" | "cross" | "plus" }) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.8 7.6 7 10 4.2-2.4 7-5.5 7-10V6l-7-3Z" />
      {variant === "check" ? <path d="m9 12 2 2 4-4" /> : null}
      {variant === "cross" ? (
        <>
          <path d="m9.5 9.5 5 5" />
          <path d="m14.5 9.5-5 5" />
        </>
      ) : null}
      {variant === "plus" ? (
        <>
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </>
      ) : null}
    </SvgIcon>
  );
}

function ShieldCheckIcon(props: SvgIconProps) {
  return <ShieldIcon {...props} variant="check" />;
}

function ShieldCrossIcon(props: SvgIconProps) {
  return <ShieldIcon {...props} variant="cross" />;
}

function ShieldPlusIcon(props: SvgIconProps) {
  return <ShieldIcon {...props} variant="plus" />;
}

function StarIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z" />
    </SvgIcon>
  );
}

function PlusCircleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </SvgIcon>
  );
}

function UserPlusIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="10" cy="8.5" r="3" />
      <path d="M4.5 18c1.2-2.6 3.1-4 5.5-4 2.4 0 4.3 1.4 5.5 4" />
      <path d="M19 8v5" />
      <path d="M16.5 10.5h5" />
    </SvgIcon>
  );
}

function ListIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M8 7h11" />
      <path d="M8 12h11" />
      <path d="M8 17h11" />
      <circle cx="4.5" cy="7" r=".5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r=".5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r=".5" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

function MapPointIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </SvgIcon>
  );
}

function NoteAddIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M7 4h7l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v4h4" />
      <path d="M12 11v5" />
      <path d="M9.5 13.5h5" />
    </SvgIcon>
  );
}

function RefreshIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18 11A7 7 0 0 0 6 7" />
      <path d="M6 13a7 7 0 0 0 12 4" />
    </SvgIcon>
  );
}

function getLocalIcon(name: LocalIconName) {
  switch (name) {
    case "solar:widget-2-bold-duotone":
    case "solar:widget-4-linear":
      return DashboardGridIcon;
    case "solar:book-2-bold":
    case "solar:book-2-bold-duotone":
    case "solar:book-bold":
      return BookIcon;
    case "solar:book-bookmark-bold":
    case "solar:book-bookmark-bold-duotone":
    case "solar:book-bookmark-minimalistic-bold-duotone":
      return BookBookmarkIcon;
    case "solar:home-2-bold":
      return HomeIcon;
    case "solar:library-bold":
    case "solar:library-bold-duotone":
      return LibraryIcon;
    case "solar:copy-bold-duotone":
      return CopyIcon;
    case "solar:user-id-bold-duotone":
      return IdCardIcon;
    case "solar:layers-bold-duotone":
      return LayersIcon;
    case "solar:buildings-2-bold-duotone":
      return BuildingIcon;
    case "solar:users-group-rounded-bold-duotone":
      return UsersIcon;
    case "solar:bill-list-bold":
    case "solar:bill-list-bold-duotone":
      return ReceiptIcon;
    case "solar:calendar-mark-bold-duotone":
    case "solar:calendar-add-bold-duotone":
      return CalendarIcon;
    case "solar:bookmark-bold":
    case "solar:bookmark-bold-duotone":
      return BookmarkIcon;
    case "solar:bookmark-square-minimalistic-bold-duotone":
      return BookmarkSquareIcon;
    case "solar:wallet-money-bold":
    case "solar:wallet-money-bold-duotone":
      return WalletIcon;
    case "solar:settings-bold-duotone":
      return SettingsIcon;
    case "solar:chat-round-dots-bold-duotone":
    case "solar:chat-round-line-bold":
      return ChatIcon;
    case "solar:chat-square-like-bold-duotone":
      return ReviewIcon;
    case "solar:alt-arrow-left-linear":
    case "solar:arrow-left-bold":
    case "solar:arrow-left-bold-duotone":
      return ArrowLeftIcon;
    case "solar:alt-arrow-right-linear":
    case "solar:arrow-right-bold":
      return ArrowRightIcon;
    case "solar:alt-arrow-down-linear":
      return ArrowDownIcon;
    case "solar:round-arrow-right-down-linear":
      return ArrowDownRightIcon;
    case "solar:bell-bold":
    case "solar:bell-bold-duotone":
      return BellIcon;
    case "solar:alarm-bold-duotone":
    case "solar:alarm-pause-bold":
    case "solar:clock-circle-bold":
      return ClockIcon;
    case "solar:hourglass-bold":
      return HourglassIcon;
    case "solar:check-circle-bold":
    case "solar:check-circle-bold-duotone":
      return CheckCircleIcon;
    case "solar:close-circle-bold":
      return CloseCircleIcon;
    case "solar:minimize-square-2-linear":
      return MinimizeSquareIcon;
    case "solar:danger-circle-bold":
    case "solar:danger-circle-bold-duotone":
      return DangerCircleIcon;
    case "solar:danger-triangle-bold":
    case "solar:shield-warning-bold-duotone":
      return DangerTriangleIcon;
    case "solar:eye-bold":
      return EyeIcon;
    case "solar:key-minimalistic-square-bold":
      return KeyIcon;
    case "solar:magnifer-bold":
    case "solar:magnifer-linear":
      return SearchIcon;
    case "solar:pen-bold":
    case "solar:pen-new-square-linear":
      return PenIcon;
    case "solar:trash-bin-trash-bold":
    case "solar:trash-bin-trash-linear":
      return TrashIcon;
    case "solar:shield-check-bold":
      return ShieldCheckIcon;
    case "solar:shield-cross-bold":
      return ShieldCrossIcon;
    case "solar:shield-plus-bold":
      return ShieldPlusIcon;
    case "solar:star-bold":
    case "solar:stars-bold":
      return StarIcon;
    case "solar:add-circle-bold":
      return PlusCircleIcon;
    case "solar:user-plus-bold":
      return UserPlusIcon;
    case "solar:list-bold":
      return ListIcon;
    case "solar:map-point-bold":
      return MapPointIcon;
    case "solar:note-add-bold-duotone":
      return NoteAddIcon;
    case "solar:refresh-bold":
      return RefreshIcon;
    default:
      return null;
  }
}

export const Icon = React.forwardRef<SVGSVGElement, RawIconProps>(function Icon(
  {
    icon,
    color,
    height,
    width,
    className,
    style,
    rotate,
    hFlip,
    vFlip,
    flip,
    inline,
    mode,
    ssr,
    onLoad,
    ...rest
  },
  ref,
) {
  if (typeof icon === "string") {
    const LocalIcon = getLocalIcon(icon);

    if (LocalIcon) {
      return (
        <LocalIcon
          className={className}
          color={color}
          height={height}
          style={style}
          width={width}
          {...rest}
        />
      );
    }
  }

  return (
    <RawIcon
      ref={ref}
      className={className}
      color={color}
      flip={flip}
      hFlip={hFlip}
      height={height}
      icon={icon}
      inline={inline}
      mode={mode}
      onLoad={onLoad}
      rotate={rotate}
      ssr={ssr}
      style={style}
      vFlip={vFlip}
      width={width}
      {...rest}
    />
  );
});
