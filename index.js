const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

// Detect Chrome path for GitHub Actions or local
const getChromePath = () => {
  const paths = [
    "/usr/bin/google-chrome", // GitHub Actions
    "/usr/bin/chromium-browser", // Alt Linux path
    "C:/Users/unger/.cache/puppeteer/chrome/win64-139.0.7258.66/chrome-win64/chrome.exe" // Windows (edit if needed)
  ];
  return paths.find(fs.existsSync);
};

(async () => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    console.error("❌ Missing Telegram credentials in .env or GitHub secrets.");
    return;
  }

  const chromePath = getChromePath();
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  if (chromePath) {
    launchOptions.executablePath = chromePath;
    console.log(`✅ Using Chrome at: ${chromePath}`);
  } else {
    console.log("⚠️ No Chrome path found. Falling back to Puppeteer's default Chromium.");
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto(
      "https://javabykiran.com/jbkcrm/studentattendance/ODIwMzE1MzYwMDAw",
      { waitUntil: "domcontentloaded", timeout: 15000 }
    );

    // Handle any alert popups
    page.on("dialog", async (dialog) => {
      console.log("⚠️ Alert dialog detected:", dialog.message());
      await dialog.accept();
    });

    // Select "Online"
    await page.waitForSelector('input[type="radio"][value="Online"]', { timeout: 5000 });
    await page.click('input[type="radio"][value="Online"]');

    // Fill phone number
    await page.waitForSelector("#contactNumber", { timeout: 5000 });
    await page.evaluate(() => {
      const input = document.querySelector("#contactNumber");
      input.value = "9665924486";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    });

    // Make submit button visible & click
    await page.evaluate(() => {
      const btn = document.getElementById("submitbutton");
      if (btn) btn.style.display = "block";
    });

    await page.click("#form-btn");

    // Wait for response message
    let message = "⚠️ No response message received.";
    try {
      await page.waitForSelector("#message span", { timeout: 5000 });
      message = await page.$eval("#message span", (el) => el.textContent.trim());
    } catch (e) {
      console.warn("⚠️ No message span found.");
    }

    // Send success message to Telegram
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_USER_ID,
      text: `✅ Attendance Bot Success!\n\n${message}`,
    });

    console.log("✅ Attendance done. Telegram message sent.");
  } catch (err) {
    console.error("❌ Error occurred:", err.message);

    // Send failure message to Telegram
    try {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_USER_ID,
        text: `❌ Attendance Bot Failed:\n${err.message}`,
      });
    } catch (telegramErr) {
      console.error("❌ Failed to send Telegram error message:", telegramErr.message);
    }
  } finally {
    await browser.close();
  }
})();
