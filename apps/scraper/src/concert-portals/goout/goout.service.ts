import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import puppeteer from "puppeteer";
import type { ConfigSchema } from "src/config/schema";

@Injectable()
export class GooutService {
  #logger = new Logger(GooutService.name);
  #baseUrl: string;

  constructor(config: ConfigService<ConfigSchema, true>) {
    this.#baseUrl = config.get("goout.url", { infer: true });
  }

  async fetch() {
    const browser = await puppeteer.launch();
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
    const country = '"Czechia"';
    const countryButton = await page.$(
      `::-p-xpath(//button[contains(@class, "filter-trigger") and contains(text(), ${country})])`,
    );

    if (!countryButton) {
      await page.locator("button.filter-trigger").click();
      await page
        .locator(
          `::-p-xpath(//div[contains(@class, "country-list")]//a[contains(text(), ${country})])`,
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
    const eventAnchors = await page.$$("div.event > div.info > a.title");
    // TODO: get info about each event

    await browser.close();
  }
}
