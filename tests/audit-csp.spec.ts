import { expect, Locator, test } from '@playwright/test';

test('check script-src CSP domains', async ({ page }) => {
    const d = await import(
        '/Users/olaf/Documents/github/oalders/debug-playwright/dist/index.js'
    );
    const startUrl = 'https://www.maxmind.com/en/shopping-cart/summary';

    let cspHeader = '';
    page.on('response', (response) => {
        if (response.url() === startUrl && response.status() === 200) {
            cspHeader = response.headers()['content-security-policy'];
        }
    });

    await page.goto(startUrl);
    await page.waitForLoadState('networkidle');

    const cspSrcDomains = Array.from(new Set(parseCsp(cspHeader, 'script-src'))).sort();
    const jsAssetsAndIframes = await page.evaluate(() => {
        const scriptSources = Array.from(
            new Set(
                Array.from(document.querySelectorAll('script[src]')).map(
                    (script) => (script as HTMLScriptElement).src,
                ),
            ),
        );

        const iframeSources = Array.from(
            new Set(
                Array.from(document.querySelectorAll('iframe[src]')).map(
                    (iframe) => (iframe as HTMLIFrameElement).src,
                ),
            ),
        );

        const noscriptIframeSources = Array.from(
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

        return Array.from(new Set([...scriptSources, ...iframeSources, ...noscriptIframeSources])).sort();
    });

    const jsAssetAndIframeDomains = Array.from(
        new Set(jsAssetsAndIframes.map((asset: string) => new URL(asset).hostname)),
    );
    console.log('Found JS asset and iframe domains:', jsAssetAndIframeDomains);

    const filteredSrcAssetDomains = jsAssetAndIframeDomains.filter((domain) => !domain.endsWith('maxmind.com'));

    const wildcardDomains = cspSrcDomains.filter((domain) =>
        domain.startsWith('*.'),
    );

    const finalAllowedDomains = filteredSrcAssetDomains.filter((domain) => {
        return !wildcardDomains.some((wildcard) => {
            const regex = new RegExp(`^${wildcard.replace('*.', '.*.')}$`);
            return regex.test(domain);
        });
    });

    const unusedDomains = finalAllowedDomains.filter(
        (domain) => !cspSrcDomains.includes(domain),
    );

    if (unusedDomains.length > 0) {
        console.log('Unused JS asset and iframe domains:', unusedDomains);
    } else {
        console.log('All JS asset and iframe domains are covered by CSP.');
    }
});

test('check connect-src CSP domains', async ({ page }) => {
    const d = await import(
        '/Users/olaf/Documents/github/oalders/debug-playwright/dist/index.js'
    );
    const startUrl = 'https://www.maxmind.com/en/shopping-cart/summary';

    let cspHeader = '';
    page.on('response', (response) => {
        if (response.url() === startUrl && response.status() === 200) {
            cspHeader = response.headers()['content-security-policy'];
        }
    });

    await page.goto(startUrl);
    await page.waitForLoadState('networkidle');

    const cspConnectDomains = Array.from(new Set(parseCsp(cspHeader, 'connect-src'))).sort();
    const connectSrcDomains = await page.evaluate(() => {
        const connectSources = Array.from(
            new Set(
                Array.from(document.querySelectorAll('a[href]')).map(
                    (link) => (link as HTMLAnchorElement).href,
                ),
            ),
        );

        return Array.from(new Set(connectSources)).sort();
    });

    const connectSrcAssetDomains = Array.from(
        new Set(connectSrcDomains.map((asset: string) => new URL(asset).hostname)),
    );
    console.log('Found connect-src domains:', connectSrcAssetDomains);

    const filteredConnectSrcDomains = connectSrcAssetDomains.filter((domain) => !domain.endsWith('maxmind.com'));

    const wildcardDomains = cspConnectDomains.filter((domain) =>
        domain.startsWith('*.'),
    );

    const finalAllowedDomains = filteredConnectSrcDomains.filter((domain) => {
        return !wildcardDomains.some((wildcard) => {
            const regex = new RegExp(`^${wildcard.replace('*.', '.*.')}$`);
            return regex.test(domain);
        });
    });

    const unusedDomains = finalAllowedDomains.filter(
        (domain) => !cspConnectDomains.includes(domain),
    );

    if (unusedDomains.length > 0) {
        console.log('Unused connect-src domains:', unusedDomains);
    } else {
        console.log('All connect-src domains are covered by CSP.');
    }
});

function parseCsp(csp: string, directiveType: string) {
    if (!csp) return [];
    const directives = csp.split(';').map((d) => d.trim());
    const allowedDomains = [];

    directives.forEach((directive) => {
        if (directive.startsWith(directiveType)) {
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
