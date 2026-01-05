import { MetadataRoute } from "next";

// Fetch published events from Convex HTTP API
async function getPublishedEvents(): Promise<
  Array<{ _id: string; updatedAt?: number; _creationTime: number }>
> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error("NEXT_PUBLIC_CONVEX_URL is not defined");
      return [];
    }

    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "public/queries:getPublishedEvents",
        args: {},
        format: "json",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch events for sitemap");
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("Error fetching events for sitemap:", error);
    return [];
  }
}

// Fetch published classes from Convex HTTP API
async function getPublishedClasses(): Promise<
  Array<{ _id: string; updatedAt?: number; _creationTime: number }>
> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error("NEXT_PUBLIC_CONVEX_URL is not defined");
      return [];
    }

    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "public/queries:getPublishedClasses",
        args: {},
        format: "json",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch classes for sitemap");
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("Error fetching classes for sitemap:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://stepperslife.com";

  // Static pages with their priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/classes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/restaurants`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/features/events`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/features/classes`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Fetch dynamic content
  const [events, classes] = await Promise.all([
    getPublishedEvents(),
    getPublishedClasses(),
  ]);

  // Generate event URLs
  const eventUrls: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}/events/${event._id}`,
    lastModified: new Date(event.updatedAt || event._creationTime),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Generate class URLs
  const classUrls: MetadataRoute.Sitemap = classes.map((classItem) => ({
    url: `${baseUrl}/classes/${classItem._id}`,
    lastModified: new Date(classItem.updatedAt || classItem._creationTime),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...eventUrls, ...classUrls];
}
