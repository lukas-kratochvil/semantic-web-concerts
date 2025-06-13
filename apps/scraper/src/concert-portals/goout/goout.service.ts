import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeout } from "@nestjs/schedule";
import puppeteer from "puppeteer";
import type { ConfigSchema } from "src/config/schema";

@Injectable()
export class GooutService {
  #logger = new Logger(GooutService.name);
  #baseUrl: string;

  constructor(config: ConfigService<ConfigSchema, true>) {
    this.#baseUrl = config.get("goout.url", { infer: true });
  }

  @Timeout(3_000)
  async fetch() {
    const browser = await puppeteer.launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
    });
    // load the page already customized for Czechia
    await browser.setCookie({
      name: "countryIso",
      value: "cz",
      domain: ".goout.net",
      path: "/",
    });
    const page = await browser.newPage();

    // load page and wait for a dynamic content (JS) to be loaded properly before continuing
    const res = await page.goto(this.#baseUrl, { waitUntil: "networkidle2" });

    if (!res) {
      this.#logger.error(`No response from the base url: ${this.#baseUrl}.`);
      return;
    }

    // SETUP
    // 1) deny cookies
    await page.locator("div.goout-cookie-essentials").click();

    // 2) check that first dropdown menu button has `innerText="Czechia"` otherwise select "Czechia"
    const country = "Czechia";
    const countryButton = await page.$(
      `::-p-xpath(//button[contains(@class, filter-trigger) and contains(text(), '${country}')])`,
    );

    if (!countryButton) {
      await page.locator("button.filter-trigger").click();
      await page
        .locator(
          `::-p-xpath(//div[contains(@class, country-list)]//a[contains(text(), '${country}')])`,
        )
        .click();
    }

    // 3) set the 'Concerts' category
    await page
      .locator(
        '::-p-xpath(//button[contains(@class, filter-trigger) and contains(text(), "All categories")])',
      )
      .click();
    await page
      .locator(
        '::-p-xpath(//span[contains(@class, categoryFilterItem)]/a/span[contains(@class, d-block) and contains(text(), "Concerts")])',
      )
      .click();

    // GET LINKS
    const linkSet = new Set<string>();

    while (true) {
      try {
        const showMoreButtonText = "Show more";
        const showMoreButtonSelector = `::-p-xpath(//div[contains(@class, d-block)]/button[contains(text(), '${showMoreButtonText}')])`;
        await page.waitForSelector(showMoreButtonSelector, { timeout: 5_000 });
        const showMoreButton = page.locator(showMoreButtonSelector);
        await showMoreButton.scroll();
        await showMoreButton.click({ delay: 2_000 });

        const linksSelector = "div.event > div.info > a.title";
        await page.waitForSelector(linksSelector, { timeout: 5_000 });
        const newLinks = await page.$$eval(linksSelector, (links) =>
          links.map((link) => link.href),
        );

        if (newLinks.length === 0) {
          this.#logger.error("No new links!");
          break;
        }

        newLinks.forEach((l) => linkSet.add(l));
      } catch (e) {
        this.#logger.error(e);
        break;
      }
    }

    await browser.close();
  }
}
