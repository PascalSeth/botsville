import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { PollStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const statusUpper = status?.toUpperCase();
    const statusFilter =
      statusUpper === "ALL"
        ? undefined
        : statusUpper && Object.values(PollStatus).includes(statusUpper as PollStatus)
          ? (statusUpper as PollStatus)
          : PollStatus.ACTIVE;

    const polls = await prisma.poll.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: { options: true, _count: { select: { votes: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return apiSuccess({ polls });
  } catch (error: unknown) {
    console.error("Polls GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch polls", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { question, options, expiresAt, status } = body;

    if (!question || !Array.isArray(options) || options.length < 2) {
      return apiError("Question and at least 2 options are required");
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        status:
          status && Object.values(PollStatus).includes(status)
            ? status
            : PollStatus.ACTIVE,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: user.id,
        options: {
          create: options.map((text: string) => ({ text })),
        },
      },
      include: { options: true },
    });

    return apiSuccess({ message: "Poll created", poll }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create poll";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Polls POST error:", error);
    return apiError(message, 500);
  }
}
