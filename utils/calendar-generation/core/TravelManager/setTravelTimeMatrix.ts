import { TravelTimeEntry } from "../../models/SchedulingModels";

export function setTravelTimeMatrix(
  travelTimeMatrix: Map<string, TravelTimeEntry> | null,
  newMatrix: Map<string, TravelTimeEntry> | null
): Map<string, TravelTimeEntry> | null {
  return newMatrix;
}
