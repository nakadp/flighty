
const CACHE_NAME = 'skytrace-assets-v1';

/**
 * Retrieves a URL from the cache or fetches and caches it.
 * Returns a Blob URL that can be used directly in <img> or texture loading.
 * 
 * @param {string} url - The URL of the asset to load
 * @returns {Promise<string>} - A Promise resolving to a Blob URL
 */
export const getCachedUrl = async (url) => {
    if (!url) return null;

    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
            const blob = await cachedResponse.blob();
            return URL.createObjectURL(blob);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        // Clone response because it can only be consumed once
        cache.put(url, response.clone());

        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error(`Cache Error for ${url}:`, error);
        // Fallback to original URL if caching fails
        return url;
    }
};

/**
 * Preloads a list of URLs into the cache.
 * 
 * @param {string[]} urls - Array of URLs to preload
 * @returns {Promise<void>}
 */
export const preloadAssets = async (urls) => {
    return Promise.all(urls.map(url => getCachedUrl(url)));
};
