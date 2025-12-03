本项目支持从 OpenVSX 和 VSCode 插件市场下载插件，默认保持到downloads目录下。

启动脚本 start.sh

-----

若想新增插件市场，需要新增对应的 ExtensionInstaller 子类，实现searchAndNavigateToExtension(extensionName)、getDownloadURL()方法。
