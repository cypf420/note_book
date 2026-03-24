# YCY 本地笔记工作台

一个面向本地知识库整理的 Markdown 工作台。它支持读取站点内已有文档、抓取网页正文、下载网页图片、将内容转成 Markdown 并保存回本地目录，同时提供搜索、目录导航和阅读/编辑一体化界面。

## 1. 项目用途

- 把网页正文抓取为本地 Markdown
- 自动下载网页中的图片资源
- 将导入结果纳入站点文档库
- 在浏览器中继续阅读、检索、编辑和导出
- 删除不再需要的导入笔记，并同步清理资源目录
- 对笔记进行分组、筛选、分组折叠、拖拽排序，以及新建/重命名/删除空分组

## 2. 抓取后的内容保存在哪里

这是这个项目最关键的落盘位置：

- 导入后的 Markdown 文档：`content/imports/<slug>.md`
- 抓取网页时下载的图片：`content/assets/<slug>/`
- 文档索引：`content/library.json`

说明：

- `<slug>` 来自网页标题，经过 `slugify()` 处理。
- 点击“导入并保存到站点”后，Markdown 会写入 `content/imports/`，并自动更新 `content/library.json`。
- 分组信息和组内顺序保存在 `content/library.json` 的 `groups`、`group`、`order` 字段中。
- 调用 `/api/import-url` 时，服务端会先把网页图片下载到 `content/assets/<slug>/`，即使当前只是“导入到编辑区”，图片目录也可能已经生成。
- 未保存到文件系统的临时编辑内容会保存在浏览器 `localStorage`，键前缀为 `editable-note-site-cache:`。
- 站内已经内置一篇面向使用者的引导文档：`content/imports/新手引导.md`，并同步保留了一份外部说明：`../新手引导.md`。

## 3. 目录结构

```text
editable_note_site/
├── index.html                  # 前端页面
├── style.css                   # 前端样式
├── app.js                      # 前端交互逻辑
├── README.md                   # 技术文档
├── SETUP.md                    # 快速配置说明
├── begin.bat                   # Windows 一键启动入口（推荐）
├── scripts/begin.ps1           # begin.bat 调用的 PowerShell 启动器
├── setup.bat                   # 兼容入口，内部跳转到 begin.bat
├── 启动网站.bat                # 兼容入口，内部跳转到 begin.bat
├── requirements.txt            # Python 依赖
├── content/
│   ├── library.json            # 文档索引
│   ├── imports/                # 导入后的 Markdown
│   └── assets/                 # 导入网页时下载的图片
└── scripts/
    ├── server.py               # 本地 HTTP 服务 + 导入/保存 API
    ├── fetch_note.py           # 旧版兼容抓取脚本
    ├── fetch_assets.py         # 拉取远端图片资源
    └── fetch_all.py            # 批量执行抓取脚本
```

## 4. 运行方式

### 4.1 Windows 双击启动

推荐直接双击：

```text
begin.bat
```

脚本会按以下顺序处理：

1. 如果检测到 Conda，则优先使用或自动创建 `note_book` 环境
2. 如果没有 Conda，则退回 `py -3` 或 `python`
3. 自动检查 `requests`、`beautifulsoup4`、`markdownify`
4. 缺依赖时自动执行安装
5. 启动 `scripts/server.py`

服务启动后：

- 终端会打印实际访问地址
- 默认地址是 `http://127.0.0.1:8000`
- 如果 8000 端口被占用，会自动尝试后续端口
- 设置了 `AUTO_OPEN_BROWSER=1` 时会自动打开浏览器
- `setup.bat` 与 `启动网站.bat` 现在都只作为兼容入口，内部会跳转到 `begin.bat`

### 4.2 手动启动

```bash
pip install -r requirements.txt
python scripts/server.py
```

也可以使用环境变量：

```bash
set HOST=127.0.0.1
set PORT=8000
set AUTO_OPEN_BROWSER=1
python scripts/server.py
```

## 5. 启动后的访问地址

默认是：

```text
http://127.0.0.1:8000
```

`server.py` 启动时会输出类似：

```text
本地笔记工作台已启动
访问地址: http://127.0.0.1:8000
抓取与保存位置:
  导入后的 Markdown: .../content/imports
  下载的图片资源: .../content/assets
  文档索引: .../content/library.json
```

如果默认端口被占用，服务端会自动切换端口，并打印最终地址。

## 6. 前后端工作方式

### 6.1 前端

前端由三个静态文件构成：

- `index.html`
- `style.css`
- `app.js`

主要功能：

- 左侧文档导航和全文搜索
- 中间阅读区
- 右侧 Markdown 抽屉编辑器
- 支持导入网址、保存、导出、目录跳转
- 本地缓存未保存内容

### 6.2 后端

后端是一个基于 `SimpleHTTPRequestHandler` 的本地服务，负责两类工作：

- 提供静态文件访问
- 提供保存与导入 API

核心文件：

- `scripts/server.py`

## 7. API 说明

### `GET /api/library`

读取 `content/library.json`，返回当前站点文档索引。

### `GET /api/import-url?url=<encoded_url>`

作用：

- 抓取网页正文
- 下载页面图片到 `content/assets/<slug>/`
- 将 HTML 转成 Markdown
- 返回 `{ title, slug, markdown }`

注意：

- 这个接口本身不会把 Markdown 写入 `content/imports/`
- 真正落盘依赖前端随后调用 `/api/save-document`

### `POST /api/save-document`

请求体示例：

```json
{
  "path": "content/imports/example.md",
  "title": "Example",
  "slug": "example",
  "markdown": "---\ntitle: Example\n---\n\ncontent",
  "type": "import",
  "sourceUrl": "https://example.com/article"
}
```

作用：

- 将 Markdown 写入指定路径
- 自动更新 `content/library.json`
- 返回保存后的相对路径

### `POST /api/delete-document`

请求体示例：

```json
{
  "path": "./content/imports/example.md"
}
```

作用：

- 删除指定导入文档
- 从 `content/library.json` 中移除对应索引
- 删除 `content/assets/<slug>/` 资源目录（如果存在）

限制：

- 未保存到站点的临时导入内容不允许删除

### `POST /api/update-document-meta`

请求体示例：

```json
{
  "path": "./content/imports/example.md",
  "group": "课程笔记",
  "order": 2
}
```

作用：

- 更新文档所属分组
- 更新文档在组内的顺序
- 写回 `content/library.json`

### `POST /api/create-group`

请求体示例：

```json
{
  "name": "论文阅读"
}
```

作用：

- 创建一个新的空分组
- 将分组注册到 `content/library.json`

### `POST /api/rename-group`

请求体示例：

```json
{
  "oldName": "论文阅读",
  "newName": "论文精读"
}
```

作用：

- 重命名指定分组
- 同步更新该分组下全部文档的 `group` 字段

### `POST /api/delete-group`

请求体示例：

```json
{
  "name": "已清空分组"
}
```

作用：

- 删除一个空分组
- 如果该分组下还有笔记，接口会直接拒绝

## 8. 界面说明

当前界面不再把新手引导直接铺在首页顶部，而是改成了“站内文档 + 树形入口”的组合：

- 顶部 `笔记树` 按钮用于展开树形导航
- 树内支持分组折叠、拖拽排序、移动分组、新建/重命名/删除空分组
- 站内提供 `新手引导` 文档，专门说明这个网站的用途和使用方式
- 非法操作会直接弹窗提示，例如非法网址、非法分组名、删除未保存文档、删除非空分组等

如果是技术同事接手项目，打开站点后先看 `新手引导`，再通过 `笔记树` 管理文档，会比直接读源码更快进入状态。

## 9. 静态模式 vs 本地服务模式

### 静态模式

例如：

```bash
python -m http.server 8000
```

可用：

- 阅读
- 搜索
- 目录导航

不可用：

- `POST /api/save-document`
- `GET /api/import-url`
- 自动写入本地文件

### 本地服务模式

例如：

```bash
python scripts/server.py
```

可用：

- 阅读
- 搜索
- 编辑
- 保存到站点
- 导入网页
- 下载图片到本地
- 自动更新文档索引

## 10. 依赖

`requirements.txt` 当前包含：

```text
requests>=2.32.0
beautifulsoup4>=4.12.0
markdownify>=1.2.0
```

## 11. 常见开发点

如果后续要继续扩展，优先关注这些文件：

- `scripts/server.py`：导入逻辑、保存逻辑、启动行为
- `app.js`：文档加载、缓存、编辑、搜索、导入按钮行为
- `index.html`：页面布局和功能说明入口
- `style.css`：整体界面风格和响应式布局

## 12. 当前这次优化包含什么

本次已经补上：

- 技术向 README
- 页面顶部功能说明
- Windows 双击启动脚本 `begin.bat`
- 服务端启动时打印访问地址和保存位置
- 端口占用时自动切换到可用端口
- 启动后自动打开浏览器的能力
