# 写实角落：模型来源与文件核验

核验日期：2026-10-24。此文记录本次新增的 3 种植物与 1 种景石模型；原小样素材未删除。

## 来源及许可

全部模型来自 Poly Haven 官方公共 API 与官方文件服务器。官网许可页明确所有 HDRI、纹理与 3D 模型采用 CC0，可用于商业项目并再分发。

- 许可页：https://polyhaven.com/license
- CC0 1.0：https://creativecommons.org/publicdomain/zero/1.0/
- 元数据：`https://api.polyhaven.com/info/{asset_id}`
- 下载清单：`https://api.polyhaven.com/files/{asset_id}`
- 下载主机：`https://dl.polyhaven.org/file/ph-assets/`
- 每个资源目录保留 `info.json`、`files.json`、`source.gltf`，供追溯；下载的原始文件按官方 MD5 校验。

## 运行时模型

| 名称 / 新 ID | 官方资源及激活变体 | 渲染三角形数 | 原始单体包围盒 X×Y×Z（米） | 显示高度（米） | 运行时引用文件大小 |
| --- | --- | ---: | --- | ---: | ---: |
| 羽叶蕨 / `real-fern` | [fern_02](https://polyhaven.com/a/fern_02)，`fern_02_b` | 2,384 | 0.990 × 0.428 × 0.894 | 0.70 | 2,593,639 B |
| 宽叶绿植 / `real-shrub` | [calathea_orbifolia_01](https://polyhaven.com/a/calathea_orbifolia_01)，`calathea_orbifolia_01_a` | 5,904 | 0.601 × 0.424 × 0.526 | 0.90 | 4,558,772 B |
| 粉花地被 / `real-flower` | [periwinkle_plant](https://polyhaven.com/a/periwinkle_plant)，`periwinkle_plant_01_LOD0` | 11,252 | 0.261 × 0.397 × 0.321 | 0.45 | 4,476,497 B |
| 苔痕景石 / `real-rock` | [rock_moss_set_01](https://polyhaven.com/a/rock_moss_set_01)，`rock_moss_set_01_rock01` | 11,000 | 2.238 × 1.473 × 3.369 | 0.65 | 3,256,406 B |

单份各加载一次合计 **14,885,314 B（约 14.20 MiB）**；复制摆放时复用模板贴图与几何体。表中包围盒由二进制顶点数据及节点旋转实际计算，不使用整套多变体展示排布的尺寸。显示高度用于画面摆放，不代表植物的成熟株高或实测种植数据。花材可由场景加载器将同一真实单株组合成一丛，表内三角形数为单株，不是组合后总量。

官方作者元数据：蕨类扫描 Rob Tuytel、建模 Rico Cilliers；花卉 Amal Kumar；岩石 Kless Gyzen。宽叶绿植作者详见同目录 `calathea_orbifolia_01/info.json`。

入口统一为 `/assets/realism/models/{asset_id}/model.gltf`；catalog 为 `src/realism-catalog.js`。每份入口引用 1 个 `.bin` 和 3 张 2K 纹理，全部存放本地。

## 为网页使用所做的处理

1. 官方包含多个横向排列的变体。入口仅激活表中一个完整单株/单石节点，清除展示排布位移，保留其原始旋转和网格结构。其余未激活网格仍在原始二进制文件内，以保留来源可追溯性；不会被渲染。
2. 使用 2048 × 2048 纹理，保留真实表面颜色、法线和粗糙度。未使用 4K/8K 版本。
3. 发现官方 JPEG glTF 的叶片材质虽设透明模式，但 JPEG 本身不包含透明通道。另从官方下载 `Alpha` / `opacity` PNG，将原始漫反射颜色与该通道合并为 RGBA WebP；没有生成或虚构叶片纹理。
4. 植物设置 `MASK` 与阈值 `0.5`，避免半透明叶片的深度排序问题；使用原始双面材质。ARM 贴图的红通道作为 AO 接入，强度 `0.35`；法线强度 `0.5`。WebP 使用 `EXT_texture_webp` glTF 扩展。
5. 植物为有空间体积的多叶片、枝条网格，其中叶片使用行业常见的透明裁切面片；不是一整张面向相机的植物立绘。岩石为完整立体表面网格。

处理脚本：`scripts/download-realism-models.mjs`。运行需要 Node.js 与已安装 Pillow 的 Python；无需 Blender。仅生成本目录资源与 glTF 入口。

## 已完成的离线核验

- 4 个 `model.gltf` 的全部外部 buffer / image 引用存在。
- 每份二进制 `.bin` 长度与 glTF 的 `byteLength` 相等。
- 所有下载的原始模型、纹理通过官方 MD5 校验。
- 三种植物的最终 RGBA WebP 均为 2048 × 2048，Alpha 数值范围均为 0–255。
- 激活的单体节点与三角形数量已解析核验，累计各一个为 30,540 个三角形。
- 模型在网页中的最终加载、拖拽、三机位、阴影观感及帧率由主任务浏览器验证；此文不将离线完整性检查等同于视觉验收。

本次植物用于写实渲染可行性验证，尚未验证其对沈阳气候、具体场地光照、花期或实际施工的适宜性。

## 首轮画面反馈后的资产调整

根据 `realism-first-pass.png` 的实际画面，首轮蕨类与枝条灌木过稀，无法形成参考图中的饱满绿量。已从原包切换为叶量约三倍的蕨类 `b` 变体、叶量约两倍的花卉 `01_LOD0` 变体，并将细枝 `shrub_02` 替换为完整的 `calathea_orbifolia_01_a` 宽叶株。`real-shrub` ID 保持兼容，原下载资源保留但不再被 catalog 引用。

首轮纯黑叶排查：原三种植物在不透明叶片区域的 AO 均值为 240–247/255，无低于 12/255 的 AO 像素；蕨和灌木黑色漫反射像素比例为 0，花卉约 0.68%。透明贴图分辨率与颜色图一致、对应相同官方资产。贴图未发现足以导致大块纯黑叶面的错误，需结合浏览器检查双面叶片的直接光、环境填充光与自阴影。
