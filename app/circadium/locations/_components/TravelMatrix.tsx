"use client";

import { MapPin, RefreshCw } from "lucide-react";
import type { TravelTime } from "@/types/prisma";
import type { TransportMode } from "@/lib/generated/db-client";

// Only id + name are needed for the matrix, so the prop accepts the narrower
// SerializedLocation shape kept in Redux as well as the full Prisma Location.
type MatrixLocation = { id: string; name: string };
import {
  matrixWrap,
  matrixTable,
  cornerCell,
  headerCell,
  headerCellInner,
  rowHeaderCell,
  cell,
  cellButton,
  cellSelf,
  periodRow,
  periodValue,
  periodValueRush,
  periodValueRegular,
  periodValueNight,
  periodLabel,
  customTag,
  missingBlock,
  missingLabel,
  missingHint,
  singleValue,
  singleValueNumber,
  singleValueUnit,
} from "./TravelMatrix.css";

interface TravelMatrixProps {
  locations: MatrixLocation[];
  travelTimes: TravelTime[];
  transportMode: TransportMode;
  onEditPair: (fromId: string, toId: string) => void;
  onFetchMissing: () => void;
}

// Time-of-day variance only matters for traffic-bound modes. Bike and walk
// have a single value, so the cell collapses to one number.
const TIME_VARYING_MODES = new Set<TransportMode>(["DRIVING", "TRANSIT"]);

export function TravelMatrix({
  locations,
  travelTimes,
  transportMode,
  onEditPair,
  onFetchMissing,
}: TravelMatrixProps) {
  const isTimeVarying = TIME_VARYING_MODES.has(transportMode);
  const lookup = new Map<string, TravelTime>();
  for (const tt of travelTimes) {
    lookup.set(`${tt.fromLocationId}->${tt.toLocationId}`, tt);
  }

  return (
    <div className={matrixWrap}>
      <table className={matrixTable}>
        <thead>
          <tr>
            <th className={cornerCell}>from / to</th>
            {locations.map((loc) => (
              <th key={loc.id} className={headerCell}>
                <span className={headerCellInner}>
                  <MapPin size={11} strokeWidth={2} />
                  {loc.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {locations.map((from) => (
            <tr key={from.id}>
              <th className={rowHeaderCell}>
                <span className={headerCellInner}>
                  <MapPin size={11} strokeWidth={2} />
                  {from.name}
                </span>
              </th>
              {locations.map((to) => {
                if (from.id === to.id) {
                  return (
                    <td key={to.id} className={cell}>
                      <div className={cellSelf}>/</div>
                    </td>
                  );
                }

                const tt = lookup.get(`${from.id}->${to.id}`);

                if (!tt) {
                  return (
                    <td key={to.id} className={cell}>
                      <button
                        type="button"
                        className={cellButton}
                        onClick={onFetchMissing}
                        title="Fetch this travel time"
                      >
                        <div className={missingBlock}>
                          <span className={missingLabel}>missing</span>
                          <span className={missingHint}>
                            <RefreshCw size={9} strokeWidth={2.4} />
                            fetch
                          </span>
                        </div>
                      </button>
                    </td>
                  );
                }

                const rush =
                  tt.customRushHourMinutes ?? tt.googleRushHourMinutes;
                const reg = tt.customRegularMinutes ?? tt.googleRegularMinutes;
                const night = tt.customNightMinutes ?? tt.googleNightMinutes;
                const hasCustom =
                  tt.customRushHourMinutes !== null ||
                  tt.customRegularMinutes !== null ||
                  tt.customNightMinutes !== null;

                return (
                  <td
                    key={to.id}
                    className={cell}
                    data-custom={hasCustom ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className={cellButton}
                      onClick={() => onEditPair(from.id, to.id)}
                    >
                      {isTimeVarying ? (
                        <>
                          <span className={periodRow}>
                            <span
                              className={`${periodValue} ${periodValueRegular}`}
                            >
                              {reg}
                            </span>
                            <span className={periodLabel}>reg</span>
                          </span>
                          <span className={periodRow}>
                            <span
                              className={`${periodValue} ${periodValueRush}`}
                            >
                              {rush}
                            </span>
                            <span className={periodLabel}>rush</span>
                          </span>
                          <span className={periodRow}>
                            <span
                              className={`${periodValue} ${periodValueNight}`}
                            >
                              {night}
                            </span>
                            <span className={periodLabel}>night</span>
                          </span>
                        </>
                      ) : (
                        <span className={singleValue}>
                          <span className={singleValueNumber}>{reg}</span>
                          <span className={singleValueUnit}>min</span>
                        </span>
                      )}
                      {hasCustom && (
                        <span className={customTag}>· CUSTOM ·</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
