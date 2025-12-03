const ExtensionInstaller = require('./extension-installer');

// 子类：VS Code扩展安装器
class VSCodeExtensionInstaller extends ExtensionInstaller {
  constructor(browser, options = {}) {
    super(browser, options);
    // 设置VS Code市场URL
    this.marketplaceURL = "https://marketplace.visualstudio.com/vscode";
  }


  /**
   * 搜索并进入扩展详情页面（支持子类重写）
   * @param {string} extensionName - 扩展名称
   * @returns {Object} - { publisher: string, extension: string }
   */
  async searchAndNavigateToExtension(extensionName) {
   
    // 点击搜索框并输入扩展名称
    const searchInput = await this.page.locator('input[class="search-input"]');
    const searchButton = await this.page.locator('span[role="button"]');
    
    await searchInput.focus();
    await searchInput.fill(extensionName);
    await searchButton.press('Enter');
    await this.page.waitForURL(/search/);
    
    // 找到并点击扩展链接 - 使用getByRole和正则匹配
    const extensionLink = await this.page.getByRole('link', {
      name: new RegExp(`Extension ${extensionName} by publisher`, 'i'),
      exact: false
    }).first();
    if (!extensionLink) {
      throw new Error(`扩展 ${extensionName} 未找到`);
    }
    
    await extensionLink.click();
    
    await this.page.waitForURL(/.*items.*/);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * 在扩展详情页获取下载地址
   * @returns {string} - 下载地址
   */
  async getDownloadURL() {
    // 获取扩展的发布者和名称信息
    const currentURL = new URL(await this.page.url());
    const itemName = currentURL.searchParams.get('itemName');
    if (!itemName) {
      throw new Error(`无法获取扩展的itemName`);
    }
    
    const [publisher, extension] = itemName.split('.');

    // 点击版本历史标签
    const versionHistoryTab = await this.page.getByRole('button', { name: 'Version History' });
    await versionHistoryTab.click();
    
    // 获取最新版本
    const latestVersionText = await this.page.getByRole('row', { name: /[0-9.]+/ }).first().getByRole('cell').first().textContent();
    const latestVersion = latestVersionText.trim();

    const downloadURL= `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${latestVersion}/vspackage`;

    return downloadURL;
  }

}

module.exports = VSCodeExtensionInstaller;