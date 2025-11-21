/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { StrategyRuleType } from "@/prisma/generated/client";
import type { Prisma } from "@/prisma/generated/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json()) as {
      name: string;
      description: string;
      isActive: boolean;
      isDefault: boolean;
      rules: Array<{
        ruleType: StrategyRuleType;
        weight: number;
        config: Prisma.InputJsonValue;
      }>;
    };
    const { name, description, isActive, isDefault, rules } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.schedulingStrategy.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create strategy
    const strategy = await db.schedulingStrategy.create({
      data: {
        userId: session.user.id,
        name,
        description,
        isActive,
        isDefault,
        rules: {
          create: rules.map((rule, index: number) => ({
            ruleType: rule.ruleType,
            weight: rule.weight,
            config: rule.config,
            order: index,
          })),
        },
      },
      include: {
        rules: true,
      },
    });

    return NextResponse.json(strategy);
  } catch (error) {
    console.error("Error creating strategy:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(_req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const strategies = await db.schedulingStrategy.findMany({
      where: { userId: session.user.id },
      include: {
        rules: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(strategies);
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json()) as {
      id: string;
      name?: string;
      description?: string;
      isActive?: boolean;
      isDefault?: boolean;
      rules?: Array<{
        id?: string;
        ruleType: StrategyRuleType;
        weight: number;
        config: Prisma.InputJsonValue;
        order: number;
      }>;
    };
    const { id, rules, ...updates } = body;

    // Verify ownership
    const existingStrategy = await db.schedulingStrategy.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingStrategy) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await db.schedulingStrategy.updateMany({
        where: { userId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // If rules are provided, it's a full strategy update (editing)
    if (rules) {
      // Delete existing rules
      await db.strategyRule.deleteMany({
        where: { strategyId: id },
      });

      // Update strategy with new rules
      const strategy = await db.schedulingStrategy.update({
        where: { id },
        data: {
          ...updates,
          rules: {
            create: rules.map((rule) => ({
              ruleType: rule.ruleType,
              weight: rule.weight,
              config: rule.config,
              order: rule.order,
            })),
          },
        },
        include: {
          rules: true,
        },
      });

      return NextResponse.json(strategy);
    } else {
      // Simple property update (activate/deactivate, set default)
      const strategy = await db.schedulingStrategy.update({
        where: { id },
        data: updates,
        include: {
          rules: true,
        },
      });

      return NextResponse.json(strategy);
    }
  } catch (error) {
    console.error("Error updating strategy:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Try to get ID from query params first, then from body
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = (await req.json()) as { id?: string };
      id = body.id ?? null;
    }

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    // Verify ownership
    const strategy = await db.schedulingStrategy.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!strategy) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Delete strategy (rules will cascade)
    await db.schedulingStrategy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting strategy:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
