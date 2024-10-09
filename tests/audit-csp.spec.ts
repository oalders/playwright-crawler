import { expect, Locator, test } from '@playwright/test';

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
            console.log('CSP Header:', cspHeader);
        }
    });
    // Load the page
    await page.goto(startUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Parse the CSP header for allowed domains
    const allowedDomains = Array.from(new Set(parseCsp(cspHeader)));

    // Get all JavaScript assets
    const jsAssets = await page.evaluate(() => {
        return Array.from(
            new Set(
                Array.from(document.querySelectorAll('script[src]')).map(
                    (script) => (script as HTMLScriptElement).src,
                ),
            ),
        ).sort();
    });

    // Extract domains from JS assets
    const jsAssetDomains = Array.from(
        new Set(jsAssets.map((asset: string) => new URL(asset).hostname)),
    );
    console.log('Found JS asset domains:', jsAssetDomains);
    console.log('CSP domains:', allowedDomains);

    // Find domains that are no longer required
    // Filter out specific domains and any domains ending in maxmind.com
    const filteredAllowedDomains = allowedDomains.filter((domain) => {
        return !domain.endsWith('maxmind.com');
    });

    // Handle wildcard domains in CSP
    const wildcardDomains = allowedDomains.filter((domain) =>
        domain.startsWith('*.'),
    );
    const finalAllowedDomains = filteredAllowedDomains.filter((domain) => {
        return !wildcardDomains.some((wildcard) => {
            const regex = new RegExp(`^${wildcard.replace('*.', '.*')}$`);
            return regex.test(domain);
        });
    });

    // Find domains that are no longer required
    const unusedDomains = jsAssetDomains.filter(
        (domain) => !finalAllowedDomains.includes(domain),
    );

    // Report unused domains
    if (unusedDomains.length > 0) {
        console.log('Unused JS asset domains:', unusedDomains);
    } else {
        console.log('All JS asset domains are covered by CSP.');
    }
});

// Function to parse CSP header
function parseCsp(csp) {
    if (!csp) return [];
    const directives = csp.split(';').map((d) => d.trim());
    const allowedDomains = [];

    console.log('---');
    console.log(directives);
    console.log('---');
    directives.forEach((directive) => {
        if (directive.startsWith('script-src')) {
            const sources = directive.split(' ');
            console.log('>>>');
            console.log(sources);
            console.log('>>>');
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
