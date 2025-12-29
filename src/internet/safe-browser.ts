import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebPage {
  url: string;
  title: string;
  content: string;
  summary: string;
  timestamp: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class SafeBrowser {
  private safeDomains: Set<string>;
  private blockedPatterns: RegExp[];
  private visitedUrls: Map<string, WebPage>;

  constructor() {
    // Whitelist of safe domains
    this.safeDomains = new Set([
      'wikipedia.org',
      'en.wikipedia.org',
      'stackoverflow.com',
      'github.com',
      'medium.com',
      'arxiv.org',
      'news.ycombinator.com',
      'reddit.com',
      'bbc.com',
      'reuters.com',
      'npr.org',
      'techcrunch.com',
      'arstechnica.com',
      'scientificamerican.com',
      'nature.com',
      'scholar.google.com',
    ]);

    // Blocked patterns for safety
    this.blockedPatterns = [
      /porn|xxx|adult|nsfw/i,
      /malware|virus|phishing/i,
      /gambling|casino|bet/i,
    ];

    this.visitedUrls = new Map();
  }

  // Check if URL is safe to visit
  isSafeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      // Check if domain is in whitelist
      const domainParts = domain.split('.');
      const baseDomain = domainParts.slice(-2).join('.');

      const isWhitelisted = this.safeDomains.has(domain) || this.safeDomains.has(baseDomain);

      // Check blocked patterns
      const hasBlockedContent = this.blockedPatterns.some(pattern =>
        pattern.test(url) || pattern.test(domain)
      );

      return isWhitelisted && !hasBlockedContent;
    } catch {
      return false;
    }
  }

  // Fetch and parse a web page safely
  async fetchPage(url: string): Promise<WebPage | null> {
    if (!this.isSafeUrl(url)) {
      console.warn(`[SafeBrowser] Blocked unsafe URL: ${url}`);
      return null;
    }

    // Check cache
    if (this.visitedUrls.has(url)) {
      const cached = this.visitedUrls.get(url)!;
      const age = Date.now() - cached.timestamp;
      if (age < 3600000) { // 1 hour cache
        return cached;
      }
    }

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RizeBot/1.0 (AI Research Assistant)',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('title').text() || $('h1').first().text() || 'Untitled';

      // Extract main content (remove scripts, styles, etc.)
      $('script, style, nav, footer, header, aside').remove();

      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000); // Limit content size

      // Create summary (first 500 chars)
      const summary = content.substring(0, 500) + (content.length > 500 ? '...' : '');

      const page: WebPage = {
        url,
        title,
        content,
        summary,
        timestamp: Date.now(),
      };

      this.visitedUrls.set(url, page);
      return page;
    } catch (error) {
      console.error(`[SafeBrowser] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  // Search for information (using DuckDuckGo API - no API key needed)
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // DuckDuckGo Instant Answer API
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
        timeout: 10000,
      });

      const results: SearchResult[] = [];

      // Extract related topics
      if (response.data.RelatedTopics) {
        for (const topic of response.data.RelatedTopics.slice(0, limit)) {
          if (topic.FirstURL && topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              url: topic.FirstURL,
              snippet: topic.Text,
            });
          }
        }
      }

      // Add abstract if available
      if (response.data.Abstract && response.data.AbstractURL) {
        results.unshift({
          title: response.data.Heading || query,
          url: response.data.AbstractURL,
          snippet: response.data.Abstract,
        });
      }

      return results;
    } catch (error) {
      console.error('[SafeBrowser] Search failed:', error);
      return [];
    }
  }

  // Research a topic (search + fetch top results)
  async research(topic: string): Promise<{ query: string; results: WebPage[] }> {
    const searchResults = await this.search(topic, 3);
    const pages: WebPage[] = [];

    for (const result of searchResults) {
      if (this.isSafeUrl(result.url)) {
        const page = await this.fetchPage(result.url);
        if (page) {
          pages.push(page);
        }
      }
    }

    return {
      query: topic,
      results: pages,
    };
  }

  // Add a safe domain to whitelist
  addSafeDomain(domain: string): void {
    this.safeDomains.add(domain.replace('www.', ''));
  }

  // Get list of safe domains
  getSafeDomains(): string[] {
    return Array.from(this.safeDomains).sort();
  }

  // Clear cache
  clearCache(): void {
    this.visitedUrls.clear();
  }
}
