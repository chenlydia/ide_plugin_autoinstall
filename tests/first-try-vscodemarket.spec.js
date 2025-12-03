import { test} from '@playwright/test';
import { escape } from 'querystring';

test('vscode trigger search', async ({ browser }) => {
  test.setTimeout(300000);  
  
  
  const context = await browser.newContext({
      bypassCSP: false,
      acceptDownloads: true,
    });
    const page = await context.newPage(); 
    
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
    
    await page.goto('https://marketplace.visualstudio.com');


    const vscode = await page.locator('.tab.VSCode');
    await vscode.click();
    await page.waitForURL(/.*vscode.*/);
    await page.waitForLoadState('networkidle');


    const button = await page.locator('span[role="button"]');
    const input = await page.locator('input[class="search-input"]');
  // Expect a title "to contain" a substring.
    console.log(await input.getAttribute('placeholder'), await button.getAttribute('aria-label'));


    await input.focus();
    await input.fill(escape('Node.js Extension Pack'));
    await button.press('Enter');
    await page.waitForLoadState('networkidle');

    console.log(await page.url());

    /*
    const listDivs = await page.locator('div[class="row-item"]');
    const target = await listDivs.filter({
      has: page.locator('span[class="text-title"]:has-text("Node.js Extension Pack")')
    });
    if ((await target.count()) > 0) {
      console.log('target found');
    } else {
      console.log('target not found');
      await context.close();
      await browser.close();
      return false;
    }

    await target.first().click();
*/
  const target = await page.getByRole('link', { name: /Extension Node.js Extension Pack/ });
    await target.click();
    await page.waitForURL(/.*items.*/);
    await page.waitForLoadState('domcontentloaded');
    console.log(await page.url());
    
    const targetURL = new URL(await page.url());
    const itemName = targetURL.searchParams.get('itemName');
    const [fieldA, fieldB] = itemName.split('.');

  const viewHistoryTab = await page.getByRole('button', { name: 'Version History' });
    //const viewHistoryTab = await page.locator('button[id="viewHistory"]');
    await viewHistoryTab.click();
  const version = await page.getByRole('row', { name: /[0-9.]+/ }).first().getByRole('cell').first().textContent();
    //const versionList = await page.locator('div[id="version-history-tab-content"] tr');
    //const version = await versionList.first().textContent();
    console.log("got version:", version, "fieldA:", fieldA, "fieldB:", fieldB);
  console.log(`https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${fieldA}/vsextensions/${fieldB}/${version}/vspackage`);

    
    //等待指定url完成下载文件到本地指定目录
    const downloadURL = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${fieldA}/vsextensions/${fieldB}/${version}/vspackage`;

    
    const downloadPage = await context.newPage();
  
  // 监听下载事件
  //const downloadPromise = downloadPage.waitForEvent('download');

  /**
  // 同时等待导航和下载事件
  const [download] = await Promise.all([
    downloadPage.waitForEvent('download'),
    downloadPage.goto(downloadURL, { waitUntil: 'networkidle' })
  ]);
  await download.saveAs("../downloads/" + download.suggestedFilename());

  */
    downloadPage.on('download', async download => {
      console.log('Download started:', download.url());
      await download.saveAs("../downloads/" + download.suggestedFilename());
    });
    downloadPage.goto(downloadURL, { waitUntil: 'networkidle' });
    
    await context.close();
    await browser.close();

  });


test('vscode trigger download', async ({ browser }) => {
  test.setTimeout(300000);  
  
  
  const context = await browser.newContext({
      bypassCSP: false,
      acceptDownloads: true,
    });
    const downloadPage = await context.newPage(); 


  function getFileNameFromHeaders(headers, defaultName) {
    const contentDisposition = headers.get('content-disposition');
    console.log('content-disposition:', contentDisposition);
    if (!contentDisposition) return defaultName;

    // 匹配 filename="example.pdf" 或 filename=example.pdf
    const matches = contentDisposition.match(/^(.*?)filename=([^;]+)(.*)$/i);
    if (matches && matches[2]) {
      return matches[2];
    }

    return defaultName;
  }


  const downloadURL = "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/waderyan/vsextensions/nodejs-extension-pack/0.1.9/vspackage";

  /*
  downloadPage.on('download', async download => {
    console.log('Download started:', download.url());
    await download.saveAs("../downloads/" + download.suggestedFilename());
  });
  downloadPage.goto(downloadURL, { waitUntil: 'networkidle' });
*/

  // 设置下载事件监听器
  // const downloadPromise = downloadPage.waitForEvent('download');

  // //提前设置下载事件监听
  // await Promise.all([
  //   downloadPage.waitForEvent('download'),
  //   downloadPage.goto(downloadURL, { waitUntil: 'commit' })
  // ]);

  // return;

  // 直接 HTTP 请求避免浏览器上下文问题
  const fs = require('fs');
  
  const response = await fetch(downloadURL);
  const buffer = await response.arrayBuffer();
  const filePath = './downloads/' + getFileNameFromHeaders(response.headers, 'file');
  fs.writeFileSync(filePath, Buffer.from(buffer));
  console.log('Download completed:', filePath, response.headers);


  await context.close();
  await browser.close();


  });

/**
 *  默认page.goto会设置网页的base-uri吗？以下是请求curl命令
 * curl 'https://vsassetscdn.azure.cn/ext/ms.vss-web/core-content/ms.vss-web.core-content.es6.Jf5L1Y.min.js' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'Referer: https://marketplace.visualstudio.com/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.4 Safari/537.36' \
  -H 'sec-ch-ua: "HeadlessChrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"' \
  -H 'Accept-Language: en-US' \
  -H 'sec-ch-ua-mobile: ?0'
 * 
 */