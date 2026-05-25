"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { MapPin, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { LocationList } from "@/components/locations/LocationList";
import { AddLocationDialog } from "@/components/locations/AddLocationDialog";
import { TravelTimeMatrix } from "@/components/locations/TravelTimeMatrix";
import * as locationActions from "@/actions/locations";
import type { Location, TravelTime } from "@/types/prisma";
import type { TransportMode } from "@/prisma/generated/client";
import { setLocations as setLocationsInRedux } from "@/redux/slices/schedulingSettingsSlice";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";

const TRANSPORT_MODES: { value: TransportMode; label: string }[] = [
  { value: "DRIVING", label: "Driving" },
  { value: "TRANSIT", label: "Public Transit" },
  { value: "BICYCLING", label: "Bicycling" },
  { value: "WALKING", label: "Walking" },
];

const MAX_LOCATIONS = 10;

export default function LocationsPage() {
  const dispatch = useDispatch();
  const [locations, setLocations] = useState<Location[]>([]);
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("DRIVING");
  const [loading, setLoading] = useState(true);
  const [fetchingTimes, setFetchingTimes] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTravelTimes();
  }, [transportMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [locs, defaultMode] = await Promise.all([
        locationActions.fetchLocations(),
        locationActions.getDefaultTransportMode(),
      ]);

      setLocations(locs);
      setTransportMode(defaultMode);

      // Sync locations to Redux so LocationSelector components see the updated list
      const serializedLocations: SerializedLocation[] = locs.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address || "",
        placeId: loc.placeId,
      }));
      dispatch(setLocationsInRedux(serializedLocations));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTravelTimes = async () => {
    try {
      const times = await locationActions.fetchTravelTimesByMode(transportMode);
      setTravelTimes(times);
    } catch (err) {
      console.error("Failed to load travel times:", err);
    }
  };

  const handleAddLocation = async (
    name: string,
    placeId: string,
    sessionToken?: string
  ) => {
    try {
      setError(null);
      const newLocation = await locationActions.createLocation({
        name,
        placeId,
        sessionToken,
      });
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);

      // Sync to Redux so LocationSelector components immediately see the new location
      const serializedLocations: SerializedLocation[] = updatedLocations.map(
        (loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address || "",
          placeId: loc.placeId,
        })
      );
      dispatch(setLocationsInRedux(serializedLocations));

      setSuccessMessage(`"${name}" added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    }
  };

  const handleUpdateLocationName = async (locationId: string, name: string) => {
    try {
      setError(null);
      const updated = await locationActions.updateLocationName(
        locationId,
        name
      );
      const updatedLocations = locations.map((loc) =>
        loc.id === locationId ? updated : loc
      );
      setLocations(updatedLocations);

      // Sync to Redux so LocationSelector components see the updated name
      const serializedLocations: SerializedLocation[] = updatedLocations.map(
        (loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address || "",
          placeId: loc.placeId,
        })
      );
      dispatch(setLocationsInRedux(serializedLocations));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update location"
      );
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      setError(null);
      await locationActions.deleteLocation(locationId);
      const updatedLocations = locations.filter((loc) => loc.id !== locationId);
      setLocations(updatedLocations);

      // Sync to Redux so LocationSelector components see the deletion
      const serializedLocations: SerializedLocation[] = updatedLocations.map(
        (loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address || "",
          placeId: loc.placeId,
        })
      );
      dispatch(setLocationsInRedux(serializedLocations));

      // Also remove related travel times from state
      setTravelTimes((prev) =>
        prev.filter(
          (tt) =>
            tt.fromLocationId !== locationId && tt.toLocationId !== locationId
        )
      );
      setSuccessMessage("Location deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete location"
      );
    }
  };

  const handleFetchTravelTimes = async () => {
    if (locations.length < 2) {
      setError("Add at least 2 locations to fetch travel times");
      return;
    }

    try {
      setFetchingTimes(true);
      setError(null);

      const result =
        await locationActions.fetchMissingTravelTimes(transportMode);

      if (result.fetched > 0) {
        setSuccessMessage(
          `Fetched ${result.fetched} travel time${result.fetched > 1 ? "s" : ""}!`
        );
      } else {
        setSuccessMessage("All travel times are up to date!");
      }

      await loadTravelTimes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch travel times"
      );
    } finally {
      setFetchingTimes(false);
    }
  };

  const handleRefreshAllTravelTimes = async () => {
    if (locations.length < 2) {
      setError("Add at least 2 locations to refresh travel times");
      return;
    }

    try {
      setFetchingTimes(true);
      setError(null);

      const result = await locationActions.refreshAllTravelTimes(transportMode);

      setSuccessMessage(`Refreshed ${result.updated} travel times!`);
      await loadTravelTimes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh travel times"
      );
    } finally {
      setFetchingTimes(false);
    }
  };

  const handleTransportModeChange = async (mode: TransportMode) => {
    setTransportMode(mode);
    try {
      await locationActions.updateDefaultTransportMode(mode);
    } catch (err) {
      console.error("Failed to save transport mode preference:", err);
    }
  };

  const handleUpdateTravelTimeOverride = async (
    travelTimeId: string,
    period: "rush" | "regular" | "night",
    value: number | null
  ) => {
    try {
      setError(null);
      const overrides: {
        customRushHourMinutes?: number | null;
        customRegularMinutes?: number | null;
        customNightMinutes?: number | null;
      } = {};

      if (period === "rush") overrides.customRushHourMinutes = value;
      if (period === "regular") overrides.customRegularMinutes = value;
      if (period === "night") overrides.customNightMinutes = value;

      const updated = await locationActions.updateTravelTimeOverride(
        travelTimeId,
        overrides
      );

      setTravelTimes((prev) =>
        prev.map((tt) => (tt.id === travelTimeId ? updated : tt))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update travel time"
      );
    }
  };

  if (loading) {
    return (
      <div className="pageContainer bg-white mx-auto py-8 w-full">
        <div className="flex flex-col ml-20 max-w-[900px]">
          <p className="text-muted-foreground">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer overflow-y-auto bg-white mx-auto py-8 w-full">
      <div className="flex flex-col ml-20 max-w-[900px]">
        <div className="space-y-2 mb-8">
          <h1 className="my-6 text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground">
            Manage your frequently visited locations and travel times between
            them for smarter scheduling.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        {/* Locations List */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Saved Locations ({locations.length}/{MAX_LOCATIONS})
                </CardTitle>
                <CardDescription>
                  Add your home, office, gym, and other frequently visited
                  places
                </CardDescription>
              </div>
              <Button
                onClick={() => setAddDialogOpen(true)}
                disabled={locations.length >= MAX_LOCATIONS}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LocationList
              locations={locations}
              onUpdateName={handleUpdateLocationName}
              onDelete={handleDeleteLocation}
            />
          </CardContent>
        </Card>

        {/* Transport Mode & Travel Times */}
        {locations.length >= 2 && (
          <>
            {/* Transport Mode Selector */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Transport Mode</CardTitle>
                <CardDescription>
                  Select your primary mode of transportation for travel time
                  calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={transportMode}
                  onValueChange={(v) =>
                    handleTransportModeChange(v as TransportMode)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Travel Time Matrix */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Travel Time Matrix</CardTitle>
                    <CardDescription>
                      Travel times in minutes between your locations. Click a
                      cell to customize.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleFetchTravelTimes}
                      disabled={fetchingTimes}
                      className="gap-2"
                    >
                      {fetchingTimes ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Fetch Travel Times
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRefreshAllTravelTimes}
                      disabled={fetchingTimes || travelTimes.length === 0}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TravelTimeMatrix
                  locations={locations}
                  travelTimes={travelTimes}
                  onUpdateOverride={handleUpdateTravelTimeOverride}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Add Location Dialog */}
        <AddLocationDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddLocation}
        />
      </div>
    </div>
  );
}
