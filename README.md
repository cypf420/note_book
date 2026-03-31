# note_book

本仓库当前实际使用的主项目在 `infosec_project_full/editable_note_site`。

它是一个本地优先的 Markdown 笔记工作台，核心用途是：

- 把网页内容抓取为本地 Markdown
- 在浏览器里直接做所见即所得编辑
- 用 VS Code 风格文件树整理笔记和文件夹
- 把本地笔记上传到 GitHub 共享社区，或从社区导入到本地

## 快速开始

进入 [infosec_project_full/editable_note_site](c:/Users/Lenovo/Desktop/项目/note_book/infosec_project_full/editable_note_site) 后执行：

```bat
begin.bat
```

启动后通常访问：

```text
http://127.0.0.1:8000
```

第一次进入站点后，先在资源管理器里打开 `新手引导` 文档。那份文档是给最终使用者的站内说明。

## 当前界面重点

- 左侧最窄一列是 Activity Bar，用图标切换资源管理器、搜索、导入与同步、源码和设置。
- 默认打开就是所见即所得编辑，不需要先进入 Markdown 源码。
- `Markdown 源码` 是额外功能，通过左侧源码图标或设置面板打开。
- `设置与维护` 面板中包含保存、删除、文件夹管理、清缓存和 `退出站点`。
- `导入与同步` 面板中包含网页导入、上传共享笔记、拉取共享笔记和导出 Markdown。

## 共享社区同步

当前共享机制已经升级为：

- 每个贡献者一个共享分支
- 每个共享分支包含 `shared_notes/manifest.json`
- 默认分支维护中央 `shared_notes/shared-index.json`
- 前端优先读取中央索引，索引缺失时回退到远程分支扫描

GitHub Actions 工作流位于 `.github/workflows/build-shared-index.yml`。

## 进一步阅读

- 站点详细说明：`infosec_project_full/editable_note_site/README.md`
- 站内新手文档：`infosec_project_full/editable_note_site/content/imports/新手引导.md`
- 功能基线：`infosec_project_full/editable_note_site/function.md`
