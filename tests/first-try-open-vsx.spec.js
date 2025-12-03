import { test} from '@playwright/test';
import { escape } from 'querystring';

test('open-vsx trigger search', async ({ browser }) => {
  test.setTimeout(300000);  
  
  
  const context = await browser.newContext({
      bypassCSP: false,
      acceptDownloads: true,
    });
    const page = await context.newPage(); 
    page.setDefaultTimeout(3000);
    page.setDefaultNavigationTimeout(5000);

   // 在导航前执行清理脚本
   await page.addInitScript(() => {
    
     // 监听可能的 base 修改尝试但不阻止
     const originalBase = document.querySelector('base');
     if (originalBase) {
       console.log('Page has existing base tag:', originalBase.href);
     } else {
      console.log("Page does not have existing base tag.");
     }
    // 防止任何 base URI 修改尝试
    Object.defineProperty(document, 'baseURI', {
      writable: false,
      value: document.baseURI
    });
  });
    
    await page.goto("https://open-vsx.org/");

    const button = await page.getByRole("button", { name: "Search" });
    const input = await page.locator('input[id="search-input"]');
  // Expect a title "to contain" a substring.
    console.log(await input.getAttribute('placeholder'), await button.getAttribute('aria-label'));

    const firstItem = await page
      .locator(".MuiGrid-root.MuiGrid-container")
      .last()
      .locator(".MuiGrid-root.MuiGrid-item")
      .first();

    // 获取初始文本内容--无效代码，后续删除
    // const initialText = await firstItem.textContent();
    // console.log(
    //   "列表里的第一个插件标题是",
    //   initialText
    // );

await page.waitForTimeout(1000); //有必要加一个等待页面加载完成的时间，否则会报错User aborted a request.

    await input.focus();
    await input.fill("Path Intellisense");
    //await input.fill(escape("Path Intellisense"));
    // await Promise.all([
    //   page.waitForURL(/search/),
    //   button.press('Enter')
    // ]);
    await button.press('Enter');
    await page.waitForURL(/search/);
    await page.waitForTimeout(1000); //有必要加一个等待页面加载完成的时间，否则会报错User aborted a request.
    
    // 等待firstItem的textContent属性变化
    // await (async (el, initial) => {
    //   return (await el.textContent()) !== initial;
    // }, firstItem, initialText);
    // await page.waitForLoadState('networkidle');

  
  const target = await page.getByRole("link", { name: /Path Intellisense/ });
  //await Promise.all([page.waitForURL(/extension/), target.click()]);
    await target.click();
    await page.waitForURL(/extension/);
    // await page.waitForLoadState('networkidle');
    console.log(await page.url());
    
    
    const downloadButton = await page.getByRole("link", { name: "Download" });
    console.log(await downloadButton.getAttribute("href"));

    await context.close();
    await browser.close();

  });