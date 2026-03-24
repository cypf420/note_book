# 本地笔记工作台 - 快速开始

## 一键环境配置（推荐）

### Windows 用户

双击运行 `begin.bat` 脚本，即可自动完成以下操作：

1. 优先使用或自动创建名为 `note_book` 的 conda 环境（Python 3.13）
2. 如果没有 conda，则尝试使用系统 Python
3. 自动安装所有必需依赖
4. 直接启动网站并显示访问地址

### 手动配置

如果脚本无法运行，可以手动执行以下命令：

```bash
# 创建 conda 环境
conda create -n note_book python=3.13 -y

# 激活环境
conda activate note_book

# 安装依赖
pip install -r requirements.txt
```

## 启动服务器

```bash
# 推荐直接双击
begin.bat
```

或者手动：

```bash
conda activate note_book
python scripts/server.py
```

然后在浏览器中打开终端提示的网址，默认是：http://127.0.0.1:8000

## 依赖包说明

| 包名 | 版本要求 | 用途 |
|------|---------|------|
| requests | >=2.32.0 | HTTP 请求，用于抓取网页内容 |
| beautifulsoup4 | >=4.12.0 | HTML 解析，提取网页主要内容 |
| markdownify | >=1.2.0 | HTML 转 Markdown |

## 常见问题

### Q: 提示找不到 conda 命令？
A: 请先安装 Anaconda 或 Miniconda：
- Anaconda: https://www.anaconda.com/download
- Miniconda: https://docs.conda.io/en/latest/miniconda.html

### Q: 端口 8000 被占用？
A: 可以修改 `scripts/server.py` 中的端口号，或通过环境变量指定：
```bash
set PORT=8080
python scripts/server.py
```

### Q: 如何停止服务器？
A: 在运行服务器的终端窗口按 `Ctrl+C`

## 项目功能

- ✅ Typora 风格的阅读/编辑一体化体验
- ✅ 自动目录（TOC）
- ✅ 全文搜索
- ✅ 网址一键导入
- ✅ 自动下载网页图片到本地
- ✅ 多文档管理

## 技术支持

如有问题，请查看 [README.md](README.md) 获取详细文档。
