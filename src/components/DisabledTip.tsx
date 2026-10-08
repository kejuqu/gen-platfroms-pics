"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 禁用原因提示：包裹会被禁用的按钮，禁用时 hover 展示原因。
 * 原生 disabled 按钮不触发鼠标事件，所以 trigger 挂在包裹层 span 上。
 */
export function DisabledTip({
  reason,
  children,
}: {
  reason: string | null;
  children: React.ReactNode;
}) {
  if (!reason) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">{children}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
