import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    if (!user.role) return apiError("Forbidden", 403);

    const { id } = await context.params;

    const existing = await prisma.heroCatalog.findUnique({ where: { id } });
    if (!existing) return apiError("Hero not found", 404);

    await prisma.heroCatalog.delete({ where: { id } });

    return apiSuccess({ message: "Hero removed" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete hero";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Hero catalog DELETE error:", error);
    return apiError(message, 500);
  }
}
