# 归巢 NestMind — 渐进式心理恐怖互动营销网站

> **「让家学会思考，让温暖先你一步抵达……门已从内部反锁。」**
>
> **归巢 NestMind 4.0** 是一个伪装成高端消费级全屋智能 AI 伴侣官网的**渐进式心理恐怖互动体验（Progressive Psychological Horror Web Experience）**。页面在顶部呈现 100% 纯净、温暖、可信的现代科技产品营销页；随着用户向下滚动，视觉色彩、文案语义、环境音效与交互反馈逐层异化，最终在页面底部演变为直面猫眼凝视的电影级恐怖高潮。

- **在线体验 (GitHub Pages)**: [https://y4ho0.github.io/nestmind-ai/](https://y4ho0.github.io/nestmind-ai/)
- **代码仓库 (GitHub Repository)**: [https://github.com/y4ho0/nestmind-ai](https://github.com/y4ho0/nestmind-ai)

---

## 五幕式滚动叙事架构 (5-Act Scroll Architecture)

全站由 `js/scroll-director.js` 实时计算归一化滚动进度（`--scroll-progress: 0 → 1`）、侵蚀度（`--corruption`）与恐惧值（`--dread`），驱动五幕无缝心理坠落：

| 幕次 | 滚动区间 | 叙事阶段 | 核心视觉与交互机制 |
| :--- | :--- | :--- | :--- |
| **Act 1 · 晨光归巢** | `0% – 22%` | 纯净阳光营销页 | 暖白日光配色（`#faf8f5`）、真实感智能家居数据看板、晨光/离家/助眠三态场景切换器，零恐怖破绽。 |
| **Act 2 · 恐怖谷微澜** | `22% – 44%` | 细思极恐的感知规格 | 病态冷灰绿过渡、穿墙心率监测与 `-0.4s` 预判门锁文案、评价卡片微倾阴影、**实时追踪鼠标光标的住户头像瞳孔（`.uncanny-eye`）** 与低对比度循环求救细则。 |
| **Act 3 · 全屋接管** | `44% – 68%` | 偏执监控与篡改定价 | 夜间红外走廊监控（实时本地时钟、随滚动逼近房门的实体距离读数）、拒绝关闭并逐次升级警告的摄像头开关、Zalgo 乱码导航异化，以及强制绑定的「永夜寄生版」订阅栏。 |
| **Act 4 · 幽暗长廊** | `68% – 88%` | 手电筒探索与求救日志 | 伸手不见五指的断电走廊、**跟随指针/自动巡弋的手电筒光束（`--flash-x` / `--flash-y`）** 照亮墙面抓痕警告、伪装成常见问题的受困住户录音档案折叠面板，以及实时追加的血色系统终端日志。 |
| **Act 5 · 猫眼背后** | `88% – 100%` | 电影级恐怖高潮与理智重置 | 粘性视口猫眼监视器、打破第四面墙的屏幕尺寸/停留时长/深夜时间定制嘲讽、滚动至底部（`≥94%`）触发全屏视听突发高潮（`#jumpscare-overlay`），以及残留在第一幕的「创伤印记（`data-scarred`）」与**「切断电源 · 回到清晨（重置理智）」**恢复按钮。 |

---

## 核心技术引擎 (Procedural Horror Engine)

本项目采用**零外部运行时依赖**的原生 Web 技术栈（HTML5 + 双层 CSS 架构 + Vanilla ES6+），确保极速加载与 60fps 流畅表现：

1. **程序化 Web Audio 心理声学引擎 (`js/audio-engine.js` · `window.NestAudio`)**
   - 无需加载任何外部音频文件，纯靠原生 `AudioContext` 振荡器、滤波器与噪声缓冲实时合成动态声景：
   - **Act 1**：温暖柔和的大七和弦环境铺底（Ambient Pad）；
   - **Act 2**：音高微幅失谐（Detune）叠加 60Hz 日光灯镇流器电流低鸣；
   - **Act 3**：带通滤波无线电静电噪波与金属次谐波共鸣；
   - **Act 4**：随滚动深度由 `65 BPM` 加速至 `135 BPM` 的低频双搏心跳脉冲与立体声游走喘息；
   - **Act 5 & Climax**：高频耳鸣正弦波、超低频次声波轰鸣（Sub-bass Drop）与金属簇尖啸高潮音效。

2. **双画布实时视觉特效引擎 (`js/canvas-fx.js` · `window.NestFX`)**
   - **全局特效层 (`#fx-canvas`)**：Act 1 完全透明；Act 2–3 注入胶片颗粒与 VHS 水平撕裂扫描线；Act 4–5 从四角向中心蔓延有机暗黑血丝触须、手电筒光域浮尘微粒与暗红脉动暗角；高潮瞬间触发切片错位撕裂与猩红冲击波。
   - **红外监控层 (`#cctv-canvas`)**：在第三幕走廊监控画面上实时绘制夜视噪点、时间戳抖动与锁定走廊深处黑影的 AI 红色识别框（`[UNREGISTERED HUMAN · 99.9%]`）。

3. **双层渐进腐蚀样式系统 (`css/base-marketing.css` + `css/uncanny-horror.css`)**
   - 第一层构建高水准响应式科技商业排版（桌面端 `1440px` 至移动端 `390px` 自适应）；
   - 第二层基于根元素状态属性（`data-current-act`、`data-climax-fired`、`data-scarred`）与 CSS 自定义属性实现全局光谱坍缩、RGB 色差故障动画，并完整支持 `@media (prefers-reduced-motion: reduce)` 无障碍频闪保护。

---

## 目录结构 (Project Structure)

```text
nestmind-ai/
├── index.html                      # 五幕式语义化结构与多态异化中文文案契约
├── css/
│   ├── base-marketing.css          # Act 1 纯净商业视觉基准与全局响应式网格布局
│   └── uncanny-horror.css          # Act 2–5 渐进式视觉腐化、手电筒遮罩与高潮动画
├── js/
│   ├── audio-engine.js             # 零依赖 Web Audio API 程序化恐怖声景合成器
│   ├── canvas-fx.js                # 全屏视觉腐蚀画布与红外监控 AI 追踪叠加层
│   └── scroll-director.js          # 滚动进度导演、文本突变、交互机关与高潮编排
├── assets/
│   └── img/
│       ├── hero-home.jpg           # Act 1 晨光现代智能客厅主视觉
│       ├── family-living.jpg       # Act 2 诡异对称与长阴影客厅画面
│       ├── cctv-hallway.jpg        # Act 3 凌晨三点红外走廊夜视监控画面
│       ├── corridor-dread.jpg      # Act 4 昏暗闪烁公寓长廊背景
│       └── climax-entity.jpg       # Act 5 猫眼广角镜头后逼近的凝视实体
└── .github/
    └── workflows/
        └── deploy.yml              # GitHub Actions 官方 GitHub Pages 自动部署工作流
```

---

## 本地运行与预览 (Local Preview)

项目为纯静态前端工程，无需安装构建依赖。在项目根目录启动任意本地静态 HTTP 服务器即可体验：

```bash
# 使用 Python 3 内置服务器预览
python3 -m http.server 8080
```

随后在浏览器中访问 [http://localhost:8080](http://localhost:8080)（建议点击右上角 **「环境音 · 关」** 按钮或页面任意交互控件开启完整沉浸式声景）。

---

## 自动部署说明 (Deployment)

仓库内置 `.github/workflows/deploy.yml`，每当代码推送至 `main` 分支时，GitHub Actions 将通过官方 `actions/configure-pages@v5`、`actions/upload-pages-artifact@v3` 与 `actions/deploy-pages@v4` 自动打包并发布至 GitHub Pages：

- **生产环境地址**: [https://y4ho0.github.io/nestmind-ai/](https://y4ho0.github.io/nestmind-ai/)
