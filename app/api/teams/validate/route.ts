import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const tag = searchParams.get("tag")?.trim().toUpperCase();

  let nameAvailable = true;
  let nameMessage: string | null = null;
  let tagAvailable = true;
  let tagMessage: string | null = null;

  if (name) {
    if (name.length < 3 || name.length > 50) {
      nameAvailable = false;
      nameMessage = "Team name must be 3-50 characters";
    } else {
      const existingName = await prisma.team.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existingName) {
        nameAvailable = false;
        nameMessage = "This team name is already taken";
      }
    }
  }

  if (tag) {
    if (!/^[A-Z0-9]{3,5}$/.test(tag)) {
      tagAvailable = false;
      tagMessage = "Tag must be 3-5 uppercase alphanumeric characters";
    } else {
      const existingTag = await prisma.team.findFirst({
        where: {
          tag: { equals: tag, mode: "insensitive" },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existingTag) {
        tagAvailable = false;
        tagMessage = "This tag is already taken";
      }
    }
  }

  return apiSuccess({
    nameAvailable,
    nameMessage,
    tagAvailable,
    tagMessage,
  });
}
