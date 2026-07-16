"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  sheetOverlay,
  sheet,
  sheetHandle,
  sheetTitle,
  sheetBody,
} from "./BottomSheet.css";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheetOverlay} />
        <Dialog.Content className={sheet} aria-describedby={undefined}>
          <span className={sheetHandle} aria-hidden />
          <Dialog.Title className={sheetTitle}>{title}</Dialog.Title>
          <div className={sheetBody}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
