import { Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

type StatusBadgeColor =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

interface StatusBadgeProps {
  label: string;
  color?: StatusBadgeColor;
  icon?: string;
  variant?: "solid" | "flat" | "bordered" | "dot" | "faded" | "shadow";
  className?: string;
}

export function StatusBadge({
  label,
  color = "default",
  icon,
  variant = "flat",
  className,
}: StatusBadgeProps) {
  return (
    <Chip
      className={className}
      color={color}
      startContent={icon ? <Icon icon={icon} width={14} /> : undefined}
      variant={variant}
    >
      {label}
    </Chip>
  );
}

export default StatusBadge;
