const { chromium } = require("playwright");
const OpenVSXExtensionInstaller = require("./extension-installers/open-vsx-extension-installer");
const VSCodeExtensionInstaller = require("./extension-installers/vscode-extension-installer");

/**
 * 下载指定的插件
 * @param {*} extensions 插件名称数组   
 * 
 * 不检查下载目录是否已有插件，因为要下载的插件都是最新版本，会保留多个版本的插件文件。
 */
async function downloadExtensions(extensions) {
  let browser;
  try {
    browser = await chromium.launch({
        headless: false,
        debug: true,
    });
    const browserOptions = {
      downloadDir: "./downloads",
    //   navigationTimeout: 10000, //不加超时时间会默认等到load完成
    //   actionTimeout: 3000,
      downloadTimeout: 3000,
    };

    const download = async (name, installerClass) => {
        console.log(
          `\n-----------------\n开始从 ${name} 插件市场下载插件...\n`
        );
        const installer = new installerClass(
          name,
          browser,
          browserOptions
        );
        await installer.init();
        const [okExtensions, failExtensions] = await installer.installExtensions(
          extensions
        );
        await installer.cleanup();

        return [okExtensions, failExtensions];
    }

    let [okExtensions, failExtensions] = await download("OpenVSX", OpenVSXExtensionInstaller);
    if (failExtensions.length > 0) {
      [okExtensions, failExtensions] = await download("VSCode", VSCodeExtensionInstaller);
    }
    
    console.log("\n-----------------\n");
    if (failExtensions.length > 0) {
      console.log("执行完毕！下载失败的插件：" + failExtensions.join(","));
    } else {
      console.log("执行完毕，所有插件下载成功！");
    }

    await browser.close();
  } catch (error) {
    console.error("下载过程中发生错误:", error);
  }
}

// 使用async IIFE包装顶层await
(async () => {
    const yargs = require("yargs/yargs");
    const { hideBin } = require("yargs/helpers");

    const argv = yargs(hideBin(process.argv)).option("extensions", {
      alias: "e",
      type: "string",
      description: "扩展名列表，用逗号分隔",
      default: ".js,.ts", // 可以设置默认值
    }).argv;

  const extensions = argv.extensions.split(',');
  await downloadExtensions(extensions);
})();
