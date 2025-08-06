const puppeteer = require("puppeteer");
const axios = require("axios");
require("dotenv").config();

(async () => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto("https://javabykiran.com/jbkcrm/studentattendance/ODIwMzE1MzYwMDAw", {
      waitUntil: "domcontentloaded",
    });

    page.on("dialog", async (dialog) => {
      console.log("Alert:", dialog.message());
      await dialog.accept();
    });

    await page.waitForSelector('input[type="radio"][value="Online"]');
    await page.click('input[type="radio"][value="Online"]');

    await page.waitForSelector("#contactNumber");
    await page.evaluate(() => {
      const input = document.querySelector("#contactNumber");
      input.value = "9665924486"; // Replace with your actual number
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    });

    await page.evaluate(() => {
      document.getElementById("submitbutton").style.display = "block";
    });

    await page.click("#form-btn");

    let message = "";

    try {
      await page.waitForSelector("#message span", { timeout: 5000 });
      message = await page.$eval("#message span", (el) => el.textContent.trim());
    } catch (e) {
      message = "No message displayed after submission.";
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_USER_ID,
      text: `Attendance Bot\n\n${message}`,
    });

    console.log("Attendance process completed and notification sent.");
  } catch (err) {
    console.error("Error:", err.message);

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_USER_ID,
      text: `Attendance Bot Failed:\n${err.message}`,
    });
  } finally {
    await browser.close();
  }
})();
