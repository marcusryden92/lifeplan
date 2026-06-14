"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui";
import * as locationActions from "@/actions/locations";
import {
  MODAL_FADE_MS,
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
  predictionMain,
  predictionSub,
  selectedHint,
  fieldHelp,
  errorBlock,
  footer,
  spinning,
} from "./AddLocationModal.css";

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, placeId: string, sessionToken?: string) => Promise<void>;
}

export function AddLocationModal({ open, onClose, onAdd }: AddLocationModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [dataState, setDataState] = useState<"open" | "closed">(
    open ? "open" : "closed",
  );

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const id = requestAnimationFrame(() => setDataState("open"));
      return () => cancelAnimationFrame(id);
    }
    setDataState("closed");
    const t = setTimeout(() => setShouldRender(false), MODAL_FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [predictionList, setPredictionList] = useState<Prediction[]>([]);
  const [selected, setSelected] = useState<Prediction | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset all draft state when the modal re-opens; Google Places session token
  // is regenerated so autocomplete suggestions are billed as a fresh session.
  useEffect(() => {
    if (!open) return;
    setName("");
    setQuery("");
    setPredictionList([]);
    setSelected(null);
    setError(null);
    setSearching(false);
    setSaving(false);
    locationActions
      .createSessionToken()
      .then(setSessionToken)
      .catch(() => setSessionToken(null));
  }, [open]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.length < 2 || selected) {
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
  }, [query, sessionToken, selected]);

  if (!shouldRender) return null;

  const handleSelect = (p: Prediction) => {
    setSelected(p);
    setQuery(p.description);
    setPredictionList([]);
    if (!name) setName(p.mainText);
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError("Pick a place from the search results.");
      return;
    }
    if (!name.trim()) {
      setError("Give this location a name.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onAdd(name.trim(), selected.placeId, sessionToken ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={overlay}
      data-state={dataState}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={modal}>
        <div className={header}>
          <h2 className={title}>Add location</h2>
          <span className={subtitle}>
            Search an address, then give it a friendly name like &ldquo;Home&rdquo; or
            &ldquo;Office&rdquo;.
          </span>
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Search address</span>
          <div className={searchWrap}>
            <span className={searchIcon}>
              <Search size={13} strokeWidth={2.2} />
            </span>
            <input
              className={textInput}
              placeholder="Start typing an address…"
              value={query}
              autoComplete="off"
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected && e.target.value !== selected.description) {
                  setSelected(null);
                }
              }}
            />
            {searching && (
              <span className={`${searchSpinner} ${spinning}`}>
                <Loader2 size={14} strokeWidth={2.2} />
              </span>
            )}
          </div>
          {predictionList.length > 0 && !selected && (
            <div className={predictions}>
              {predictionList.map((p) => (
                <button
                  key={p.placeId}
                  type="button"
                  className={predictionRow}
                  onClick={() => handleSelect(p)}
                >
                  <span className={predictionMain}>{p.mainText}</span>
                  <span className={predictionSub}>{p.secondaryText}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <span className={selectedHint}>
              <MapPin size={11} strokeWidth={2.2} />
              Place selected
            </span>
          )}
        </div>

        <div className={fieldStack}>
          <span className={fieldLabel}>Name</span>
          <input
            className={plainInput}
            placeholder="e.g. Home, Office, Gym"
            value={name}
            maxLength={50}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
          <span className={fieldHelp}>
            A short label you&apos;ll recognize when picking it on tasks and
            categories.
          </span>
        </div>

        {error && <div className={errorBlock}>{error}</div>}

        <div className={footer}>
          <Button variant="glass" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !selected || !name.trim()}
          >
            {saving ? "Adding…" : "Add location"}
          </Button>
        </div>
      </div>
    </div>
  );
}
