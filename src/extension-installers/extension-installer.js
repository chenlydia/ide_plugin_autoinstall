/**
 * 调用方式：
 * const extensions = [];
 *
 * const installer = new ExtensionInstaller(browser, {
 *   downloadDir: "../downloads",
 *   downloadTimeout: 3000,
 * });
 * await installer.init();
 * await installer.installExtensions(extensions);
 *
 * await installer.cleanup();
 */

const path = require("path");
const fs = require("fs");

// 父类：通用扩展安装器
class ExtensionInstaller {
  constructor(name, browser, options = {}) {
    this.name = name;
    this.browser = browser;
    this.context = null;
    this.page = null;
    this.marketplaceURL = "";
    this.navigateTimeout = options.navigationTimeout || null;
    this.actionTimeout = options.actionTimeout || null;
    this.downloadTimeout = options.downloadTimeout || 3000;

    // 检查downloadDir是否为绝对路径
    const downloadDir = options.downloadDir || "./downloads";
    let basePath;
    if (path.isAbsolute(downloadDir)) {
      // 如果是绝对路径，直接使用
      basePath = downloadDir;
    } else {
      // 如果是相对路径，相对于当前文件所在目录
      basePath = path.resolve(downloadDir);
    }
    // 确保目录存在
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    this.downloadDir = basePath;
    console.log(`[${this.name}] 插件存储目录：${this.downloadDir}`);
  }

  /**
   * 初始化浏览器上下文和页面
   */
  async init() {
    this.context = await this.browser.newContext({
      bypassCSP: false,
      acceptDownloads: true,
    });

    this.page = await this.context.newPage();
    if (this.navigateTimeout) {
      await this.page.setDefaultNavigationTimeout(this.navigateTimeout);
    }
    if (this.actionTimeout) {
      await this.page.setDefaultTimeout(this.actionTimeout);
    } 

    //导航到首页
    await this.navigateToMarketplace();
  }

  /**
   * 导航到市场
   */
  async navigateToMarketplace() {
    // 此方法有默认实现，不支持子类重写
    if (this.marketplaceURL.length == 0) {
      throw new Error(
        "navigateToMarketplace method should not be called directly. Use installExtension instead."
      );
    }

    this.page.goto(this.marketplaceURL);
    //this.page.waitForLoadState("networkidle"); //一般无需此函数，因为每个DOM元素在被操作前都会自动等待其一系列状态就绪
  }

  /**
   * 搜索并进入扩展详情页面（支持子类重写）
   * @param {string} extensionName - 扩展名称
   */
  async searchAndNavigateToExtension(extensionName) {
    throw new Error(
      "searchAndNavigateToExtension method must be implemented by subclass"
    );
  }

  /**
   * 在扩展详情页获取下载地址（支持子类重写）
   * @returns {string} - 下载地址
   */
  async getDownloadURL() {
    throw new Error("getDownloadURL method must be implemented by subclass");
  }

  /**
   * 安装单个扩展（支持子类重写）
   * @param {string} extensionName - 扩展名称
   * * @returns {bool} - 下载状态
   */
  async installExtension(extensionName) {
    let installResult = false;
    console.log(`[${this.name}] 开始下载扩展: ${extensionName}`);

    try {
      await this.searchAndNavigateToExtension(extensionName);
      const downloadURL = await this.getDownloadURL();

      const { buffer, response } = await this.downloadFile(downloadURL);
      if (!response.ok) {
        throw new Error(`下载失败 ${extensionName}: HTTP ${response.status}`);
      }

      const fileName = this.getFileNameFromHeaders(
        response.headers,
        "downloaded.ext"
      );
      const filePath = this.saveFile(buffer, fileName);
      installResult = true;
      console.log(
        `[${this.name}] 插件${extensionName}已下载并保存到: ${filePath}`
      );
    } catch (error) {
      if (error.name === "AbortError") {
        console.error(
          `[${this.name}] 下载超时 ${extensionName}: 超过${this.downloadTimeout}毫秒`
        );
      } else {
        console.error(
          `[${this.name}] 下载失败 ${extensionName}: ${error.message}`
        );
      }
    } finally {
      return installResult;
    }
  }

  /**
   * 安装多个扩展
   * @param {string[]} extensions - 扩展名称数组
   * @returns {string[], string[]} - 成功插件，失败插件
   */
  async installExtensions(extensions) {
    const okExtensions = [];
    const failExtensions = [];

    // 循环安装每个扩展
    let i = 0;
    for (const extensionName of extensions) {
      i = i + 1;
      const installResult = await this.installExtension(extensionName.trim());
      if (installResult) {
        okExtensions.push(extensionName);
      } else {
        failExtensions.push(extensionName);
      }

      //必须保留if条件，避免最后一个元素不会触发页面导航，即避免请求被中断导致报错
      if (i < extensions.length) {
        await this.navigateToMarketplace();
      }
    }

    if (extensions.length == okExtensions.length) {
      console.log(`[${this.name}] 所有插件下载完毕！${okExtensions.join(",")}`);
    } else {
      console.log(
        `[${this.name}] 成功下载${
          okExtensions.length
        } 个插件：${okExtensions.join(
          ","
        )}。\n 下载失败的插件：${failExtensions.join(",")}`
      );
    }

    return [okExtensions, failExtensions];
  }

  /**
   * 从响应头获取文件名
   * @param {Headers} headers - 响应头
   * @param {string} defaultName - 默认文件名
   * @returns {string} - 文件名
   */
  getFileNameFromHeaders(headers, defaultName) {
    const contentDisposition = headers.get("content-disposition");
    if (!contentDisposition) return defaultName;

    // 匹配 filename="example.pdf" 或 filename=example.pdf
    const matches = contentDisposition.match(
      /filename[^;=]*=(?:(?:"([^"]*)")|(?:([^;\s]*)))/i
    );
    if (matches && (matches[1] || matches[2])) {
      return matches[1] || matches[2];
    }

    return defaultName;
  }

  /**
   * 下载文件（带超时机制）
   * @param {string} url - 下载URL
   * @returns {Object} - { buffer: ArrayBuffer, fileName: string }
   */
  async downloadFile(url) {
    // 设置超时的AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.downloadTimeout
    );

    try {
      // 发起fetch请求，带有超时信号
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return { buffer, response };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 保存文件到本地
   * @param {ArrayBuffer} buffer - 文件内容
   * @param {string} fileName - 文件名
   * @returns {string} - 文件路径
   */
  saveFile(buffer, fileName) {
    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(this.downloadDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.page)  {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
  }
}

module.exports = ExtensionInstaller;
