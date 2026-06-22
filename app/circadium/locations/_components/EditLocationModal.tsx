"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Trash2, AlertTriangle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import * as locationActions from "@/actions/locations";
import { useListKeyboardNav } from "@/hooks/useListKeyboardNav";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";
import {
  overlay,
  modal,
  header,
  title,
  subtitle,
  fieldStack,
  fieldLabel,
  searchWrap,
  searchIcon,
  searchSpinner,
  textInput,
  plainInput,
  predictions,
  predictionRow,
  predictionRowActive,
  predictionMain,
  predictionSub,
  selectedHint,
  cascadeNote,
  placeMessageSlot,
  errorSlot,
  errorBlock,
  footer,
  dangerSlot,
  spinning,
} from "./EditLocationModal.css";

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface EditLocationDraft {
  name: string;
  placeId?: string;
  sessionToken?: string;
}

interface EditLocationModalProps {
  open: boolean;
  location: SerializedLocation | null;
  onClose: () => void;
  onSave: (draft: EditLocationDraft) => Promise<void>;
  onRequestDelete: () => void;
}

export function EditLocationModal({
  open,
  location,
  onClose,
  onSave,
  onRequestDelete,
}: EditLocationModalProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [predictionList, setPredictionList] = useState<Prediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Prediction | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of the address shown when the modal opened. Any edit that ends
  // up matching this string is treated as "no change" and the search stays
  // quiet.
  const originalAddressRef = useRef("");

  // Reset draft state on (re)open. Session token regenerates so the
  // autocomplete suggestions are billed against a fresh session if the
  // user actually switches the place.
  useEffect(() => {
    if (!open || !location) return;
    const addr = location.address || "";
    setName(location.name);
    setQuery(addr);
    originalAddressRef.current = addr;
    setPredictionList([]);
    setSelectedPlace(null);
    setError(null);
    setSearching(false);
    setSaving(false);
    setSessionToken(null);
    locationActions
      .createSessionToken()
      .then(setSessionToken)
      .catch(() => setSessionToken(null));
  }, [open, location]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (
      !query ||
      query.length < 2 ||
      query === originalAddressRef.current ||
      selectedPlace
    ) {
      setPredictionList([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await locationActions.searchPlaces(
          query,
          sessionToken ?? undefined,
        );
        setPredictionList(results);
      } catch (err) {
        console.error("Place search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, sessionToken, selectedPlace]);

  const handleSelect = (p: Prediction) => {
    setSelectedPlace(p);
    setQuery(p.description);
    setPredictionList([]);
  };

  const predictionsVisible = predictionList.length > 0 && !selectedPlace;
  const keyboardNav = useListKeyboardNav<Prediction>(
    predictionsVisible ? predictionList : [],
    handleSelect,
  );

  if (!location) return null;

  const nameChanged = name.trim() !== "" && name.trim() !== location.name;
  // Picking the prediction for the same place (e.g. typing the original
  // address back into autocomplete) isn't a real change. Compare against the
  // current placeId so re-confirming doesn't trigger a cascade.
  const placeChanged =
    !!selectedPlace && selectedPlace.placeId !== location.placeId;
  const canSave = nameChanged || placeChanged;

  const handleSubmit = async () => {
    if (!canSave) {
      onClose();
      return;
    }
    if (!name.trim()) {
      setError("Give this location a name.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: name.trim(),
        placeId: placeChanged ? selectedPlace?.placeId : undefined,
        sessionToken: placeChanged ? sessionToken ?? undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={modal} aria-describedby={undefined}>
        <div className={header}>
          <Dialog.Title className={title}>Edit location</Dialog.Title>
          <span className={subtitle}>
            Rename it or point it at a different address. Changing the address
            drops the travel times to and from this location so they get
            re-fetched.
          </span>
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Name</span>
          <input
            className={plainInput}
            placeholder="e.g. Home, Office, Gym"
            value={name}
            maxLength={50}
            autoComplete="off"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Address</span>
          <div className={searchWrap}>
            <span className={searchIcon}>
              <MapPin size={13} strokeWidth={2} />
            </span>
            <input
              className={textInput}
              placeholder="Search for an address…"
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                if (
                  selectedPlace &&
                  e.target.value !== selectedPlace.description
                ) {
                  setSelectedPlace(null);
                }
              }}
              onKeyDown={keyboardNav.onKeyDown}
            />
            {searching && (
              <span className={`${searchSpinner} ${spinning}`}>
                <Loader2 size={14} strokeWidth={2.2} />
              </span>
            )}
            {predictionsVisible && (
              <div className={predictions} ref={keyboardNav.containerRef}>
                {predictionList.map((p, i) => (
                  <button
                    key={p.placeId}
                    type="button"
                    data-knav-index={i}
                    className={`${predictionRow} ${
                      keyboardNav.activeIndex === i ? predictionRowActive : ""
                    }`}
                    onMouseEnter={() => keyboardNav.setActiveIndex(i)}
                    onClick={() => handleSelect(p)}
                  >
                    <span className={predictionMain}>{p.mainText}</span>
                    <span className={predictionSub}>{p.secondaryText}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={placeMessageSlot}>
            {placeChanged && (
              <>
                <span className={selectedHint}>
                  <MapPin size={11} strokeWidth={2.2} />
                  New place selected
                </span>
                <div className={cascadeNote}>
                  <AlertTriangle size={12} strokeWidth={2.2} />
                  Saving will drop every travel time touching this location.
                  You can refetch from the matrix.
                </div>
              </>
            )}
          </div>
        </div>

        <div className={errorSlot}>
          {error && <div className={errorBlock}>{error}</div>}
        </div>

        <div className={footer}>
          <span className={dangerSlot}>
            <Button variant="glass" size="sm" onClick={onRequestDelete}>
              <Trash2 size={12} strokeWidth={2.2} />
              Delete
            </Button>
          </span>
          <Button variant="glass" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="glassInk"
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !canSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
