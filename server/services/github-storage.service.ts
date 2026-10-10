import crypto from 'crypto';
import { env } from '../config/env.js';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB configurable limit
export const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] as const;
export type AllowedImageExt = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

export type StorageCategory = 'avatars' | 'banners' | 'links';

export class GitHubStorageError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 502, code = 'GITHUB_STORAGE_ERROR') {
    super(message);
    this.name = 'GitHubStorageError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface GitHubUploadParams {
  category: StorageCategory;
  userId: string;
  buffer: Buffer;
  ext: string;
  mimeType: string;
  commitMessage?: string;
}

export interface GitHubUploadResult {
  url: string;
  rawUrl: string;
  cdnUrl: string;
  proxyUrl: string;
  path: string;
  filename: string;
  sha: string;
  size: number;
  category: StorageCategory;
}

export interface StorageConfigInfo {
  isConfigured: boolean;
  owner: string;
  repo: string;
  branch: string;
  pathPrefix: string;
}

/**
 * Validates that file extension is supported (JPEG, PNG, WebP, SVG, GIF).
 */
export function isAllowedImageExtension(ext: string): ext is AllowedImageExt {
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase() as AllowedImageExt);
}

/**
 * Normalizes category names (e.g. 'cover' -> 'banners', 'avatar' -> 'avatars', 'link' -> 'links').
 */
export function normalizeCategory(category: string): StorageCategory {
  const cat = category.toLowerCase().trim();
  if (cat === 'avatar' || cat === 'avatars') return 'avatars';
  if (cat === 'cover' || cat === 'covers' || cat === 'banner' || cat === 'banners') return 'banners';
  return 'links';
}

/**
 * Generates an isolated, path-traversal-proof GitHub file path.
 * Format: {prefix}/{category}/{userId}/{categorySingle}-{randomId}.{ext}
 */
export function generateSafeGitHubPath(
  category: StorageCategory,
  userId: string,
  ext: string
): { relativePath: string; filename: string } {
  // Sanitize userId (only allow alphanumeric and hyphen)
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeUserId) {
    throw new GitHubStorageError('Invalid user identifier for file storage.', 400, 'INVALID_USER_ID');
  }

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const prefix = category === 'avatars' ? 'avatar' : category === 'banners' ? 'banner' : 'link';
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const filename = `${prefix}-${randomSuffix}.${cleanExt}`;

  const pathPrefix = (env.GITHUB_PATH_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  const relativePath = `${pathPrefix}/${category}/${safeUserId}/${filename}`;

  return { relativePath, filename };
}

/**
 * Builds the canonical public delivery URL from raw.githubusercontent.com for public repositories.
 */
export function buildRawGitHubUrl(relativePath: string): string {
  const owner = env.GITHUB_OWNER || 'linux9112';
  const repo = env.GITHUB_REPO || 'linkplus';
  const branch = env.GITHUB_BRANCH || 'main';
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
}

/**
 * Builds the jsDelivr CDN delivery URL for fast global edge delivery.
 */
export function buildCdnGitHubUrl(relativePath: string): string {
  const owner = env.GITHUB_OWNER || 'linux9112';
  const repo = env.GITHUB_REPO || 'linkplus';
  const branch = env.GITHUB_BRANCH || 'main';
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`;
}

/**
 * Builds the backend authenticated proxy delivery URL (useful when repos are private).
 */
export function buildProxyImageUrl(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `/api/public/image-proxy?path=${encodeURIComponent(cleanPath)}`;
}

class GitHubStorageService {
  /**
   * Checks whether GitHub storage credentials and repository details are configured.
   */
  public isConfigured(): boolean {
    return Boolean(
      env.GITHUB_STORAGE_ENABLED &&
      env.GITHUB_TOKEN &&
      env.GITHUB_TOKEN.trim().length > 0 &&
      env.GITHUB_OWNER &&
      env.GITHUB_REPO
    );
  }

  /**
   * Returns current storage configuration details (secrets are omitted).
   */
  public getConfig(): StorageConfigInfo {
    return {
      isConfigured: this.isConfigured(),
      owner: env.GITHUB_OWNER || 'linux9112',
      repo: env.GITHUB_REPO || 'linkplus',
      branch: env.GITHUB_BRANCH || 'main',
      pathPrefix: env.GITHUB_PATH_PREFIX || 'uploads',
    };
  }

  /**
   * Encodes a repository path safely for GitHub API URLs without double-encoding slashes.
   */
  private encodeGitHubPath(filePath: string): string {
    return filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  /**
   * Uploads an image to GitHub repository using the GitHub Contents API.
   * Enforces 5 MB size limit, JPEG/PNG/WebP validation, safe non-guessable paths,
   * and handles GitHub API rate limits, authentication, and permission errors.
   */
  public async uploadImage(params: GitHubUploadParams): Promise<GitHubUploadResult> {
    if (!this.isConfigured()) {
      throw new GitHubStorageError(
        'GitHub centralized image storage is not configured on this server. GITHUB_TOKEN is required.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    const { category, userId, buffer, ext, mimeType, commitMessage } = params;

    // Validate size limit (5 MB)
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new GitHubStorageError(
        `File exceeds maximum upload size of 5 MB (received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    if (!isAllowedImageExtension(ext)) {
      throw new GitHubStorageError(
        `Unsupported image extension: .${ext}. Supported formats: PNG, JPG, JPEG, WebP, SVG, GIF.`,
        400,
        'INVALID_FORMAT'
      );
    }

    const { relativePath, filename } = generateSafeGitHubPath(category, userId, ext);
    const owner = env.GITHUB_OWNER || 'linux9112';
    const repo = env.GITHUB_REPO || 'linkplus';
    const branch = env.GITHUB_BRANCH || 'main';
    const token = env.GITHUB_TOKEN!.trim();

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${this.encodeGitHubPath(relativePath)}`;
    const base64Content = buffer.toString('base64');
    const msg = commitMessage || `Upload ${category.slice(0, -1)} for user ${userId.slice(0, 8)} [skip ci]`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'LinkPlus-Storage-Service',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
          content: base64Content,
          branch,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const responseBody = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseBody);
      } catch {
        responseData = { message: responseBody };
      }

      // Handle common GitHub status codes
      if (response.status === 200 || response.status === 201) {
        const sha = responseData.content?.sha || '';
        const rawUrl = buildRawGitHubUrl(relativePath);
        const cdnUrl = buildCdnGitHubUrl(relativePath);
        const proxyUrl = buildProxyImageUrl(relativePath);

        return {
          url: rawUrl,
          rawUrl,
          cdnUrl,
          proxyUrl,
          path: relativePath,
          filename,
          sha,
          size: buffer.length,
          category,
        };
      }

      if (response.status === 401) {
        throw new GitHubStorageError(
          'GitHub authentication failed. The configured GITHUB_TOKEN is invalid or has expired.',
          401,
          'GITHUB_AUTH_FAILED'
        );
      }

      if (response.status === 403) {
        if (rateLimitRemaining === '0') {
          throw new GitHubStorageError(
            'GitHub API rate limit exceeded. Please wait a few minutes before uploading more images.',
            429,
            'GITHUB_RATE_LIMITED'
          );
        }
        throw new GitHubStorageError(
          `GitHub upload forbidden: Personal access token does not have write permissions for repository ${owner}/${repo}. ` +
            'Please update your fine-grained token with "Contents: Read and write" repository permissions.',
          403,
          'GITHUB_PERMISSION_DENIED'
        );
      }

      if (response.status === 404) {
        throw new GitHubStorageError(
          `GitHub repository or branch not found: ${owner}/${repo} on branch "${branch}".`,
          404,
          'GITHUB_REPO_NOT_FOUND'
        );
      }

      if (response.status === 409) {
        throw new GitHubStorageError(
          'GitHub file upload conflict (SHA mismatch or concurrent modification).',
          409,
          'GITHUB_CONFLICT'
        );
      }

      if (response.status === 422) {
        throw new GitHubStorageError(
          `GitHub rejected image upload payload: ${responseData.message || 'Validation failed'}.`,
          422,
          'GITHUB_VALIDATION_ERROR'
        );
      }

      throw new GitHubStorageError(
        `GitHub API returned HTTP ${response.status}: ${responseData.message || response.statusText}`,
        502,
        'GITHUB_API_ERROR'
      );
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof GitHubStorageError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new GitHubStorageError(
          'Image upload to GitHub timed out after 15 seconds. Please try again.',
          504,
          'GITHUB_TIMEOUT'
        );
      }
      throw new GitHubStorageError(
        `Network error connecting to GitHub: ${err.message || 'Connection failed'}`,
        502,
        'GITHUB_NETWORK_ERROR'
      );
    }
  }

  /**
   * Deletes an obsolete file from GitHub branch HEAD.
   *
   * Note on Git History:
   * When a file is deleted via the GitHub Contents API, a commit is recorded in the Git history
   * removing the file from the HEAD of the branch. The file is unlinked and no longer accessible
   * at the HEAD commit or public CDN, but historical commits retain previous blobs unless the
   * repository is rewritten (e.g. using git-filter-repo). Never upload confidential secrets as profile photos.
   */
  public async deleteImage(options: {
    path: string;
    sha?: string;
    userId: string;
  }): Promise<{ success: boolean; deleted: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, deleted: false, error: 'GitHub storage not configured.' };
    }

    const { path: rawPath, sha: initialSha, userId } = options;
    const cleanPath = rawPath.replace(/^\/+/, '');

    // Path traversal check
    const pathPrefix = (env.GITHUB_PATH_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
    if (!cleanPath.startsWith(`${pathPrefix}/`)) {
      return { success: false, deleted: false, error: 'Invalid file path.' };
    }

    // Verify ownership: Path must include userId
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanPath.includes(`/${safeUserId}/`)) {
      return { success: false, deleted: false, error: 'Unauthorized path modification.' };
    }

    const owner = env.GITHUB_OWNER || 'linux9112';
    const repo = env.GITHUB_REPO || 'linkplus';
    const branch = env.GITHUB_BRANCH || 'main';
    const token = env.GITHUB_TOKEN!.trim();

    try {
      let sha = initialSha;

      // If SHA is missing, query GitHub for the current blob SHA
      if (!sha) {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${this.encodeGitHubPath(cleanPath)}?ref=${branch}`;
        const getRes = await fetch(getUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'LinkPlus-Storage-Service',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (getRes.status === 404) {
          // File already deleted or does not exist
          return { success: true, deleted: false };
        }

        if (getRes.ok) {
          const getData = (await getRes.json()) as any;
          sha = getData.sha;
        } else {
          return { success: false, deleted: false, error: `Failed to retrieve file SHA: ${getRes.statusText}` };
        }
      }

      if (!sha) {
        return { success: false, deleted: false, error: 'Unable to resolve file SHA for deletion.' };
      }

      // Execute DELETE commit
      const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${this.encodeGitHubPath(cleanPath)}`;
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'LinkPlus-Storage-Service',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete obsolete image ${cleanPath} [skip ci]`,
          sha,
          branch,
        }),
      });

      if (delRes.status === 200 || delRes.status === 404) {
        return { success: true, deleted: delRes.status === 200 };
      }

      const errBody = await delRes.text();
      return { success: false, deleted: false, error: `GitHub DELETE returned ${delRes.status}: ${errBody}` };
    } catch (err: any) {
      return { success: false, deleted: false, error: err.message || 'Network error during GitHub deletion.' };
    }
  }

  /**
   * Fetches an image from GitHub (for anonymous public proxy serving).
   * Supports both public and private repositories using authenticated server-side request.
   */
  public async fetchImage(filePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const cleanPath = filePath.replace(/^\/+/, '');
    const pathPrefix = (env.GITHUB_PATH_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');

    // Strict path validation
    if (!cleanPath.startsWith(`${pathPrefix}/`) || cleanPath.includes('..')) {
      return null;
    }

    const owner = env.GITHUB_OWNER || 'linux9112';
    const repo = env.GITHUB_REPO || 'linkplus';
    const branch = env.GITHUB_BRANCH || 'main';

    const ext = cleanPath.split('.').pop()?.toLowerCase() || 'png';
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'gif'
        ? 'image/gif'
        : 'application/octet-stream';

    // 1. If token is present, use authenticated Contents API
    if (env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim().length > 0) {
      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${this.encodeGitHubPath(cleanPath)}?ref=${branch}`;
        const res = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN.trim()}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'LinkPlus-Storage-Service',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.content && typeof data.content === 'string') {
            const buffer = Buffer.from(data.content.replace(/\s+/g, ''), 'base64');
            return { buffer, contentType };
          }
        }
      } catch {
        // Fall back to raw URL
      }
    }

    // 2. Direct raw URL fetch (for public repos)
    try {
      const rawUrl = buildRawGitHubUrl(cleanPath);
      const res = await fetch(rawUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return { buffer: Buffer.from(arrayBuf), contentType };
      }
    } catch {
      // Failed to fetch
    }

    return null;
  }
}

export const githubStorageService = new GitHubStorageService();
export default githubStorageService;
