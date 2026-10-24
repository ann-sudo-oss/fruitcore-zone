# 果核禁区

3D 俯视角果蔬冒险游戏，当前源码为 v20。

## 在线游玩

- GitHub Pages 单人版：https://ann-sudo-oss.github.io/fruitcore-zone/
- 完整版及双人房间：https://wildrift-duo.munalee1987.chatgpt.site/

GitHub Pages 只运行静态前端。双人入口会打开完整站点，使用已部署的房间服务器。单人存档保存在当前网站的浏览器存储中，不会自动跨域同步。

## 内容

36 个区域，每区 78 个房间；147 种武器，143 种生物，14 位探险员；效果卡、商店、隐藏房与 AI 托管。金币为局内货币，果核只有完成整场远征及最终树苗结局才奖励 1 枚。

## 源码

根目录是可直接托管的游戏前端。worker/rooms.mjs 为 Cloudflare Workers 房间 API，drizzle/ 为 D1 数据库迁移。后端需单独部署并绑定 DB，无法在 GitHub Pages 上运行。

Three.js 的许可见 vendor/LICENSE-three.txt。
