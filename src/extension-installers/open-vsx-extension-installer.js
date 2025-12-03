/**
 * 本插件市场网页的每次点击，有很多耗时长的fetch请求，因此每次页面导航、每次点击，都需要专门等待一段时间page.waitForTimeout，否则会报错User aborted a request.
 */
const ExtensionInstaller = require("./extension-installer");

// 子类：VS Code扩展安装器
class OpenVSXExtensionInstaller extends ExtensionInstaller {
  constructor(browser, options = {}) {
    super(browser, options);
    // 设置VS Code市场URL
    this.marketplaceURL = "https://open-vsx.org/";
  }

  async navigateToMarketplace() {
    await this.page.goto(this.marketplaceURL);
    await this.page.waitForTimeout(1000); //有必要加一个等待页面加载完成的时间，否则会报错User aborted a request.
  }

  /**
   * 搜索并进入扩展详情页面（支持子类重写）
   * @param {string} extensionName - 扩展名称
   * @returns {Object} - { publisher: string, extension: string }
   */
  async searchAndNavigateToExtension(extensionName) {
    // 点击搜索框并输入扩展名称
    const searchInput = await this.page.locator('input[id="search-input"]');
    const searchButton = await this.page.getByRole("button", { name: "Search" });

    await searchInput.focus();
    await searchInput.fill(extensionName);
    await searchButton.press("Enter");
    await this.page.waitForURL(/search/);
    await this.page.waitForTimeout(3000); //有必要加一个等待页面加载完成的时间，否则会报错User aborted a request.

    // 找到并点击扩展链接 - 使用getByRole和正则匹配
    const extensionLink = await this.page
      .getByRole("link", {
        name: new RegExp(`${extensionName}`, "i"),
        exact: false,
      })
      .first();
    if (!extensionLink) {
      throw new Error(`扩展 ${extensionName} 未找到`);
    }
    
    await extensionLink.click();

    await this.page.waitForURL(/extension/);
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * 在扩展详情页获取下载地址
   * @returns {string} - 下载地址
   */
  async getDownloadURL() {
    // 下载按钮的连接
    const downloadURL = await this.page
      .getByRole("link", { name: "Download" })
      .last()
      .getAttribute("href");

    return downloadURL;
  }
}

module.exports = OpenVSXExtensionInstaller;
