import { test } from '@playwright/test';

test('check JS assets against CSP domains', async ({ page }) => {
    const d = await import(
        '/Users/olaf/Documents/github/oalders/debug-playwright/dist/index.js'
    );
    // const dp = new d.DebugPlaywright({ page: page });
    const startUrl = 'https://www.maxmind.com/en/shopping-cart/summary';

    let cspHeader = '';
    page.on('response', (response) => {
        if (response.url() === startUrl && response.status() === 200) {
            cspHeader = response.headers()['content-security-policy'];
        }
    });
    // Load the page
    await page.goto(startUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Parse the CSP header for allowed domains
    const cspSrcDomains = Array.from(new Set(parseCsp(cspHeader))).sort();
    console.dir(cspSrcDomains);

    // Get all JavaScript assets
    const srcAssets = await page.evaluate(() => {
        const scriptSources = Array.from(
            new Set(
                Array.from(document.querySelectorAll('script[src]')).map(
                    (script) => (script as HTMLScriptElement).src,
                ),
            ),
        );

        const iframeSources = Array.from(
            new Set(
                Array.from(document.querySelectorAll('noscript')).flatMap(
                    (noscript) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = noscript.innerHTML;
                        return Array.from(tempDiv.querySelectorAll('iframe[src]')).map(
                            (iframe) => (iframe as HTMLIFrameElement).src,
                        );
                    },
                ),
            ),
        );

        return Array.from(new Set([...scriptSources, ...iframeSources])).sort();
    });

    // Extract domains from JS assets
    const srcAssetDomains = Array.from(
        new Set(srcAssets.map((asset: string) => new URL(asset).hostname)),
    );
    console.log('Found JS asset domains:', srcAssetDomains);

    // Find domains that are no longer required
    // Filter out specific domains and any domains ending in maxmind.com
    const filteredCspSrcDomains = cspSrcDomains.filter((domain) => {
        return !domain.endsWith('maxmind.com');
    });

    // Handle wildcard domains in CSP
    const wildcardDomains = cspSrcDomains.filter((domain) =>
        domain.startsWith('*.'),
    );

    // Find domains that are no longer required
    const unusedDomains = srcAssetDomains.filter((domain) => {
        return (
            !filteredCspSrcDomains.includes(domain) &&
            !wildcardDomains.some((wildcard) => {
                const regex = new RegExp(`^${wildcard.replace('*.', '.*.')}$`);
                return regex.test(domain);
            })
        );
    });

    // Report unused domains
    if (unusedDomains.length > 0) {
    } else {
        console.log('All JS asset domains are covered by CSP.');
    }
});

// Function to parse CSP header
function parseCsp(csp: string) {
    if (!csp) return [];
    const directives = csp.split(';').map((d) => d.trim());
    const allowedDomains = [];

    directives.forEach((directive) => {
        if (directive.startsWith('script-src')) {
            const sources = directive.split(' ');
            allowedDomains.push(
                ...sources.filter(
                    (src) =>
                        src &&
                        src !== "'self'" &&
                        src !== "'unsafe-inline'" &&
                        src !== "'unsafe-eval'",
                ),
            );
        }
    });

    return allowedDomains.map(
        (domain) => new URL(domain, 'https://www.maxmind.com').hostname,
    ); // Use a base URL for relative domains
}
