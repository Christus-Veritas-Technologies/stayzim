import type { Page } from "@playwright/test";

/*
 * Checks that a page fits a narrow phone, shared by the 360px tests.
 */

/**
 * Empty when the page fits; otherwise the widths and the elements that stick out
 * past the right edge (leaving out fixed bars and anything a parent clips), so a
 * failure names the culprit.
 */
export async function sideways(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    if (root.scrollWidth <= width) return [];
    const culprits = [...document.body.querySelectorAll("*")].filter((element) => {
      const box = element.getBoundingClientRect();
      if (box.right <= width + 1 || box.width === 0) return false;
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.position === "fixed") return false;
        if (node !== element && /hidden|clip|auto|scroll/.test(style.overflowX)) return false;
      }
      return true;
    });
    return [
      `scrollWidth ${root.scrollWidth}, clientWidth ${width}, innerWidth ${window.innerWidth}`,
      ...culprits.slice(0, 8).map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 100)} → ${Math.round(element.getBoundingClientRect().right)}px`),
    ];
  });
}

export async function scrollThrough(page: Page) {
  // Reveal animations start offset, so look at the page once everything has shown
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
  await page.waitForTimeout(500);
}
