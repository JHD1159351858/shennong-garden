# 写实角落：环境表面与光照素材

取得日期：2026-10-24。下载与使用 Poly Haven 官方资源；运行时全部从项目本地加载，不调用远程素材 API。

| 项目 | 官方来源 | 本地文件 / 用途 |
| --- | --- | --- |
| Gravel Floor | https://polyhaven.com/a/gravel_floor | `public/assets/realism/surfaces/gravel_floor_*`：碎石地面 diffuse、OpenGL normal、roughness，1K JPG |
| Brown Mud Leaves 01 | https://polyhaven.com/a/brown_mud_leaves_01 | `brown_mud_leaves_01_*`：种植地面的落叶与泥土，三张 1K JPG |
| Mossy Rock | https://polyhaven.com/a/mossy_rock | `mossy_rock_*`：苔石表面混合与嵌入碎石的踏步，三张 1K JPG |
| Wood Planks | https://polyhaven.com/a/wood_planks | `wood_planks_*`：木廊、格栅、檐口，三张 1K JPG |
| White Plaster 02 | https://polyhaven.com/a/white_plaster_02 | `white_plaster_02_*`：庭院粉墙和格扇衬底，三张 1K JPG |
| Garden Nook | https://polyhaven.com/a/garden_nook | `garden_nook_1k.hdr`：1K HDR 环境照明，不作为庭院静态背景 |

上述资源的官方许可页：https://polyhaven.com/license 。官方注明素材为 CC0；保留来源便于资产审计与替换。下载元数据来自 https://api.polyhaven.com/files/{asset_id} ，15 张地图的实际 CDN URL、字节数和下载后 MD5 记录于同目录 `sources.json`。下载使用官方 API 做一次性离线取材；网页没有实时依赖 API。资料来源由 Poly Haven 提供（Powered by Poly Haven）。

## 实现边界

- `src/realism-environment.js` 导出 `async buildRealismEnvironment(scene,renderer)`，返回 `{groundHeight,dispose}`。
- 场地 11 × 7，x ∈ [-5.5,5.5]，z ∈ [-3.5,3.5]。近景打磨后种植根部跟随连续地形高度；x<-3.75 且 -3.38<z<3.28 的木廊 y=.295。拖拽与初始摆放共用 `groundHeight`，踏步不作为独立碰撞表面。
- 地面是单个细分几何面，种植区约有 4–17 cm 浅起伏；标准 PBR 着色器在 diffuse / normal / roughness 三个通道同步混合碎石、泥土和苔石贴图。几何高度与着色器共用相同种植边界表达式，另有 4,200 个实例化实体碎石。未使用静态庭院背景或纯绿色浮岛。
- 木纹、石纹、地面与粉墙均来自实拍表面资源；建筑与踏步为程序构建的简化几何。苔石贴图是苔藓附着石面的近似表现，不能视为具有独立枝叶几何的真实苔藓。
- 模块提供 HDR 环境光、一个带阴影的方向光和适量半球补光。调用方不应再叠加旧 HemisphereLight / DirectionalLight。曝光、相机和最终渲染后处理由调用方控制。
- 地面自定义 shader 依赖 Three.js r180 的 `map_fragment`、`normal_fragment_maps` 和 `roughnessmap_fragment` 插入点；升级 Three.js 时需再核验着色器编译与画面。

## 本地核验

- `node --check src/realism-environment.js` 通过。
- 15 张表面贴图存在，总计 12,838,664 字节；HDR 为 1,836,222 字节。
- `sources.json` 中 15 条文件记录与磁盘 MD5 一致。
- 运行时着色器、交互与视觉效果由整体网页浏览器验收确认，不以语法检查代替实际验收。
- 首轮浏览器确认 shader 编译正常。依据 `realism-first-pass.png` 的暗部、大片苔石与偏黄碎石问题，第二轮将苔石占比限制到 .22 且仅小块出现，校正地面色彩、提亮木材、加入半球补光，并采用当前 HDRLoader。
