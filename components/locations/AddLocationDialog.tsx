"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import * as locationActions from "@/actions/locations";

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, placeId: string, sessionToken?: string) => Promise<void>;
}

export function AddLocationDialog({
  open,
  onOpenChange,
  onAdd,
}: AddLocationDialogProps) {
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacePrediction | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate session token when dialog opens
  useEffect(() => {
    if (open) {
      locationActions.createSessionToken().then(setSessionToken);
      // Reset state
      setName("");
      setSearchQuery("");
      setPredictions([]);
      setSelectedPlace(null);
      setError(null);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery || searchQuery.length < 2) {
      setPredictions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await locationActions.searchPlaces(
          searchQuery,
          sessionToken ?? undefined
        );
        setPredictions(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, sessionToken]);

  const handleSelectPlace = (prediction: PlacePrediction) => {
    setSelectedPlace(prediction);
    setSearchQuery(prediction.description);
    setPredictions([]);

    // Auto-fill name from main text if not already set
    if (!name) {
      setName(prediction.mainText);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlace) {
      setError("Please select a location from the search results");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a name for this location");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onAdd(name.trim(), selectedPlace.placeId, sessionToken ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Add Location
          </DialogTitle>
          <DialogDescription>
            Search for an address and give it a friendly name like &quot;Home&quot; or
            &quot;Office&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Address Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Address</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                id="search"
                placeholder="Start typing an address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedPlace && e.target.value !== selectedPlace.description) {
                    setSelectedPlace(null);
                  }
                }}
                className="pl-10"
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {predictions.length > 0 && !selectedPlace && (
              <div className="border rounded-md shadow-lg bg-popover max-h-60 overflow-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    onClick={() => handleSelectPlace(prediction)}
                    className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                  >
                    <p className="font-medium text-sm">{prediction.mainText}</p>
                    <p className="text-xs text-muted-foreground">
                      {prediction.secondaryText}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedPlace && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location selected
              </p>
            )}
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              placeholder="e.g., Home, Office, Gym"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this location
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !selectedPlace || !name.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Location"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
