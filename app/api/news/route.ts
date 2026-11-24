import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { NewsStatus, AdminRoleType } from "@/app/generated/prisma/enums";
import { canManageNews } from '@/lib/news-content';
import { NewsValidationError, parseNewsQuery, validateNewsWrite } from '@/lib/news-validation';

import { prisma } from "@/lib/prisma";

// GET - List news articles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { status, category, formats, featured, limit, skip } = parseNewsQuery(searchParams);

    const where: Prisma.NewsWhereInput = { deletedAt: null };
    
    // Public can only see published articles
    let user = null;
    try {
      const { requireActiveUser } = await import("@/lib/api-utils");
      user = await requireActiveUser();
    } catch {
      // Not authenticated - public access
    }
    
    const isEditor = canManageNews(user?.role);
    if (!isEditor) {
      where.status = NewsStatus.PUBLISHED;
    } else if (status) {
      where.status = status;
    }

    if (category) where.category = category;
    if (formats.length > 0) where.format = { in: formats };

    if (featured !== null) {
      where.featured = featured;
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
          { id: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.news.count({ where }),
    ]);

    const cacheHeaders = !isEditor ? {
      "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59"
    } : { 'Cache-Control': 'private, no-store' };

    return apiSuccess({
      articles,
      pagination: {
        total,
        limit,
        skip,
      },
    }, 200, cacheHeaders);
  } catch (error: unknown) {
    if (error instanceof NewsValidationError) return apiError(error.message, 400);
    const message = error instanceof Error ? error.message : "Failed to fetch news";
    console.error("Get news error:", error);
    return apiError(message, 500);
  }
}

// POST - Create news article
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin([AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR, AdminRoleType.INTERVIEWER]);
    const { post } = validateNewsWrite(await request.json());

    // INTERVIEWER can only publish interview posts, not other news categories
    if (admin.role === AdminRoleType.INTERVIEWER && (post.category !== 'INTERVIEW' || post.format !== 'ARTICLE')) {
      return apiError("Interviewers can only publish INTERVIEW category posts", 403);
    }

    const article = await prisma.news.create({
      data: {
        ...post,
        publishedAt: post.status === NewsStatus.PUBLISHED ? new Date() : null,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_NEWS",
      "News",
      article.id,
      JSON.stringify({ title: post.title, category: post.category, format: post.format })
    );

    return apiSuccess(
      {
        message: "Article created successfully",
        article,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof NewsValidationError || error instanceof SyntaxError) return apiError(error.message, 400);
    const message = error instanceof Error ? error.message : "Failed to create article";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Create news error:", error);
    return apiError(message, 500);
  }
}

