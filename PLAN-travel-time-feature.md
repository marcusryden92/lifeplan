# Travel Time & Location Management Feature - Implementation Plan

## Overview

This feature adds geographical location awareness to the scheduling system, enabling:
1. User-defined locations (home, office, gym, etc.)
2. Google Places API integration for address validation
3. Pre-calculated travel times between all location pairs
4. Location-aware scheduling with travel time blocks

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  Settings Page          │  Task/Planner Forms                   │
│  - Location CRUD        │  - Location dropdown selector         │
│  - Transportation mode  │  - "Everywhere" default option        │
│  - Travel time matrix   │                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server Actions                             │
├─────────────────────────────────────────────────────────────────┤
│  actions/locations.ts                                           │
│  - createLocation() → Google Places API → save + calculate      │
│  - deleteLocation() → cascade delete travel times               │
│  - fetchLocations()                                             │
│  - fetchTravelTimeMatrix()                                      │
│  - recalculateTravelTimes()                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database (Prisma)                         │
├─────────────────────────────────────────────────────────────────┤
│  Location                │  TravelTime                          │
│  - id, name, address     │  - fromLocationId, toLocationId      │
│  - placeId, lat, lng     │  - rushHourMinutes                   │
│  - userId                │  - regularMinutes                    │
│                          │  - nightMinutes                      │
│                          │  - transportMode                     │
├─────────────────────────────────────────────────────────────────┤
│  Planner (extended)      │  UserSchedulingPreferences (extended)│
│  - locationId (optional) │  - defaultTransportMode              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Calendar Generation                          │
├─────────────────────────────────────────────────────────────────┤
│  LocationGroupingStrategy (new)                                 │
│  - Scores slots higher when same-location tasks are grouped     │
│  - Penalizes location transitions that require travel           │
│                                                                 │
│  CalendarGenerator (modified)                                   │
│  - Injects "Travel" events between location transitions         │
│  - Uses time-of-day to select appropriate travel duration       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### New Models (prisma/schemas/models/location.prisma)

```prisma
model Location {
  id          String   @id @default(cuid())
  name        String                          // "Home", "Office", etc.
  address     String                          // Full formatted address
  placeId     String                          // Google Place ID
  lat         Float                           // Latitude
  lng         Float                           // Longitude
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations to travel times (this location as origin or destination)
  travelTimesFrom TravelTime[] @relation("FromLocation")
  travelTimesTo   TravelTime[] @relation("ToLocation")

  @@unique([userId, placeId])  // Prevent duplicate locations per user
  @@map("Locations")
}

model TravelTime {
  id               String        @id @default(cuid())
  fromLocationId   String
  toLocationId     String
  transportMode    TransportMode
  rushHourMinutes  Int           // 7-9 AM, 5-7 PM weekdays
  regularMinutes   Int           // Other daytime hours
  nightMinutes     Int           // 9 PM - 6 AM
  userId           String
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  fromLocation     Location @relation("FromLocation", fields: [fromLocationId], references: [id], onDelete: Cascade)
  toLocation       Location @relation("ToLocation", fields: [toLocationId], references: [id], onDelete: Cascade)

  @@unique([fromLocationId, toLocationId, transportMode])
  @@map("TravelTimes")
}

enum TransportMode {
  DRIVING
  TRANSIT
  BICYCLING
  WALKING
}
```

### Schema Extensions

**calendar.prisma - Planner model:**
```prisma
model Planner {
  // ... existing fields ...
  locationId  String?    // Optional FK to Location
  location    Location?  @relation(fields: [locationId], references: [id], onSetNull)
}
```

**scheduling.prisma - UserSchedulingPreferences:**
```prisma
model UserSchedulingPreferences {
  // ... existing fields ...
  defaultTransportMode TransportMode @default(DRIVING)
}
```

---

## Phase 2: Google API Integration

### Required APIs
- **Places API (New)** - Address autocomplete and place details
- **Distance Matrix API** - Travel time calculations

### Environment Variables (.env)
```
GOOGLE_PLACES_API_KEY=""
```

### Server-Side API Utilities (lib/google-api.ts)

```typescript
// Place autocomplete for address search
async function searchPlaces(query: string, sessionToken: string): Promise<PlacePrediction[]>

// Get place details (coordinates, formatted address)
async function getPlaceDetails(placeId: string): Promise<PlaceDetails>

// Calculate travel times between two points
async function getTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportMode,
  departureTime: 'rush_hour' | 'regular' | 'night'
): Promise<{ durationMinutes: number }>

// Batch calculate all travel times for a new location
async function calculateTravelTimeMatrix(
  newLocation: Location,
  existingLocations: Location[],
  transportMode: TransportMode
): Promise<TravelTimeEntry[]>
```

### API Cost Optimization
- Use session tokens for Places Autocomplete (reduces costs)
- Batch Distance Matrix requests (up to 25 origins × 25 destinations per request)
- Cache results in database - only recalculate when locations change
- With 10 locations max: 10×10×3 = 300 travel times maximum per user

---

## Phase 3: Server Actions

### New File: actions/locations.ts

```typescript
"use server";

// Fetch all locations for current user
export async function fetchLocations(): Promise<Location[]>

// Search for places (autocomplete) - proxied through server
export async function searchPlaces(query: string): Promise<PlacePrediction[]>

// Create new location with travel time calculation
export async function createLocation(data: {
  name: string;
  placeId: string;
}): Promise<Location>
// Side effect: Calculates travel times to/from all existing locations

// Delete location (cascade deletes travel times)
export async function deleteLocation(locationId: string): Promise<void>

// Update location name
export async function updateLocationName(locationId: string, name: string): Promise<Location>

// Fetch travel time matrix
export async function fetchTravelTimeMatrix(): Promise<TravelTimeMatrix>

// Recalculate all travel times (e.g., when changing transport mode)
export async function recalculateTravelTimes(): Promise<void>

// Assign location to planner item
export async function assignLocationToPlanner(
  plannerId: string,
  locationId: string | null  // null = "Everywhere"
): Promise<Planner>
```

---

## Phase 4: Scheduling Strategy

### New Strategy: LocationGroupingStrategy

**File: utils/calendar-generation/strategies/LocationGroupingStrategy.ts**

```typescript
export class LocationGroupingStrategy implements SchedulingStrategy {
  readonly name = "location_grouping";

  constructor(
    private travelTimeMatrix: Map<string, Map<string, TravelTimeEntry>>,
    private weight: number = 0.6
  ) {}

  score(task: Planner, slot: TimeSlot, context: SchedulingContext): number {
    // If task has no location, neutral score
    if (!task.locationId) return 0.5;

    // Find the previous scheduled event (before this slot)
    const prevEvent = this.findPreviousEvent(slot.start, context);

    // Find the next scheduled event (after this slot)
    const nextEvent = this.findNextEvent(slot.end, context);

    let score = 0.5; // Neutral base

    // Bonus for same location as previous event
    if (prevEvent?.locationId === task.locationId) {
      score += 0.3;
    }

    // Bonus for same location as next event
    if (nextEvent?.locationId === task.locationId) {
      score += 0.2;
    }

    // Penalty based on travel time required
    if (prevEvent?.locationId && prevEvent.locationId !== task.locationId) {
      const travelTime = this.getTravelTime(prevEvent.locationId, task.locationId, slot.start);
      // Larger travel times reduce score
      score -= Math.min(0.3, travelTime / 120); // Max 0.3 penalty for 2+ hour commute
    }

    return Math.max(0, Math.min(1, score));
  }
}
```

### Constants Extension (constants.ts)

```typescript
export const STRATEGY_WEIGHTS = {
  // ... existing weights ...
  LOCATION_GROUPING_WEIGHT: 0.6,  // New weight for location-based scoring
};

export const LOCATION_CONFIG = {
  MAX_LOCATIONS: 10,
  RUSH_HOUR_MORNING_START: 7,   // 7 AM
  RUSH_HOUR_MORNING_END: 9,     // 9 AM
  RUSH_HOUR_EVENING_START: 17,  // 5 PM
  RUSH_HOUR_EVENING_END: 19,    // 7 PM
  NIGHT_START: 21,              // 9 PM
  NIGHT_END: 6,                 // 6 AM
};
```

### CalendarGenerator Modifications

1. **Add travel time context to SchedulingContext:**
```typescript
interface SchedulingContext {
  // ... existing fields ...
  travelTimeMatrix?: Map<string, Map<string, TravelTimeEntry>>;
  userTransportMode?: TransportMode;
}
```

2. **Post-scheduling travel event injection:**
```typescript
private injectTravelEvents(
  events: SimpleEvent[],
  travelTimeMatrix: Map<string, Map<string, TravelTimeEntry>>,
  transportMode: TransportMode
): SimpleEvent[] {
  // Sort events by start time
  // For each consecutive pair with different locations:
  //   - Calculate required travel time based on time of day
  //   - Insert a "Travel" event between them
  //   - If insufficient gap exists, flag as warning
}
```

---

## Phase 5: UI Components

### 5.1 Location Settings Page

**File: app/(protected)/settings/locations/page.tsx**

Features:
- List of saved locations with edit/delete
- "Add Location" form with Google Places autocomplete
- Transport mode selector (driving/transit/bicycling/walking)
- Travel time matrix visualization (optional)
- Maximum 10 locations indicator

### 5.2 Location Autocomplete Component

**File: components/locations/LocationAutocomplete.tsx**

- Debounced input for Google Places search
- Dropdown with place suggestions
- Selection triggers place details fetch

### 5.3 Location Selector for Tasks

**File: components/locations/LocationSelector.tsx**

- Dropdown component for planner items
- Options: "Everywhere" (default) + user's locations
- Can be added to TaskEditForm.tsx

### 5.4 Travel Time Display

**File: components/events/TravelEventContent.tsx**

- Special styling for "Travel" events in calendar
- Shows origin → destination
- Shows duration and transport mode icon

---

## Phase 6: Redux State (Optional)

If locations need to be accessed frequently across components:

**File: redux/slices/locationsSlice.ts**

```typescript
interface LocationsState {
  locations: Location[];
  travelTimeMatrix: TravelTimeMatrix | null;
  defaultTransportMode: TransportMode;
  isLoaded: boolean;
}
```

---

## Implementation Order

### Step 1: Database & Types
1. Create `prisma/schemas/models/location.prisma`
2. Update `calendar.prisma` with locationId on Planner
3. Update `scheduling.prisma` with defaultTransportMode
4. Run `npx prisma generate` and `npx prisma db push`
5. Add types to `types/prisma.d.ts`

### Step 2: Google API Integration
1. Add `GOOGLE_PLACES_API_KEY` to `.env.example` and `.env`
2. Create `lib/google-api.ts` with API utilities
3. Test with sample requests

### Step 3: Server Actions
1. Create `actions/locations.ts`
2. Implement CRUD operations
3. Implement travel time calculation

### Step 4: Location Settings UI
1. Create locations settings page
2. Create LocationAutocomplete component
3. Create location list management UI

### Step 5: Task Location Assignment
1. Create LocationSelector component
2. Integrate into TaskEditForm
3. Update planner sync handlers

### Step 6: Scheduling Integration
1. Create LocationGroupingStrategy
2. Add to CompositeStrategy in CalendarGenerator
3. Implement travel event injection
4. Add travel time context to SchedulingContext

### Step 7: Travel Events Display
1. Style travel events in calendar
2. Add travel event content component

### Step 8: Testing & Refinement
1. Test with various location configurations
2. Validate travel time calculations
3. Tune strategy weights

---

## API Cost Estimates

**Google Places API:**
- Autocomplete: ~$2.83 per 1000 requests
- Place Details: ~$17 per 1000 requests

**Distance Matrix API:**
- ~$5 per 1000 elements (origin-destination pairs)

**Per User Estimate (10 locations, single transport mode):**
- Initial setup: ~10 place details = $0.17
- Travel matrix: 10×9 = 90 pairs (excludes self-referential) = $0.45
- Adding 6th location to existing 5: only 10 new pairs = $0.05
- Total one-time cost for full matrix: ~$0.62

---

## Notes & Considerations

1. **"Everywhere" Default:** Tasks without locations don't affect grouping strategy and don't generate travel events.

2. **Plan Items:** Fixed-time appointments should also support locations since they affect travel time needs.

3. **Templates:** Event templates could optionally have locations (e.g., "Office Work" template at office location).

4. **Travel Times are Stored, Not Computed On-the-Fly:**
   - User adds locations, then clicks "Fetch Travel Times" button → results stored in `TravelTime` table
   - Calendar generation reads from DB - **never calls Google API during scheduling**
   - Adding a new location (e.g., 6th) only fetches NEW pairs: 6↔1, 6↔2, 6↔3, 6↔4, 6↔5 (10 API calls, not 30)
   - Incremental fetching keeps API costs low

5. **Edge Cases:**
   - Same location consecutive tasks: No travel event needed
   - Location → Everywhere → Location: No travel events (can't determine)
   - First/last events of day: Optional home-based travel calculation

6. **Future Enhancements:**
   - Real-time traffic integration
   - Multiple transport mode comparison
   - "Work from home" location type
   - Location-based event suggestions
