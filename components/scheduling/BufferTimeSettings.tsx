"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { setBufferTimeMinutes as setBufferTimeInRedux } from "@/redux/slices/schedulingSettingsSlice";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { RootState } from "@/redux/store";

type ActionsModule = typeof import("@/actions/scheduling");

interface BufferTimeSettingsProps {
  actions: ActionsModule;
}

export function BufferTimeSettings({ actions }: BufferTimeSettingsProps) {
  const dispatch = useDispatch();
  const { manuallyRefreshCalendar } = useCalendarProvider();
  const reduxBufferTime = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes
  );

  const [bufferTimeMinutes, setBufferTimeMinutes] =
    useState<number>(reduxBufferTime);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  // Sync local state with Redux when it changes
  useEffect(() => {
    setBufferTimeMinutes(reduxBufferTime);
  }, [reduxBufferTime]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await actions.fetchUserSchedulingPreferences();
      if (prefs) {
        setBufferTimeMinutes(prefs.bufferTimeMinutes);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load preferences"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (bufferTimeMinutes < 0 || bufferTimeMinutes > 120) {
      setError("Buffer time must be between 0 and 120 minutes");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Save to database
      await actions.updateUserSchedulingPreferences({
        bufferTimeMinutes,
      });

      // Update Redux state
      dispatch(setBufferTimeInRedux(bufferTimeMinutes));

      // Refresh calendar with new buffer time
      manuallyRefreshCalendar();

      setSuccessMessage("Buffer time saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Buffer Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Buffer Time Between Items
        </CardTitle>
        <CardDescription>
          Set the minimum time gap between scheduled tasks and events to avoid
          back-to-back scheduling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
          <div className="flex gap-4 items-center">
            <Input
              id="bufferTime"
              type="number"
              min="0"
              max="120"
              step="5"
              value={bufferTimeMinutes}
              onChange={(e) => setBufferTimeMinutes(parseInt(e.target.value))}
              className="w-32"
            />
            <div className="text-sm text-muted-foreground">
              {bufferTimeMinutes === 0 ? (
                <span>No buffer time (items can be scheduled back-to-back)</span>
              ) : bufferTimeMinutes === 1 ? (
                <span>1 minute between items</span>
              ) : (
                <span>{bufferTimeMinutes} minutes between items</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Buffer Time
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 space-y-2 border-t">
          <p className="text-sm font-medium">How this works:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Adds breathing room between scheduled items</li>
            <li>• Helps prevent scheduling fatigue</li>
            <li>• Allows time for transitions between tasks</li>
            <li>• Recommended: 10-15 minutes for most schedules</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
