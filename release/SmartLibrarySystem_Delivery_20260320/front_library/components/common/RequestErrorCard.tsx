import { Button, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";

interface RequestErrorCardProps {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  bodyClassName?: string;
}

export function RequestErrorCard({
  title,
  message,
  retryLabel = "重试",
  onRetry,
  className,
  bodyClassName = "py-12 text-center text-danger-700",
}: RequestErrorCardProps) {
  return (
    <Card className={className || "border border-danger-200 bg-danger-50 shadow-none"}>
      <CardBody className={bodyClassName}>
        <Icon icon="solar:danger-circle-bold-duotone" width={40} className="mx-auto mb-3" />
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
        {onRetry ? (
          <Button className="mt-4" color="danger" variant="flat" onPress={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
