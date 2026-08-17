[![English](https://img.shields.io/badge/English-Click-yellow)](README-en.md)
[![中文文档](https://img.shields.io/badge/中文文档-点击查看-orange)](README.md)

# EdgeKey

EdgeKey 是一套有vike框架开发，可直接部署到 Cloudflare 的一体化全栈卡密商城系统：同一套代码同时包含前端页面、SSR 渲染、后端 API / 数据变更入口，并由 Cloudflare Workers 运行。

## CFFK 发卡系统

由于 EdgeKey 现有技术框架及 UI 组件体系的限制，已难以满足新版本对功能扩展、交互体验与界面一致性的要求。CFFK 因此基于全新的技术栈重新设计与开发；由于底层框架不同，项目采用独立仓库维护。
CFFK 将持续完善功能、交互体验与整体架构。EdgeKey 则会转为轻量化版本继续维护，专注于 Bug 修复与稳定性优化，不再进行大型功能迭代。

感谢 EdgeKey 社区提供的反馈、建议，以及每一位贡献者提交的 PR。
[CFFK VS EdgeKey 功能对比](https://github.com/34892002/cffk#-%E4%B8%8E-edgekey-%E7%9A%84%E5%AF%B9%E6%AF%94)
[CFFK 发卡项目](https://github.com/34892002/cffk)

## 功能特性

- 🚀 **真正的零成本** — 不用购买服务器和域名，基于 Cloudflare 全球边缘网络运行。一键部署，即刻上线。把钱花在刀刃上，把时间还给自己。
- 🌍 **零成本运维** — 基于 Workers + D1，免费额度足够满足日常运营，无需担心额外的账单扣费。
- 🛍️ **商品管理** — 支持分类、商品上下架、库存模式（有限/无限）、最小/最大购买数量。
- 🔑 **卡密管理** — 批量导入卡密，支付后自动发货，支持库存实时预警。
- 📦 **订单管理** — 包含订单列表、手动补发、自动关闭过期订单及详细的支付日志。
- 💳 **多支付网关** — 内置 BEpusdt (USDT)、Epay (聚合支付)，支持插件式扩展更多接口。
- 📧 **邮件通知** — 支持 SMTP / API / Cloudflare Email 三种通道，内置详细的邮件发送日志。
- ⚙️ **站点设置** — 灵活配置站点名称、Logo、公告及客服联系方式。
- 🔐 **管理后台** — 安全可靠的管理员账号体系。

> [!TIP]
> **关于 0 成本运行：** 在配合支付渠道（usdt、自建等）、个人邮箱 SMTP 以及免费图床的理想状态下，本项目可实现 **100% 零成本** 运营。

## 技术文档 & 资源推荐
- [一键部署教程](./docs/fast_deploy/start.md)
- [CDN加速配置](./docs/cdn/start.md)
- 支付：[BEpusdt](./docs/pay/bepusdt/start.md)、 [易支付](./docs/pay/epay/start.md) 、[支付宝](./docs/pay/alipay/start.md) 、[支付宝当面付](./docs/pay/alipay-face/start.md) 、[Stripe](./docs/pay/stripe/start.md) 、[HashPay](./docs/pay/hashpay/start.md)
- S3存储：[backblaze](https://www.backblaze.com/) 免费提供 10GB 空间免绑卡/手机号验证。本项目已完美适配 Cloudflare（小黄云），接入后流量费全免；未接入 CF 的用户请选用其他 S3 或图床
- 图床: [91星空图床](https://img.91starry.com/) 免费1G、邮箱注册即用
- 邮件: [resend](https://resend.com/) 免费用户每日可发 100 封邮件，支持自定义域名发信，免信用卡与手机号验证，开箱即用。
- [更新日志](./CHANGELOG.md)

## 项目截图
![1](https://img.91starry.com/uploads/20260427/6286ff36cc987c47a1a27516db0d94c8.jpg)

![2](https://img.91starry.com/uploads/20260427/6072aac36a1d1db8b79cdb535d45138f.jpg)

![3](https://img.91starry.com/uploads/20260427/95dedb45c5d16d8cf69ffa058539b19d.jpg)

## 快速开始

本项目支持三种部署方式，按推荐程度排序：

| 方式 | 适合场景 | 便捷程度 |
|---|---|---|
| **一键部署**（推荐） | 首次部署，无需本地环境 | ⭐⭐⭐ 最简单，点击按钮全自动完成 |
| **Git 自动部署** | 持续迭代，代码推送自动更新 | ⭐⭐ 配置一次后全自动 |
| **手动部署** | 二开需求，细节掌控 | ⭐ 需要本地环境和命令行操作 |

详细步骤见下方各章节说明。

### 一键部署到 Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/34892002/edgeKey)

> **点击按钮后，会打开 Cloudflare Workers 部署向导，操作提示：**
> 1. 登录并授权 Git 账户(github、gitlab)，它会自动在你的git账号创建一个新仓库。
> 2. 为了增强安全性，请在向导中修改默认的密钥（ `AUTH_SECRET`）。
> 3. 如果你不绑定已有的D1数据库，它会自动完成新建数据库并初始化数据（管理员账号等）的操作，无需手动干预。
> 4. 部署成功之后在页面的日志里面可以找到 "Deployed edgekey triggers (0.38 sec) https://edgekey.你的账号.workers.dev" 这样的日志，其中 "https://edgekey.你的账号.workers.dev" 就是你的项目网址。
> 5. https://edgekey.你的账号.workers.dev/admin 为管理后台登陆地址，默认管理员账号:admin，密码:admin123456，切记登陆后立即修改密码！

**一键部署常见问题** 

如果 Cloudflare 提示【无法获取存储库内容】类似的异常信息，多半是很久之前绑定过github但授权状态过期或者异常，解绑后重新绑定授权即可。

一键部署与手动部署存在 wrangler.jsonc 文件的配置冲突，执行 `wrangler d1 ` 开头的命令需要配置 `database_id: 数据库id` ，填写[数据库ID](#如何获取数据库id)，否则会报错。受到影响的命令有 `npm run up` 和 `npm run db:` 开头的命令。

**一键部署后续更新方法**

a.首次更新
```base
git remote add upstream https://github.com/34892002/edgeKey.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories
git push origin main
```

b.后续更新
```base
git fetch upstream
git merge upstream/main
git push origin main
```

> 在你的仓库执行上面的命令更新你的仓库到最新代码，最后git push origin main推送到你的仓库，cloudflare检测到就会自动触发部署

### 通过 Git 连接 Cloudflare 自动部署

如果你使用 Cloudflare Workers 的 Git 集成（连接 GitHub/GitLab 仓库自动部署），需要先完成以下前置步骤：

### Cloudflare Turnstile（管理员登录验证码）

项目现已支持在 **管理员登录页** 接入 Cloudflare Turnstile 小组件，用于拦截自动化爆破登录。

需要在 Cloudflare Dashboard 的 Turnstile 中创建站点，并配置以下环境变量：

- `TURNSTILE_SITE_KEY`：前端小组件站点 Key
- `TURNSTILE_SECRET_KEY`：服务端校验 Secret Key

使用命令给当前项目配置Turnstile
```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put TURNSTILE_SECRET_KEY
```
说明：
- 两个变量都未配置时，Turnstile 默认关闭，不影响现有登录流程
- 两个变量都正确配置后，后台登录页会自动显示 Turnstile 小组件，并在服务端强制校验
- 如果只配置了其中一个变量，系统会自动视为未启用，避免出现半配置状态

**0. 前置：在 Cloudflare Dashboard 创建 D1 数据库**

1. [创建数据库](#如何创建数据库) 名称填 `edgekey-db`
3. 记录[数据库id](#如何获取数据库id) `database_id` ，后续部署命令中需要用到

数据库表结构和种子数据会在首次部署时由 `deploy` 脚本自动完成初始化，无需手动操作。

**1. 部署命令**

由于 `wrangler.jsonc` 中的 `database_id` 需要与你的实际[D1 数据库](#如何获取数据库id)绑定，Git 自动部署时请在 Cloudflare 的"构建配置"中将部署命令设置为：

```bash
sed -i 's/"database_name": "edgekey-db"/"database_name": "edgekey-db", "database_id": "你的database_id"/' wrangler.jsonc && bun run deploy
```

**2. 配置 AUTH_SECRET 环境变量**

在 Cloudflare Workers Git 集成的"高级设置"中：
1. 添加变量名 `AUTH_SECRET`
2. 输入你的密钥字符串作为变量值
3. 勾选"加密"选项

### 构建与部署（手动）

首次部署到 Cloudflare 前，需要先在云端创建并初始化 D1 数据库：

1. **登录并创建数据库**
   ```bash
   bunx wrangler login
   bunx wrangler d1 create edgekey-db
   ```

2. **绑定 Database ID**
   将上一步终端输出的 `database_id` 填入 `wrangler.jsonc`。

```jsonc
"d1_databases": [
	{
		"binding": "DB",
		"database_name": "edgekey-db",
		"database_id": "这里填入你刚创建数据库的UUID", // <-- 必须添加这一行
		"migrations_dir": "prisma/migrations"
	}
]
```

3. **按顺序初始化云端表结构**
   ```bash
   bun run db:migrations:remote
   ```

4. **初始化管理员账号与初始化种子数据**
   ```bash
   bun run db:seed:remote
   ```

5. **配置 AUTH_SECRET**
  输入命令执行，根据命令行提示输入你要使用的密钥字符串。```bash
   bunx wrangler secret put AUTH_SECRET
   ```

6. **生成 Prisma Client 并一键部署**
   ```bash
   bun run db:generate
   bun run up
   ```

`bun run up` 等价于先构建再发布：
- `vike build`
- `wrangler deploy`

部署配置见 `wrangler.jsonc`（其中 `main` 指向 Photon 的 Cloudflare server-entry 虚拟入口）。

## 安全性说明（重要）

当前项目使用管理员账号密码登录。用于生产环境前请务必：
- Cloudflare 生产环境必须配置 `AUTH_SECRET`，未配置会抛出异常并禁止管理员登录
- 配置方式详见上方"一键部署"、"通过 Git 连接 Cloudflare 自动部署"、"构建与部署（手动）"各章节说明
- 生产环境配置AUTH_SECRET命令 `wrangler secret put AUTH_SECRET`
- 默认管理员账号为 `admin / admin123456`，首次登录后请立即修改密码

### 忘记密码？

在 Cloudflare Dashboard 中通过 D1 Console 将密码重置为 `admin123456`：
执行以下 SQL [如何执行sql](#如何执行sql)：

```sql
UPDATE Admin SET passwordHash = '$2b$10$viMe8RgcpM30gmmF9OpOcuA/QgleSIUk5VRtqjOulfSIbgK5jQCI6' WHERE username = 'admin';
```

4. 登录后台后立即修改密码

### 忘记双重认证验证码？

如果已启用双重认证，但验证器 App 丢失或无法获取验证码，可以在 Cloudflare Dashboard 中通过 D1 Console 临时关闭该管理员账号的双重认证。
执行以下 SQL [如何执行sql](#如何执行sql)：

```sql
UPDATE "Admin"
SET "twoFactorEnabled" = false,
    "twoFactorSecret" = NULL,
    "twoFactorEnabledAt" = NULL
WHERE "username" = 'admin';
```

关闭后请立即登录后台，前往 **安全设置** 重新绑定身份验证器 App。该操作需要数据库管理权限，仅作为账号恢复手段使用。


## Cloudflare平台操作

### 如何创建数据库

1. 进入 [dash.cloudflare.com](https://dash.cloudflare.com) → **存储和数据库** → **D1 数据库**
2. 页面右侧点击 **创建数据库** 进入创建 D1 数据库页面
3. **名称**填写数据库名称，**数据位置**没有特殊需求一般选择 自动...最近的可用区域

#### 如何获取数据库ID

1. 进入 [dash.cloudflare.com](https://dash.cloudflare.com) → **存储和数据库** → **D1 数据库**
2. 页面右侧会展示你创建的所有数据库
3. 找到你要操作的数据库名称 比如`edgekey-db` 点击对应的`UUID`即可复制id

### 如何执行SQL

1. 进入 [dash.cloudflare.com](https://dash.cloudflare.com) → **存储和数据库** → **D1 数据库**
2. 页面右侧会展示你创建的所有数据库，点击你要操作的数据库名称 比如 `edgekey-db`
3. 点击顶部标签 → **控制台**

## 本地开发

推荐使用 Bun（也可替换为 npm/pnpm/yarn）。

```bash
bun install
```

由于本项目使用了 Cloudflare D1 数据库，在首次启动本地开发服务器前，必须先初始化本地的 D1 模拟器表结构：

```bash
# 1. 生成 Prisma Client（首次安装依赖后必须执行）
bun run db:generate

# 2. 按顺序将所有迁移脚本应用到本地 Wrangler 模拟器
bun run db:migrations:local

# 3. 初始化管理员账号与初始化种子数据
bun run db:seed

# 4. 准备.env 文件
# 请在 `env.example` 中填写必要的环境变量，例如 `AUTH_SECRET`。
# 然后复制 `env.example` 到 `env` 文件。

# 5. 启动开发服务器
bun run dev
```

### 开发技术文档与规范

[本地开发规范](./docs/development-guide.md)


## 鸣谢

感谢 [Linux.do](https://linux.do/) 、[NodeSeek](https://www.nodeseek.com/) 社区支持。

感谢下列开源项目
- [Ebpusdt](https://github.com/v03413/BEpusdt) — 加密货币交易支持
- [HashPay](https://github.com/TGDash/HashPay) — 一款运行在 Cloudflare Wokers 上的加密货币收款网关
- [worker-mailer](https://github.com/zou-yu/worker-mailer) — Workers环境SMTP邮件支持


## 🏝️ 社区交流
- Telegram 群组：https://t.me/edgeKeyChannel
- Telegram 频道：https://t.me/edgeKeyGroup
