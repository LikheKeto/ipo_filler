import puppeteer, { Page } from "puppeteer";
import { loadConfigurations } from "./input.js";
import { sendMail } from "./emailer.js";

const configurations = loadConfigurations("./config.yaml");

let preApplied = [];

export const applyIPO = async () => {
  for (const account of configurations.accounts) {
    try {
      console.log("Filling IPO from account - " + account.boid);
      await openASBA(account);
    } catch (err) {
      if (
        err.message === "There are no new IPOs." ||
        err.message === "Navigation failed because browser has disconnected!"
      ) {
        console.log(err.message);
      } else {
        console.log(err);
        if (configurations.sendmail) {
          sendMail(
            configurations.usermail,
            "Unable to apply IPO!",
            err.message
          );
        }
      }
    }
  }
};

/**
 *
 * @param {{boid:string,password:string,crn:string,dp:string,pin:string}} account
 * @returns
 */
const openASBA = async (account) => {
  let launchConfig = {
    headless: false,
  };
  if (process.platform === "linux") {
    launchConfig.executablePath = "/usr/bin/chromium-browser";
  }
  const browser = await puppeteer.launch(launchConfig);
  const page = await browser.newPage();

  // ensuring puppeteer doesnot keep waiting forever
  // because of no atomaticity, some ipos may be filled before premature exit
  let id = setTimeout(async () => {
    await browser.close();
  }, configurations.timeout * 1000);

  page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36"
  );

  await page.goto("https://meroshare.cdsc.com.np/#/login");

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  await page.waitForSelector(".select2-selection__rendered");

  // Select DP, type in username and password
  await page.click(".select2-selection__rendered");
  await page.type(".select2-search__field", account.dp);
  await page.keyboard.press("Enter");
  await page.type("#username", account.boid);
  await page.type("#password", account.password);

  await new Promise((executor) => {
    setTimeout(() => {
      executor();
    }, 2000);
  });

  // Hit enter and login
  await page.keyboard.press("Enter");

  // Goto My ASBA page
  await page.waitForNavigation();
  await page.goto("https://meroshare.cdsc.com.np/#/asba");
  await page.waitForNavigation();

  // Check for new shares
  await page.waitForSelector(".company-list");
  let companies = await page.$$eval(".company-list", (divs) =>
    divs
      .map(({ innerText }, index) => {
        let splitted = innerText.split("\n");
        let details = {
          id: index + 1,
          companyName: splitted[0],
          shareType: splitted[4],
        };
        if (
          details.shareType == "Ordinary Shares" &&
          splitted.includes("Apply")
        ) {
          return details;
        }
      })
      .filter(Boolean)
  );
  companies = companies.filter(
    (company) => !preApplied.includes(company.companyName)
  );

  if (companies.length === 0) {
    await browser.close();
    clearTimeout(id);
    throw Error("There are no new IPOs.");
  }
  for (const company of companies) {
    console.log("Applying for:", company.companyName);
    await fillAndApply(page, company, account);
    // TODO: ensure we are back to asba page for next ipo
  }
  await browser.close();
  clearTimeout(id);
};

/**
 * @param {Page} page
 * @param {{companyName: any; shareType: any;id: int}} company
 * @param {{boid: string;password: string;crn: string;dp: string;pin: string;}} account
 */
const fillAndApply = async (page, company, account) => {
  const ipoIndex = company.id;
  const [button] = await page.$x(
    `html/body/app-dashboard/div/main/div/app-asba/div/div[2]/app-applicable-issue/div/div/div/div/div[${ipoIndex}]/div/div[2]/div/div[4]/button`
  );
  await button.click();
  await page.waitForSelector(
    "#main > div > app-issue > div > wizard > div > wizard-step:nth-child(1) > form > div.card > div > div:nth-child(4) > div > div:nth-child(2) > div > div > div.col-md-7 > div"
  );
  await page.click(
    "#main > div > app-issue > div > wizard > div > wizard-step:nth-child(1) > form > div.card > div > div:nth-child(4) > div > div:nth-child(2) > div > div > div.col-md-7 > div"
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await page.type("#appliedKitta", `${configurations.kitta}`);
  await page.type("#crnNumber", `${account.crn}`);

  await page.click("#disclaimer");

  await page.click(
    "#main > div > app-issue > div > wizard > div > wizard-step:nth-child(1) > form > div.card > div > div.row > div:nth-child(2) > div > button.btn.btn-gap.btn-primary"
  );
  await page.type("#transactionPIN", account.pin);
  await page.click(
    "#main > div > app-issue > div > wizard > div > wizard-step:nth-child(2) > div.card > div > form > div.row > div > div > div > button.btn.btn-gap.btn-primary"
  );
  await page.waitForNavigation();
  preApplied.push(company.companyName);
  await page.close();
  if (configurations.sendmail) {
    sendMail(
      configurations.usermail,
      "An IPO was successfully applied using IPO Filler",
      `${configurations.kitta} units IPOs of ${company.companyName}(${company.shareType}) were applied using our service.
      \nPlease ensure that no mistake was made.
      \nBOID used:${account.boid}
      `
    );
  }
};
