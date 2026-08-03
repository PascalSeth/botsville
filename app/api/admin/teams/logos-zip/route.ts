import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const whereClause: any = {
      deletedAt: null,
      logo: { not: null },
    };

    if (statusParam && statusParam.trim() !== "") {
      whereClause.status = statusParam.toUpperCase();
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        tag: true,
        logo: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const validTeams = teams.filter((t) => t.logo && t.logo.trim().length > 0);

    if (validTeams.length === 0) {
      return apiError("No team logos found to download", 404);
    }

    const origin = request.nextUrl.origin;
    const zip = new JSZip();
    let added = 0;

    const usedFilenames = new Set<string>();

    async function addTeamLogoToZip(team: { id: string; name: string; tag: string; logo: string }) {
      try {
        const logoUrl = team.logo.trim();
        if (!logoUrl) return;

        let buf: ArrayBuffer;
        let ext = "png";

        if (logoUrl.startsWith("data:")) {
          const matches = logoUrl.match(/^data:([a-zA-Z0-9\/+\-]+);base64,(.+)$/);
          if (matches) {
            const mime = matches[1];
            const base64Data = matches[2];
            if (mime.includes("svg")) ext = "svg";
            else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
            else if (mime.includes("webp")) ext = "webp";
            else if (mime.includes("gif")) ext = "gif";

            const buffer = Buffer.from(base64Data, "base64");
            buf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          } else {
            return;
          }
        } else {
          const fullUrl = logoUrl.startsWith("http://") || logoUrl.startsWith("https://")
            ? logoUrl
            : `${origin}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;

          const res = await fetch(fullUrl);
          if (!res.ok) return;

          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("svg")) ext = "svg";
          else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
          else if (contentType.includes("gif")) ext = "gif";
          else if (contentType.includes("webp")) ext = "webp";
          else if (contentType.includes("png")) ext = "png";
          else {
            const match = logoUrl.match(/\.(png|jpg|jpeg|svg|webp|gif)(\?.*)?$/i);
            if (match) ext = match[1].toLowerCase();
          }

          buf = await res.arrayBuffer();
        }

        const safeTag = team.tag ? team.tag.replace(/[^a-zA-Z0-9_\-]/g, "") : "";
        const safeName = team.name ? team.name.replace(/[^a-zA-Z0-9_\-]/g, "_") : team.id;
        const baseFilename = safeTag ? `${safeTag}_${safeName}` : safeName;

        let filename = baseFilename;
        let counter = 1;
        while (usedFilenames.has(`${filename}.${ext}`)) {
          filename = `${baseFilename}_${counter}`;
          counter++;
        }
        usedFilenames.add(`${filename}.${ext}`);

        zip.file(`${filename}.${ext}`, buf);
        added++;
      } catch (err) {
        console.error(`Failed to fetch logo for team ${team.name}:`, err);
      }
    }

    await Promise.all(
      validTeams.map((team) =>
        addTeamLogoToZip(team as { id: string; name: string; tag: string; logo: string })
      )
    );

    if (added === 0) {
      return apiError("No team logos could be processed for download", 422);
    }

    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(
      zipBuf.buffer.slice(zipBuf.byteOffset, zipBuf.byteOffset + zipBuf.byteLength) as ArrayBuffer,
      {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="team-logos${statusParam ? `-${statusParam.toLowerCase()}` : ""}.zip"`,
        },
      }
    );
  } catch (error) {
    console.error("Logos zip error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to generate logos zip",
      500
    );
  }
}
