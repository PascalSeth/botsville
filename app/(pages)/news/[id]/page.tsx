import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import NewsDetailClient from './NewsDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Generate Open Graph (OG) and Twitter Card metadata for WhatsApp, Facebook, iMessage & Twitter preview cards.
 * When WhatsApp crawls this URL, it reads the <meta property="og:..."> tags generated here to show the media image banner & caption text.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const article = await prisma.news.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        subtitle: true,
        body: true,
        image: true,
        category: true,
        publishedAt: true,
      },
    });

    if (!article) {
      return {
        title: 'Article Not Found | Botsville',
        description: 'The requested MLBB news article could not be found.',
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botsville.com';
    const title = article.title;
    const description = article.subtitle || article.body?.slice(0, 160).replace(/[\r\n]+/g, ' ') || 'Latest MLBB news, updates & patch notes on Botsville!';
    
    // Ensure image URL is absolute for WhatsApp card parser
    let imageUrl = article.image || '/mlbb_logobg.png';
    if (imageUrl.startsWith('/')) {
      imageUrl = `${appUrl}${imageUrl}`;
    }

    const canonicalUrl = `${appUrl}/news/${article.id}`;
    const imageExtension = imageUrl.split('.').pop()?.toLowerCase();
    const imageMimeType = imageExtension === 'png' ? 'image/png' : imageExtension === 'webp' ? 'image/webp' : 'image/jpeg';

    return {
      title: `${title} | Botsville MLBB Ghana`,
      description,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'Botsville - MLBB Ghana',
        type: 'article',
        publishedTime: article.publishedAt?.toISOString(),
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl.startsWith('https://') ? imageUrl : undefined,
            width: 1200,
            height: 630,
            type: imageMimeType,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: 'News Update | Botsville MLBB Ghana',
      description: 'Check out the latest Mobile Legends update on Botsville!',
    };
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  // Initial fetch for SSR hydration
  let initialArticle = null;
  try {
    const raw = await prisma.news.findUnique({
      where: { id },
      include: {
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    if (raw && !raw.deletedAt) {
      initialArticle = JSON.parse(JSON.stringify(raw));
    }
  } catch {
    // Fallback to client fetch if DB error during build
  }

  return <NewsDetailClient id={id} initialArticle={initialArticle} />;
}
