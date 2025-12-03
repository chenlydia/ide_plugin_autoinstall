import { test } from '@playwright/test';
const VSCodeExtensionInstaller = require('../src/extension-installers/vscode-extension-installer');

// 定义要安装的VS Code扩展列表
const extensionsToInstall = [
  'Prettier - Code formatter',
  'Path Intellisense'
];

test('install vscode extensions', async ({ browser }) => {
  test.setTimeout(6000000); // 设置更长的超时时间，因为要安装多个扩展
  
  // 创建VS Code扩展安装器实例
  const installer = new VSCodeExtensionInstaller(browser, {
    downloadDir: '../downloads',
    downloadTimeout: 3000
  });
  
  try {
    // 初始化安装器
    await installer.init();
    
    // 直接调用installExtensions方法，它会处理所有扩展的安装
    await installer.installExtensions(extensionsToInstall);
    
    console.log('所有扩展下载完成！');
  } catch (error) {
    console.error('扩展安装过程中出现错误:', error);
    throw error;
  } finally {
    // 清理资源
    await installer.cleanup();
  }
});