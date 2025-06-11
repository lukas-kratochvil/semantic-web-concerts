import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer";
import type { ConfigSchema } from "src/config/schema";

@Injectable()
export class GooutService {
  #logger = new Logger(GooutService.name);
  #baseUrl: string;

  constructor(config: ConfigService<ConfigSchema["goout"], true>) {
    this.#baseUrl = config.get("url");
  }

  async fetch() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // load page and wait for a dynamic content (JS) to be loaded properly before continuing
    const res = await page.goto(this.#baseUrl, { waitUntil: "networkidle2" });

    if (!res) {
      this.#logger.error(`No response from the base url: ${this.#baseUrl}.`);
      return;
    }

    // SETUP
    // 1) check that first dropdown menu button has `innerText="Czechia"` otherwise select "Czechia"
    const country = '"Czechia"';
    const countryButton = await page.$(
      `//button.filter-trigger[contains(text(), ${country})]`,
    );

    if (!countryButton) {
      await page.locator("button.filter-trigger").click();
      await page
        .locator(`//div.country-list//a[contains(text(), ${country})]`)
        .click();
    }

    // 2) set the 'Concerts' category
    await page
      .locator('//button.filter-trigger[contains(text(), "All categories")]')
      .click();
    await page
      .locator(
        '//span.categoryFilterItem/a/span.d-block[contains(text(), "Concerts")]',
      )
      .click();

    // GET LINKS
    const eventAnchors = await page.$$("div.event > div.info > a.title");
    // TODO: get info about each event

    await browser.close();
  }
}
