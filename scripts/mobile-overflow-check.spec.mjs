import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  deviceScaleFactor: 2,
  launchOptions: {
    channel: "chrome",
  },
});

const paths = ["/", "/login", "/about", "/analyze", "/dashboard", "/results"];

for (const path of paths) {
  test(`mobile layout has no horizontal overflow: ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "load" });
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const overflowing = Array.from(document.querySelectorAll("*"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            className: String(element.className || ""),
            tag: element.tagName,
            text: (element.textContent || "").trim().slice(0, 80),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((item) => item.right > root.clientWidth + 1 || item.left < -1)
        .slice(0, 10);

      return {
        bodyScrollWidth: document.body.scrollWidth,
        clientWidth: root.clientWidth,
        overflowing,
        scrollWidth: root.scrollWidth,
      };
    });

    expect(metrics.overflowing).toEqual([]);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });
}
