# YCY 本地笔记工作台

这是当前站点的正式说明文档。界面已经调整为 VS Code 风格工作台，默认编辑模式为所见即所得，Markdown 仍然是唯一真实落盘格式。

## 1. 这个站点能做什么

- 把网页正文抓取为本地 Markdown
- 自动下载网页图片并改写为本地资源引用
- 用文件树和文件夹管理本地笔记
- 在浏览器里直接做所见即所得编辑
- 需要时打开 Markdown 源码做精确修改
- 全文搜索、目录跳转、导出 Markdown
- 上传共享笔记到 GitHub 社区，或从社区导入到本地

## 2. 最快启动方式

在当前目录执行：

```bat
begin.bat
```

或手动执行：

```bash
pip install -r requirements.txt
python scripts/server.py
```

启动后通常访问：

```text
http://127.0.0.1:8000
```

如果 8000 端口被占用，服务端会自动切换到其他可用端口。

## 3. 第一次使用建议

第一次进入页面后，建议按这个顺序：

1. 在左侧 `资源管理器` 打开 `新手引导`
2. 在 `导入与同步` 面板里试一次“获取网页内容”
3. 用默认的所见即所得模式直接编辑
4. 点击保存，把文档落到本地
5. 需要时再打开 `Markdown 源码`

## 4. 当前界面结构

### 4.1 Activity Bar

左侧最窄一列是 Activity Bar，只显示图标。鼠标停留约 1 秒后会出现名称提示。

主要入口：

- `资源管理器`：文件树、打开的编辑器、文件夹筛选
- `搜索`：全文搜索标题和正文
- `导入与同步`：网页导入、共享上传、共享拉取、导出 Markdown
- `Markdown 源码`：打开或关闭源码抽屉
- `设置与维护`：保存、删除、文件夹管理、清缓存、退出站点
- `切换主题`：浅色 / 深色切换

### 4.2 资源管理器

资源管理器采用接近 VS Code Explorer 的交互。

支持：

- 展开 / 折叠文件夹
- 高亮当前文档
- 新建空白文件
- 新建空白文件夹
- 获取网页内容
- 文件或文件夹右键菜单
- 文件夹重命名 / 删除
- 文件重命名 / 删除

说明：

- Explorer 根层不会显示 `editable_note_site`
- `新手引导` 是第一个顶层文件夹
- 右键菜单是主要上下文操作入口

### 4.3 编辑区

- 默认模式是所见即所得
- 打开文档后优先看到正文编辑区
- `Markdown 源码` 是附加视图，不再作为默认主界面
- 保存时仍然写回 Markdown 文件

常用快捷键：

- `Ctrl/Cmd + S`：保存
- `Esc`：关闭源码抽屉、关闭弹窗
- `Ctrl/Cmd + E`：打开 / 关闭 Markdown 源码

### 4.4 设置与维护

`设置与维护` 面板中包含：

- 保存当前文档
- 打开 Markdown 源码
- 恢复原始内容
- 删除当前文档
- 文件夹管理
- 阅读宽度 / 专注模式 / 清空缓存
- `退出站点`

退出规则：

- 本地服务模式下，可通过 `退出站点` 停止服务并离开当前页面
- 静态只读模式下，该按钮会禁用

## 5. 数据保存位置

这是当前站点最重要的落盘路径：

- 文档索引：`content/library.json`
- 本地 Markdown 文档：`content/imports/*.md`
- 网页图片资源：`content/assets/<slug>/`
- 共享分支元数据：`shared_notes/manifest.json`
- 中央共享索引：`shared_notes/shared-index.json`

说明：

- Markdown 是唯一真实内容格式
- 所见即所得只是编辑层，不直接作为持久化格式
- 文件夹、顺序和索引信息统一写在 `content/library.json`

## 6. 网页导入怎么工作

`导入与同步` 面板里的“获取网页内容”支持两种操作：

- 导入到当前编辑区
- 导入并保存到站点

服务端会：

- 抓取网页正文
- 尽量用浏览器渲染后的 DOM 提高还原度
- 下载网页图片到 `content/assets/<slug>/`
- 把结果统一转成 Markdown

从网页获取的内容导入后，会直接进入所见即所得编辑，不需要先切到源码。

## 7. GitHub 共享社区同步

当前共享同步不是简单上传单个文件，而是完整的社区分支方案。

### 7.1 上传规则

- 每个贡献者一个共享分支
- 分支名包含：学院、专业、年级、作者
- 每个共享分支都写入 `shared_notes/manifest.json`
- 上传的是完整共享笔记包，而不是单文件

`manifest.json` 至少会描述：

- 分支名
- 作者
- 学院 / 专业 / 年级
- 发布时间
- 文档数 / 分组数
- 标签 / 简介
- 文档预览

### 7.2 中央索引

默认分支维护中央索引：

```text
shared_notes/shared-index.json
```

这份索引由 GitHub Actions 自动生成，前端拉取共享列表时会优先读取它。只有索引不存在或损坏时，前端才会回退到远程分支扫描。

GitHub Actions 工作流见：

- [build-shared-index.yml](c:/Users/Lenovo/Desktop/项目/note_book/.github/workflows/build-shared-index.yml#L1)

### 7.3 上传体验

- 上传任务会在后台继续执行
- 关闭上传弹窗后仍可继续编辑
- 页面右下角会显示：上传中 / 成功 / 失败
- 失败后可直接重试

### 7.4 拉取共享笔记

共享列表支持：

- 按学院筛选
- 按专业筛选
- 按年级筛选
- 按关键词筛选作者、标签、简介、文档标题

导入共享笔记后，内容会真正写回本地工作区，而不是停留为只读远程引用。

## 8. 运行模式

### 8.1 静态模式

例如：

```bash
python -m http.server 8000
```

可用：

- 阅读
- 搜索
- 大纲导航

不可用：

- 保存
- 网页导入
- 共享上传 / 拉取
- 退出站点

### 8.2 本地服务模式

例如：

```bash
python scripts/server.py
```

可用：

- 阅读
- 搜索
- 所见即所得编辑
- Markdown 源码辅助编辑
- 保存到站点
- 网页导入
- 文件 / 文件夹管理
- 共享上传 / 拉取
- 退出站点

## 9. 主要接口

常用接口包括：

- `GET /api/library`
- `GET /api/import-url`
- `POST /api/save-document`
- `POST /api/delete-document`
- `POST /api/create-group`
- `POST /api/rename-group`
- `POST /api/delete-group`
- `GET /api/share-profile-defaults`
- `GET /api/shared-notes`
- `POST /api/publish-shared-notes`
- `POST /api/import-shared-notes`
- `POST /api/shutdown`

核心后端文件是 [server.py](c:/Users/Lenovo/Desktop/项目/note_book/infosec_project_full/editable_note_site/scripts/server.py)。

## 10. 依赖

当前 `requirements.txt` 包含：

```text
requests>=2.32.0
beautifulsoup4>=4.12.0
markdownify>=1.2.0
ftfy>=6.3.1
playwright>=1.58.0
```

## 11. 进一步阅读

- 站内使用说明：[content/imports/新手引导.md](c:/Users/Lenovo/Desktop/项目/note_book/infosec_project_full/editable_note_site/content/imports/新手引导.md)
- 功能基线：[function.md](c:/Users/Lenovo/Desktop/项目/note_book/infosec_project_full/editable_note_site/function.md)
- 迭代记录：`WORKLOG.md`
