import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Constants
const MAX_BLOGS = 3;
const MAX_TITLE_LENGTH = 500;
const MAX_EXCERPT_LENGTH = 2000;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_BLOG = 10;
const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 100;

// Validation Schema
const blogSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  excerpt: z.string().trim().max(MAX_EXCERPT_LENGTH).optional().default(''),
  date: z.string().datetime().or(z.string().date()),
  link: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(MAX_TAG_LENGTH)).max(MAX_TAGS_PER_BLOG).optional(),
});

const bulkBlogSchema = z.object({
  blogs: z.array(blogSchema.partial()).max(MAX_BLOGS),
});

// Types
type BlogInput = z.infer<typeof blogSchema>;
type PartialBlogInput = Partial<BlogInput>;

interface BlogResponse {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorResponse {
  error: string;
  details?: string[] | string;
}

// Helper: Parse tags from database JSON
function parseTags(tags: any): string[] {
  if (Array.isArray(tags)) {
    return tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) 
        ? parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0) 
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Helper: Format blog for response
function formatBlog(blog: any): BlogResponse {
  return {
    id: blog.id,
    title: blog.title,
    excerpt: blog.excerpt || '',
    date: blog.date,
    link: blog.link || '',
    tags: parseTags(blog.tags),
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

// Helper: Check if blog entry is empty
function isBlogEmpty(blog: PartialBlogInput): boolean {
  return (
    (!blog.title || blog.title.trim().length === 0) &&
    (!blog.date || blog.date.trim().length === 0) &&
    (!blog.link || blog.link.trim().length === 0) &&
    (!blog.tags || blog.tags.length === 0)
  );
}

// Helper: Check if blog has any fields filled
function hasAnyFieldFilled(blog: PartialBlogInput): boolean {
  return Boolean(
    (blog.title && blog.title.trim().length > 0) ||
    (blog.date && blog.date.trim().length > 0) ||
    (blog.link && blog.link.trim().length > 0) ||
    (blog.tags && blog.tags.length > 0)
  );
}

// Helper: Validate URL is not internal/localhost
function isExternalUrl(url: string): boolean {
  if (!url) return true;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Block localhost and internal IPs in production
    if (process.env.NODE_ENV === 'production') {
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (blockedHosts.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// GET - Public endpoint (fetch blogs)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Invalid limit parameter. Must be a positive integer.' },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }

    const blogs = await prisma.blog.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });

    const formattedBlogs = blogs.map(formatBlog);

    return NextResponse.json({ blogs: formattedBlogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Failed to fetch blogs', 
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Protected endpoint (create/update blogs)
export async function POST(request: NextRequest) {
  // Authenticate request
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }

  try {
    // Parse request body
    let body: { blogs: PartialBlogInput[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request structure
    if (!body || typeof body !== 'object' || !('blogs' in body)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid request format. Expected "blogs" property.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.blogs)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid request format. "blogs" must be an array.' },
        { status: 400 }
      );
    }

    // Check array size limit
    if (body.blogs.length > MAX_BLOGS) {
      return NextResponse.json<ErrorResponse>(
        { error: `Maximum ${MAX_BLOGS} blogs allowed` },
        { status: 400 }
      );
    }

    // Filter out completely empty blogs
    const nonEmptyBlogs = body.blogs.filter(blog => !isBlogEmpty(blog));

    // Special case: empty array means delete all
    if (nonEmptyBlogs.length === 0) {
      await prisma.blog.deleteMany({});
      return NextResponse.json({ blogs: [] }, { status: 200 });
    }

    // Validate each blog
    const validatedBlogs: BlogInput[] = [];
    const errors: string[] = [];

    for (let i = 0; i < nonEmptyBlogs.length; i++) {
      const blog = nonEmptyBlogs[i];
      const blogNum = i + 1;
      
      const hasFields = hasAnyFieldFilled(blog);
      if (hasFields) {
        try {
          // Validate with zod
          const validated = blogSchema.parse(blog);
          
          // Additional URL validation
          if (validated.link && !isExternalUrl(validated.link)) {
            errors.push(`Blog ${blogNum}: Link cannot point to internal/localhost addresses`);
            continue;
          }
          
          validatedBlogs.push(validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.issues.forEach((err: z.ZodIssue) => {
              const field: string = err.path.join('.');
              errors.push(`Blog ${blogNum}: ${field} - ${err.message}`);
            });
          } else {
            errors.push(`Blog ${blogNum}: Validation failed`);
          }
        }
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Perform database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing blogs
      await tx.blog.deleteMany({});

      // Create new blogs
      const createdBlogs = await Promise.all(
        validatedBlogs.map((blog) =>
          tx.blog.create({
            data: {
              title: blog.title,
              excerpt: blog.excerpt || '',
              date: new Date(blog.date).toISOString(),
              link: blog.link || '',
              tags: JSON.stringify(blog.tags || []),
            },
          })
        )
      );

      return createdBlogs;
    });

    const formattedBlogs = result.map(formatBlog);

    return NextResponse.json({ blogs: formattedBlogs }, { status: 201 });
  } catch (error) {
    console.error('Error creating blogs:', error);
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json<ErrorResponse>(
          { error: 'A blog with this information already exists' },
          { status: 409 }
        );
      }
      if (prismaError.code === 'P2003') {
        return NextResponse.json<ErrorResponse>(
          { error: 'Database constraint violation' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Failed to create blogs', 
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}