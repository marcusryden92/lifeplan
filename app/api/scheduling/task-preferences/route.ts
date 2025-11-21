import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      plannerId,
      taskType,
      preferredDays,
      avoidDays,
      preferredStartTime,
      preferredEndTime,
      priority,
      energyLevel,
      allowFlexibility,
    } = body;

    // Verify planner ownership
    const planner = await db.planner.findFirst({
      where: { id: plannerId, userId: session.user.id },
    });

    if (!planner) {
      return new NextResponse("Planner not found", { status: 404 });
    }

    // Upsert preferences
    const preferences = await db.taskPreferences.upsert({
      where: { plannerId },
      update: {
        taskType,
        preferredDays,
        avoidDays,
        preferredStartTime,
        preferredEndTime,
        priority,
        energyLevel,
        allowFlexibility,
      },
      create: {
        plannerId,
        taskType,
        preferredDays,
        avoidDays,
        preferredStartTime,
        preferredEndTime,
        priority,
        energyLevel,
        allowFlexibility,
      },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error saving task preferences:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plannerId = searchParams.get("plannerId");

    if (!plannerId) {
      return new NextResponse("Missing plannerId", { status: 400 });
    }

    // Verify planner ownership
    const planner = await db.planner.findFirst({
      where: { id: plannerId, userId: session.user.id },
    });

    if (!planner) {
      return new NextResponse("Planner not found", { status: 404 });
    }

    const preferences = await db.taskPreferences.findUnique({
      where: { plannerId },
    });

    return NextResponse.json(preferences || {});
  } catch (error) {
    console.error("Error fetching task preferences:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
