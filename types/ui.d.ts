import { EventExtendedProps } from "@/types/prisma";

// Runtime/UI-only extensions for event extendedProps used by the calendar UI
export type RuntimeEventExtendedProps = EventExtendedProps & {
  // Category wrapper fields
  wrapperId?: string | null;
  categoryId?: string;
  isStrict?: boolean;
  // Link from scheduled tasks/plans to their category wrapper
  categoryWrapperId?: string | null;
  // Trespassing (overlap) indicators for UI borders
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
  // Template UI flag
  isTemplateItem?: boolean;
  // Travel-specific runtime fields (not persisted in Prisma schema)
  fromLocationId?: string | null;
  toLocationId?: string | null;
  travelMinutes?: number | null;
  insufficientTravel?: boolean;
  requiredTravelMinutes?: number | null;
};
