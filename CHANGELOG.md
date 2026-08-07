# Change Log

## v1.5.4 (2026-08-07)

### Bug Fixes

- **payment:** 修复 EdgeKey 与同一 Cloudflare 账号下的 HashPay Worker 通信时被 `error code: 1042` 拦截的问题。
- **payment:** HashPay 网关返回非 JSON 响应时，记录 HTTP 状态、响应类型与响应摘要，便于排查上游或网络错误。

### Features

- **payment:** 易支付支持在后台配置前台展示的支付渠道（支付宝、微信支付）；下单与创建支付时会在服务端校验所选渠道。旧配置默认同时启用支付宝和微信支付，以保持兼容性。感谢 [@shellus](https://github.com/shellus) 的贡献（[PR #21](https://github.com/34892002/edgeKey/pull/21)）。


### Improvements

- **ci:** 新增可手动触发的 EdgeKey 上游同步工作流；升级时保留实例的 `wrangler.jsonc` 配置。

## v1.5.3 (2026-07-22)

### Improvements

- **product:** 商品详情页富文本中的超宽图片现在会按内容区宽度等比显示；点击图片可打开原图预览，并支持点击遮罩、关闭按钮或 `Esc` 关闭。

### Bug Fixes

- **order:** 修复订单查询页发货内容包含无空格超长字符时横向溢出的问题，现会按字符自动换行。

## v1.5.2 (2026-07-15)

- **feat:** 在新增或编辑**「手动发货」与「快递发货」类型的商品时，支持配置「实物库存」**字段。该字段默认为空，留空则代表库存无限制。

## v1.5.1 (2026-07-13)

- **fix:** 站点设置字段缺失导致保存失败
- **fix:** 商品页面前端未正确展示接口的提示

## v1.5.0 (2026-07-13)

### Features

- **catalog:** 新增"快递发货"发货方式，买家下单时填写收货信息，管理员在订单详情录入快递单号发货
- **site:** 新增站点时区配置，支持全球主要时区，影响后台"今日订单"等统计数据和所有时间展示
- **email:** 邮件模板新增"顾客邮箱"变量（`{{contactEmail}}`），支持支付成功、发货成功、发货失败三个模板

### Bug Fixes

- **catalog:** 修复富文本编辑器标题(h2)和小标题(h3)切换时互相影响的问题
- **catalog:** 修复产品页富文本描述的标题、引用、分割线等 HTML 元素样式缺失，补充全局基础样式
- **catalog:** 修复 FilePickerModal 首次打开不加载文件列表的问题
- **order:** 修复管理后台发货后按钮仍可点击导致 Internal Server Error 的问题
- **order:** 修复关闭订单后提示"请刷新查看最新状态"的问题，改为即时更新 UI
- **order:** 修复发货成功邮件中单条内容多余编号(1.) 的问题
- **catalog:** 修复商品页折扣码输入框和验证按钮高度不一致

### Documentation

- **docs:** 优化数据库迁移指南

## v1.4.8 (2026-07-10)

### Features

- **payment:** 新增 HashPay 加密货币支付网关，支持 USDT、USDC、ETH 等多种币种收款

### Bug Fixes

- **payment:** 修复 Telefunc 错误处理将 500 错误伪装为 403 的问题，改为透传原生错误响应
- **payment:** 修复 HashPay 支付货币写死为 USD 的问题，默认改为 CNY，支持自定义配置

### Documentation

- **docs:** 新增 HashPay 支付接入教程

## v1.4.7 (2026-06-30)

### Features

- **site:** 新增页头/页脚自定义代码注入功能，支持在后台添加统计 JS、Meta 标签、客服插件等自定义代码

### Bug Fixes

- **payment:** 修复 TypeScript 类型错误

## v1.4.6 (2026-06-21)

### Features

- **catalog:** 首页商品列表改为无限滚动加载，每批加载 16 个商品
- **catalog:** 新增分页查询接口支持分类筛选

### Bug Fixes

- **catalog:** 修复首页商品卡片最多展示12个的问题

## v1.4.5 (2026-06-16)

### Features

- **payment:** 新增支付宝当面付(订单码)支付方式
- **order:** 新增 0 元订单支持,使用 100% 折扣码时自动跳过支付流程并直接发货

### Security

- **order:** 0 元订单金额使用 Math.max(0,...) 防止负数篡改
- **order:** 折扣码验证和金额计算均在服务端完成,不信任前端数据
- **order:** 记录免费订单支付日志(FREE_ORDER 事件)用于审计追踪

## v1.4.4 (2026-06-01)

### Bug Fixes

- **auth:** 修复通过 CDN 反向代理访问时，后台登录重定向被跳转到源站域名的问题，Auth.js 现优先使用站点设置中配置的网站地址

## v1.4.3 (2026-05-26)

### Features

- **security:** 新增后台双重认证，支持身份验证器 App 绑定、QuickChart 二维码、登录 TOTP 校验与遗忘 2FA 恢复说明 ([9aca5c9](https://github.com/34892002/edgeKey/commit/9aca5c9))

### Bug Fixes

- **auth:** 加强后台鉴权相关处理，敏感信息处理 ([c09f2fb](https://github.com/34892002/edgeKey/commit/c09f2fb))
- **docs:** 修正文档与发布说明勘误 ([1980c7a](https://github.com/34892002/edgeKey/commit/1980c7a))

## v1.4.1 (2026-05-21)

### Features

- **discount:** 新增商品折扣码功能，支持为商品配置折扣优惠 ([0a25d08](https://github.com/34892002/edgeKey/commit/0a25d08))
- **email:** 邮件模版变量展示，支持在邮件内容中使用变量 ([8079e8f](https://github.com/34892002/edgeKey/commit/8079e8f))
- **email:** 新增邮件服务商 resend，移除mailJet
- **ui:** 后台菜单重构为集中配置管理，支持根据当前路径自动展开/高亮 ([b79bd34](https://github.com/34892002/edgeKey/commit/b79bd34))
- **ui:** 面包屑导航优化，自动关联菜单层级 ([b79bd34](https://github.com/34892002/edgeKey/commit/b79bd34))
- **security:** 安全设置页展示 Turnstile 配置状态，实时检测是否已启用

### Bug Fixes

- **media:** 修复 FilePickerModal 组件过早加载上传图片的问题 ([4d69df2](https://github.com/34892002/edgeKey/commit/4d69df2))
- **email:** 修复发送邮件备注缺失的问题 ([8079e8f](https://github.com/34892002/edgeKey/commit/8079e8f))
- **product:** 修复商品详情页显示问题 ([2769c6d](https://github.com/34892002/edgeKey/commit/2769c6d))

## v1.3.6 (2026-05-17)

### Improvements

- **email:** 邮件日志列表添加分页功能 ([cd08233](https://github.com/34892002/edgeKey/commit/cd08233))
- **order:** 优化订单列表状态显示，仅展示订单状态，隐藏支付状态和发货状态，简化界面 ([8eb2cd5](https://github.com/34892002/edgeKey/commit/8eb2cd5))
- **order:** 完善订单筛选功能，支持按订单状态（待处理、已支付、已发货、已关闭、失败）筛选 ([8eb2cd5](https://github.com/34892002/edgeKey/commit/8eb2cd5))
- **order:** 完善支付方式筛选器，补充 Stripe ([8eb2cd5](https://github.com/34892002/edgeKey/commit/8eb2cd5))

### Bug Fixes

- **payment:** 修复支付失败但订单已创建的问题 ([961e07b](https://github.com/34892002/edgeKey/commit/961e07b))
- **database:** 修复数据库迁移问题 ([9d83b78](https://github.com/34892002/edgeKey/commit/9d83b78))

## v1.3.5 (2026-05-13)

### Features
- **product:** 安全性增强，登陆添加cf验证码 ([d358944](https://github.com/34892002/edgeKey/commit/d358944))
- **product:** 新增商品发货方式，支持自动发货卡密、固定内容自动发货和手动发货配置 ([28c8671](https://github.com/34892002/edgeKey/commit/28c8671))

### Improvements
- **product:** 支付健壮性增强 ([ca76182](https://github.com/34892002/edgeKey/commit/ca76182))
- **product:** 优化商品列表、商品详情和首页商品卡片展示，按发货方式展示库存、发货说明和状态信息 ([ad4de3b](https://github.com/34892002/edgeKey/commit/ad4de3b))
- **payment:** 优化商品详情页支付方式体验，易支付优先展示并补充支付宝、微信渠道图标 ([c450cc8](https://github.com/34892002/edgeKey/commit/c450cc8))
- **order:** 优化本地订单列表状态展示和刷新状态交互体验 ([bf0bf1f](https://github.com/34892002/edgeKey/commit/bf0bf1f))

### Bug Fixes

- **order:** 修复本地缓存订单状态未同步的问题 ([d949e82](https://github.com/34892002/edgeKey/commit/d949e82))
- **order:** 修复订单边界情况处理问题 ([1db9abc](https://github.com/34892002/edgeKey/commit/1db9abc))
- **inventory:** 修复批量导入重复卡密时点击“取消”仍被去重的问题，原始输入继续进入数据库重复检测和导入流程 ([ad4de3b](https://github.com/34892002/edgeKey/commit/ad4de3b))

## v1.3.3 (2026-05-11)

### Bug Fixes

- **media:** 修复异常导致的 CDN 不缓存，命中边缘缓存后大幅降低延迟和 S3 请求开销
- **media:** S3 响应体先完整缓冲再返回，修复流中途断开时异常逃逸 try-catch 导致 `Worker threw exception` 的问题

## v1.3.0 (2026-05-10)

### Features

- **image:** 上传图片时支持浏览器端 WebP 压缩，自动检测浏览器能力，用户可自由开关，压缩失败时自动降级 ([3e2e8d5](https://github.com/34892002/edgeKey/commit/3e2e8d5))
- **file-upload:** 选择文件组件 ([74842cd](https://github.com/34892002/edgeKey/commit/74842cd))
- **s3:** 新增s3协议文件管理，提供文件上传、删除功能 ([2c3a332](https://github.com/34892002/edgeKey/commit/2c3a332))

### Bug Fixes

- **lint:** 规范项目编码，消除 18 处内联 `import()` 写法，统一改为顶部 `import type` ([370b975](https://github.com/34892002/edgeKey/commit/370b975))

### Documentation

- **docs:** 更新说明 ([5a0f09d](https://github.com/34892002/edgeKey/commit/5a0f09d))

## v1.2.2 (2026-04-30)

### Features

- 初始化项目基础架构
- 后台管理系统基础框架
- 商品管理、订单管理、卡密管理
- S3 文件存储集成
- 媒体库基础功能
