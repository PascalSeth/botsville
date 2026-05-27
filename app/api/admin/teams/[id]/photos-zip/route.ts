import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json() as { playerIds?: string[]; includeLogo?: boolean };
    const playerIds: string[] = body.playerIds ?? [];
    const includeLogo = body.includeLogo ?? true;

    if (playerIds.length === 0 && !includeLogo) {
      return apiError("No player IDs provided", 400);
    }

    const [players, team] = await Promise.all([
      playerIds.length > 0
        ? prisma.player.findMany({
            where: { id: { in: playerIds }, teamId: id, deletedAt: null },
            select: {
              id: true,
              ign: true,
              photo: true,
              user: { select: { photo: true } },
            },
          })
        : Promise.resolve([]),
      includeLogo
        ? prisma.team.findUnique({ where: { id }, select: { logo: true, tag: true } })
        : Promise.resolve(null),
    ]);

    const zip = new JSZip();
    let added = 0;

    async function addToZip(url: string, filename: string) {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : contentType.includes("webp") ? "webp" : "jpg";
        const buf = await res.arrayBuffer();
        zip.file(`${filename}.${ext}`, buf);
        added++;
      } catch {
        // skip images that fail to fetch
      }
    }

    await Promise.all([
      ...players.map((player) => {
        const photoUrl = player.photo ?? player.user?.photo ?? null;
        if (!photoUrl) return Promise.resolve();
        const safe = player.ign.replace(/[^a-zA-Z0-9_\-]/g, "_");
        return addToZip(photoUrl, safe);
      }),
      ...(team?.logo ? [addToZip(team.logo, "logo")] : []),
    ]);

    if (added === 0) {
      return apiError("No images could be downloaded", 422);
    }

    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="team-${id}-photos.zip"`,
      },
    });
  } catch (error) {
    console.error("Photos zip error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to generate zip",
      500
    );
  }
}
