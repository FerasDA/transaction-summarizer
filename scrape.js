const puppeteer = require("puppeteer");
const fs = require("fs");
const csv = require("csv-parser");

async function scrapeCSV(filePath) {
  const records = [];

  const csvStream = fs
    .createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      records.push(data);
    })
    .on("end", async () => {
      const browser = await puppeteer.launch({ headless: "new" });

      async function waitFor(milliseconds) {
        return new Promise((resolve) => {
          setTimeout(resolve, milliseconds);
        });
      }

      for (const record of records) {
        const url = record["Link"];

        if (url) {
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "domcontentloaded" });

          try {
            await waitFor(2000);

            // Extract the title from the first h3 element
            const title = await page.evaluate(() => {
              const h3Element = document.querySelector("h3");

              return h3Element ? h3Element.textContent : null;
            });

            record["Title"] = title;
            console.log("Transaction Description from search: ", title);
          } catch (error) {
            console.error(`Error scraping ${url}: ${error.message}`);
          }

          await page.close();
        }
      }

      await browser.close();

      // Save the updated CSV
      const csvData = records
        .map((record) =>
          Object.values(record)
            .map((value) => `"${value}"`)
            .join(",")
        )
        .join("\n");

      fs.writeFileSync(filePath, csvData);

      console.log("Scraping complete.");
    });

  csvStream.on("close", () => {
    console.log("CSV stream closed.");
  });
}

// Replace 'your-input-file.csv' with your actual CSV file path
scrapeCSV("transactions.csv");
