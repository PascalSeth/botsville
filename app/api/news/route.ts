import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { NewsStatus, NewsCategory, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List news articles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.NewsWhereInput = { deletedAt: null };
    
    // Public can only see published articles
    let user = null;
    try {
      const { requireActiveUser } = await import("@/lib/api-utils");
      user = await requireActiveUser();
    } catch {
      // Not authenticated - public access
    }
    
    if (!user || !user.role) {
      where.status = NewsStatus.PUBLISHED;
    } else if (status && Object.values(NewsStatus).includes(status as NewsStatus)) {
      where.status = status as NewsStatus;
    }

    if (category && Object.values(NewsCategory).includes(category as NewsCategory)) {
      where.category = category as NewsCategory;
    }

    if (featured !== null) {
      where.featured = featured === "true";
    }

    const [articles, total] = await Promise.all([
      prisma.news.findMany({
        where,
        include: {
          _count: {
            select: {
              reactions: true,
            },
          },
        },
        orderBy: [
          { featured: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.news.count({ where }),
    ]);

    return apiSuccess({
      articles,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch news";
    console.error("Get news error:", error);
    return apiError(message, 500);
  }
}

// POST - Create news article
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const payload = await request.json();
    const {
      category,
      title,
      subtitle,
      body: articleBody,
      image,
      tags,
      featured,
      status,
    } = payload;

    if (!category || !title) {
      return apiError("Category and title are required");
    }

    if (!Object.values(NewsCategory).includes(category)) {
      return apiError("Invalid category");
    }

    const article = await prisma.news.create({
      data: {
        category: category as NewsCategory,
        title,
        subtitle: subtitle || null,
        body: articleBody ?? null,
        image: image || null,
        tags: tags || [],
        featured: Boolean(featured),
        status: (status || NewsStatus.DRAFT) as NewsStatus,
        publishedAt: status === NewsStatus.PUBLISHED ? new Date() : null,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_NEWS",
      "News",
      article.id,
      JSON.stringify({ title, category })
    );

    return apiSuccess(
      {
        message: "Article created successfully",
        article,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create article";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Create news error:", error);
    return apiError(message, 500);
  }
}

