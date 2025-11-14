import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type MusicEventsQueueDataType,
  type MusicEventsQueueNameType,
  MusicEventsQueue,
} from "@semantic-web-concerts/core";
import { ItemAvailability, type IArtist } from "@semantic-web-concerts/core/interfaces";
import { Queue } from "bullmq";
import { addDays, parse, set } from "date-fns";
import { launch, type Browser, type Page } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";
import type { ICronJobService } from "../cron-job-service.types";

@Injectable()
export class GooutService implements ICronJobService {
  readonly #logger = new Logger(GooutService.name);
  readonly #baseUrl: string;
  readonly #puppeteerArgs: string[];

  #isInProcess = false;
  #runDate = new Date(Date.now());
  readonly #scheduledHour = 2;

  readonly jobName = "goout";
  readonly jobType = "timeout";

  constructor(
    @InjectQueue(MusicEventsQueue.name)
    private readonly musicEventsQueue: Queue<
      MusicEventsQueueDataType,
      MusicEventsQueueDataType,
      MusicEventsQueueNameType
    >,
    config: ConfigService<ConfigSchema, true>
  ) {
    this.#baseUrl = config.get("goout.url", { infer: true });
    // Running as root without --no-sandbox is not supported. See https://crbug.com/638180.
    this.#puppeteerArgs
      = config.get("nodeEnv", { infer: true }) === "development" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
  }

  getRunDate(): Date {
    return this.#runDate;
  }

  isInProcess() {
    return this.#isInProcess;
  }

  async #getArtist(browser: Browser, artistUrl: string): Promise<IArtist | null> {
    const artistPage = await browser.newPage();
    let name: string;
    let genres: string[];
    let sameAs: string[];

    try {
      if (!(await artistPage.goto(artistUrl))) {
        throw new Error("Cannot navigate to the URL: " + artistUrl);
      }

      name = await artistPage.$eval("header h1", (elem) => elem.innerText.trim());
      sameAs = await artistPage.$$eval(
        `::-p-xpath(//header/descendant::ul[contains(@class, 'links-row')]/descendant::a)`,
        (elem) => (elem as HTMLAnchorElement[]).map((a) => a.href)
      );
      genres = await artistPage.$$eval(
        `::-p-xpath(//section[contains(@class, 'py-4')]/p/span[not(contains(@class, 'tags-title'))]/a)`,
        (elem) => (elem as HTMLAnchorElement[]).map((a) => a.innerText.trim())
      );
    } catch {
      await artistPage.close();
      return null;
    }

    await artistPage.close();
    return {
      name,
      genres,
      sameAs,
    };
  }

  async #getMusicEvent(page: Page, musicEventUrl: string): Promise<MusicEventsQueueDataType> {
    const eventName = await page.$eval("h1", (elem) => elem.innerText.trim());

    const artistsDivs = await page.$$(
      "::-p-xpath(//h2[text()='Performing artists']/following-sibling::div[contains(@class, 'row')]/div/div[contains(@class, 'profile-box')]/div[contains(@class, 'content')]/div[1])"
    );
    const artists = (
      await Promise.all(
        artistsDivs.map(async (artistDiv) =>
          this.#getArtist(
            page.browser(),
            await artistDiv.$eval("::-p-xpath(./*[1])", (elem) => (elem as HTMLAnchorElement).href)
          )
        )
      )
    ).filter((artist) => artist !== null);

    let doorsDatetime: Date | undefined;
    try {
      doorsDatetime = await page.$eval(
        `::-p-xpath(//section[contains(@class, 'py-1')]//div[contains(@class, 'info-item')]/div/span[text()='Doors']/parent::div/parent::div/div[2]/time)` as const,
        (elem) => new Date((elem as HTMLTimeElement).dateTime)
      );
    } catch {
      /* doors not found */
    }
    const [datetime1, datetime2] = await page.$$eval(
      "div.detail-header time",
      // `dateTime` attribute of the HTML `time` element contains start datetime value even for the 'end datetime' element, so we have to extract the datetime from the text content
      (elems) => elems.map((elem, i) => (i === 0 ? elem.dateTime.trim() : elem.innerText.trim()))
    );

    if (!datetime1) {
      throw new Error("Missing start date.");
    }

    const getEndDatetime = (value: string) => {
      // `parse` returns an Invalid Date if the date-string cannot be parsed (Invalid Date is a Date, whose time value is NaN.)
      const date = parse(value, "dd/MM/yyyy", new Date().setHours(0, 0, 0, 0));
      return Number.isNaN(date.getTime()) ? undefined : date;
    };
    const startDatetime = new Date(datetime1);
    const endDatetime = datetime2 ? getEndDatetime(datetime2) : undefined;

    const getVenueSelector = (valueName: string) =>
      `::-p-xpath(//section[contains(@class, 'py-1')]//div[contains(@class, 'info-item')]/div/span[text()='${valueName}']/parent::div/parent::div/div[2])` as const;
    const venueName = await page.$eval(getVenueSelector("Venue"), (elem) =>
      (elem as HTMLAnchorElement).innerText.trim()
    );
    const [venueAddress, venueCity] = (
      await page.$eval(getVenueSelector("Address"), (elem) => (elem as HTMLAnchorElement).innerText)
    )
      .split(",")
      .map((e) => e.trim());

    if (!venueCity) {
      throw new Error("Missing venue city.");
    }
    if (!venueAddress) {
      throw new Error("Missing venue address.");
    }

    const [isOnSale, ticketsUrl] = await page.$eval(".ticket-button", (elem) => {
      const anchor = elem as HTMLAnchorElement;
      return [anchor.innerText.trim() === "Tickets", anchor.href] as const;
    });
    return {
      event: {
        name: eventName,
        url: musicEventUrl,
        doorTime: doorsDatetime,
        startDate: startDatetime,
        endDate: endDatetime,
        artists,
        venues: [
          {
            name: venueName,
            address: {
              country: "CZ",
              locality: venueCity,
              street: venueAddress,
            },
            latitude: undefined,
            longitude: undefined,
          },
        ],
        ticket: {
          url: ticketsUrl,
          availability: isOnSale ? ItemAvailability.InStock : ItemAvailability.SoldOut,
        },
      },
    };
  }

  async run() {
    this.#isInProcess = true;
    const browser = await launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
      args: [
        ...this.#puppeteerArgs,
        // The `--user-agent` arg tricks websites into thinking that headless Chromium is a normal Chrome browser.
        // Headless browsers often have different user-agents that websites can detect, e.g: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36".
        // robots.txt file (https://goout.net/robots.txt) allows to crawl music events
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ],
    });

    try {
      // load the page already customized for Czechia
      await browser.setCookie({
        name: "countryIso",
        value: "cz",
        domain: ".goout.net",
        path: "/",
      });

      const page = (await browser.pages())[0]!;

      // load page and wait for a dynamic content (JS) to be loaded properly before continuing
      if (!(await page.goto(this.#baseUrl, { waitUntil: "networkidle2" }))) {
        throw new Error(`No response from the base url: ${this.#baseUrl}.`);
      }

      // SETUP
      // 1) deny cookies
      try {
        await page.locator("button#CybotCookiebotDialogBodyButtonDecline")?.click();
      } catch {
        /* cookies not displayed */
      }

      // 2) check that first dropdown menu button has `innerText="Czechia"` otherwise select "Czechia"
      const country = "Czechia";
      const countryButton = await page.$(
        `::-p-xpath(//button[contains(@class, 'filter-trigger') and contains(text(), '${country}')])`
      );

      if (!countryButton) {
        await page.locator("button.filter-trigger").click();
        await page
          .locator(`::-p-xpath(//div[contains(@class, 'country-list')]//a[contains(text(), '${country}')])`)
          .click();
      }

      // 3) set the 'Concerts' category
      await page
        .locator("::-p-xpath(//button[contains(@class, 'filter-trigger') and contains(text(), 'All categories')])")
        .click();
      await page
        .locator(
          "::-p-xpath(//span[contains(@class, 'categoryFilterItem')]/a/span[contains(@class, 'd-block') and contains(text(), 'Concerts')])"
        )
        .click();

      // GET MUSIC EVENTS
      while (true) {
        try {
          // scroll to the "Show more" button
          const showMoreButton = page.locator(
            "::-p-xpath(//div[contains(@class, 'd-block')]/button[contains(text(), 'Show more')])"
          );
          await showMoreButton.scroll();

          // get music event links
          const linksSelector = "div.event > div.info > a.title";
          await page.waitForSelector(linksSelector);
          const newUrls = await page.$$eval(linksSelector, (links) => links.map((link) => link.href));

          const musicEventPage = await browser.newPage();
          // extract music event data and add it to the queue
          for (const url of newUrls) {
            try {
              if (!(await musicEventPage.goto(url))) {
                throw new Error("Cannot navigate to the URL.");
              }

              const musicEvent = await this.#getMusicEvent(musicEventPage, url);
              await this.musicEventsQueue.add("goout", musicEvent);
            } catch (e) {
              this.#logger.error("[" + url + "]", e);
            }
          }

          await musicEventPage.close();
          // load new music events
          await showMoreButton.click({ delay: 2_000 });
        } catch (e) {
          this.#logger.error(e instanceof Error ? e.message : e, e);
          break;
        }
      }
    } catch (e) {
      this.#logger.error(e instanceof Error ? e.message : e, e);
    } finally {
      await browser.close();
      this.#isInProcess = false;
      this.#setNextRunDate();
    }
  }

  #setNextRunDate() {
    const now = new Date();
    let runDate = set(now, {
      hours: this.#scheduledHour,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    while (runDate.getTime() <= Date.now()) {
      runDate = addDays(runDate, 1);
    }

    this.#runDate = runDate;
  }
}
