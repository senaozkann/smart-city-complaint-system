import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "rapor", "ekran-goruntuleri");
const BASE_URL = "http://127.0.0.1:5173";

async function shot(page, name) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved: ${filePath}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 1. Ana ekran - giriş yapmadan
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  await shot(page, "01-ana-ekran-giris-gerekli");

  // 2. Vatandaş giriş ekranı
  await page.getByRole("button", { name: "Vatandaş Girişi" }).click();
  await page.waitForTimeout(1000);
  await shot(page, "02-vatandas-giris-kayit");

  // 3. Vatandaş giriş yapılmış şikayet ekranı
  await page.getByLabel("Mail").fill("esra@gmail.com");
  await page.getByLabel("Şifre").fill("esra");
  await page.getByRole("button", { name: "Giriş Yap" }).last().click();
  await page.waitForTimeout(2000);
  await shot(page, "03-vatandas-sikayet-ekrani");

  // 4. Eski şikayetler çekmecesi
  await page.getByRole("button", { name: "Eski Şikayetler ve Durum" }).click();
  await page.waitForTimeout(1500);
  await shot(page, "04-vatandas-sikayet-takibi");

  // Çıkış
  await page.getByRole("button", { name: "Çıkış" }).click();
  await page.waitForTimeout(800);

  // 5. Yönetici giriş ekranı
  await page.getByRole("button", { name: "Yönetici Girişi" }).click();
  await page.waitForTimeout(1000);
  await shot(page, "05-admin-giris");

  // 6. Admin paneli
  await page.getByLabel("E-posta").fill("admin@gmail.com");
  await page.getByLabel("Şifre").fill("admin123");
  await page.getByText("Yönetici Girişi").locator("..").getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForTimeout(2500);
  await shot(page, "06-admin-panel-genel");

  // 7. Admin - Atanmamış Bekleyen
  const atanmamisTab = page.getByRole("tab", { name: /Atanmamış Bekleyen/ });
  if (await atanmamisTab.count()) {
    await atanmamisTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "07-admin-atanmamis-bekleyen");
  }

  // 8. Admin - Atanıp Bekleyen
  const atanipTab = page.getByRole("tab", { name: /Atanıp Bekleyen/ });
  if (await atanipTab.count()) {
    await atanipTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "08-admin-atanip-bekleyen");
  }

  // 9. Admin - İncelenen
  const incelenenTab = page.getByRole("tab", { name: /İncelenen/ });
  if (await incelenenTab.count()) {
    await incelenenTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "09-admin-incelenen");
  }

  // 10. Admin - Çözüldü
  const cozulduTab = page.getByRole("tab", { name: /Çözüldü/ });
  if (await cozulduTab.count()) {
    await cozulduTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "10-admin-cozuldu");
  }

  // 11. Uzman giriş
  await page.getByRole("button", { name: "Uzman Girişi" }).click();
  await page.waitForTimeout(1000);
  await shot(page, "11-uzman-giris");

  // 12. Uzman paneli
  await page.getByLabel("Mail").fill("ahmet@gmail.com");
  await page.getByLabel("Şifre").fill("ahmet");
  await page.getByRole("button", { name: "Giriş Yap" }).last().click();
  await page.waitForTimeout(2500);
  await shot(page, "12-uzman-panel-yeni-sikayetler");

  // 13. Uzman - üstlendiklerim sekmesi
  const ustlenTab = page.getByRole("tab", { name: /Üstlendiklerim|Durum/ });
  if (await ustlenTab.count()) {
    await ustlenTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "13-uzman-panel-ustlendiklerim");
  }

  await browser.close();
  console.log("All screenshots captured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
