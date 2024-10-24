import { Page, test } from '@playwright/test';

// START_URL=https://blog.maxmind.com/ npx playwright test tests/audit-csp.spec.ts --headed
// START_URL=https://www.maxmind.com/en/shopping-cart/summary npx playwright test tests/audit-csp.spec.ts --headed
// START_URL=https://dev.maxmind.com/ npx playwright test tests/audit-csp.spec.ts --headed

const checkScriptSrcDomains = async (page: Page, cspHeader: string) => {
  const headerDomains = domainsInCSP(cspHeader, 'script-src');
  const srcDomains: string[] = await page.evaluate((): string[] => {
    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('script[src]')).map(
          (script) => new URL((script as HTMLScriptElement).src).hostname,
        ),
      ),
    ).sort();
  });

  filterDomains('script-src', headerDomains, srcDomains);
};

const filterDomains = async (
  srcType: string,
  headerDomains: string[],
  srcDomains: string[],
) => {
  console.log(srcType + ' policy domains:', headerDomains);
  console.log(srcType + ' source domains:', srcDomains);

  const wildcardDomains = headerDomains.filter((domain) =>
    domain.startsWith('*.'),
  );

  const remainingHeaderDomains = headerDomains.filter((domain) => {
    // Remove wildcard domains if they match any domain in srcDomains
    if (
      wildcardDomains.some((wildcard) => {
        const regex = new RegExp(`^${wildcard.replace('*.', '.*.')}$`);
        return regex.test(domain);
      })
    ) {
      return false;
    }

    // Remove direct matches in srcDomains
    if (srcDomains.includes(domain)) {
      return false;
    }

    // Remove domains ending with maxmind.com
    if (domain.endsWith('maxmind.com')) {
      return false;
    }

    return true;
  });

  if (remainingHeaderDomains.length > 0) {
    console.log(`💥 Unused ${srcType} domains:`, remainingHeaderDomains);
  } else {
    console.log(`No unused ${srcType} domains.`);
  }
};

const checkiFrameSrcDomains = async (page: Page, cspHeader: string) => {
  const headerDomains = domainsInCSP(cspHeader, 'frame-src');
  const srcDomains: string[] = await page.evaluate((): string[] => {
    const iframeHostnames = Array.from(
      document.querySelectorAll('iframe[src]'),
    ).map((iframe) => new URL((iframe as HTMLIFrameElement).src).hostname);

    const noscriptIframeHostnames = Array.from(
      document.querySelectorAll('noscript'),
    ).flatMap((noscript) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = noscript.innerHTML;
      return Array.from(tempDiv.querySelectorAll('iframe[src]')).map(
        (iframe) => new URL((iframe as HTMLIFrameElement).src).hostname,
      );
    });

    return Array.from(
      new Set([...iframeHostnames, ...noscriptIframeHostnames]),
    ).sort();
  });

  filterDomains('frame-src', headerDomains, srcDomains);
};

// const startUrl = 'https://www.maxmind.com/en/shopping-cart/summary';
// startUrl = 'https://dev.maxmind.com/';
const startUrl =
  process.env.START_URL || 'https://www.maxmind.com/en/shopping-cart/summary';

test('check script-src and iframe-src CSP domains', async ({ page }) => {
  console.log('🚀 ' + startUrl);
  let cspHeader = '';
  page.on('response', (response) => {
    if (response.url() === startUrl && response.status() === 200) {
      cspHeader = response.headers()['content-security-policy'];
    }
  });

  await page.goto(startUrl);
  await page.waitForLoadState('networkidle');

  if (cspHeader == '') {
    console.log('🤔 CSP Header not found');
    console.log(`🤔 is ${startUrl} correct? Is it missing a trailing slash?`);
    return;
  }

  await checkScriptSrcDomains(page, cspHeader);
  await checkiFrameSrcDomains(page, cspHeader);
});

test('check connect-src CSP domains', async ({ page }) => {
  const srcType = 'connect-src';
  // get CSP headers from initial page load
  let cspHeader = '';
  page.on('response', (response) => {
    if (response.url() === startUrl && response.status() === 200) {
      cspHeader = response.headers()['content-security-policy'];
    }
  });

  await page.goto(startUrl);
  await page.waitForLoadState('networkidle');

  // we don't care about domains from maxmind.com or ones that start with
  // *.google. as that's an incredibly long list.
  const headerDomains = Array.from(new Set(domainsInCSP(cspHeader, srcType)))
    .filter(
      (domain) =>
        !domain.endsWith('maxmind.com') && !domain.startsWith('*.google.'),
    )
    .sort();

  const srcDomains = new Set<string>();
  page.on('response', async (response) => {
    if (response.request().resourceType() === 'script') {
      console.log(response.url());
      if (response.status() >= 300 && response.status() < 400) {
        console.warn(`Skipping redirect response: ${response.url()}`);
        return;
      }
      response
        .text()
        .then((content) => {
          headerDomains.forEach((domain) => {
            const domainToCheck = domain.startsWith('*') // hack for wildcard matches
              ? domain.slice(1)
              : domain;
            if (content.includes(domainToCheck)) {
              srcDomains.add(domain);
            }
          });
        })
        .catch((error) => {
          console.error(`Failed to read content of ${response.url()}:`, error);
        });
    }
  });

  await page.goto(startUrl);
  await page.waitForLoadState('networkidle');

  console.log(srcType + ' policy domains:', headerDomains);
  console.log(srcType + ' source domains:', srcDomains);

  const missingDomains = headerDomains.filter(
    (domain) => !srcDomains.has(domain),
  );
  if (missingDomains.length > 0) {
    console.log(`💥 Unused ${srcType} domains:`, missingDomains);
  } else {
    console.log(`No unused ${srcType} domains.`);
  }
});

function domainsInCSP(csp: string, directiveType: string) {
  if (!csp) return [];
  const directives = csp.split(';').map((d) => d.trim());
  const allowedDomains = new Set<string>();

  directives.forEach((directive) => {
    if (directive.startsWith(directiveType)) {
      const sources = directive.split(' ');
      sources.forEach((src) => {
        if (
          src &&
          src !== "'self'" &&
          src !== "'unsafe-inline'" &&
          src !== "'unsafe-eval'"
        ) {
          allowedDomains.add(new URL(src, 'https://www.maxmind.com').hostname);
        }
      });
    }
  });

  return Array.from(allowedDomains).sort();
}
