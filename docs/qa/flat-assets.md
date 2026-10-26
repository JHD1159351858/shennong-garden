# 二维素材与生成提示词

日期：2026-10-25。使用 imagegen 内置工具生成，未使用 API/CLI 回退。以下全部为 AI 生成的写实素材，不宣称实拍、扫描模型或植物品种鉴定资料。

所有最终文件均复制到项目 `public/assets/flat/`，运行和导出只读取本地文件。原生成结果保留在 `.codex/generated_images/01a166d4-a6bb-7522-aed3-6481ed7f20a0/`。

| 文件 | 原始生成文件 | 图像信息 | 字节 |
| --- | --- | --- | ---: |
| background.png | exec-cff1ef0a-3256-46de-8dcf-96a92978e540.png | RGB，1513×1040 | 3395223 |
| hydrangea.png | exec-a0882848-a661-47ec-85fe-102be2888181.png | RGBA，1254×1254 | 2421214 |
| hosta.png | exec-7c2a7212-b0ec-4fe2-b6c3-457d36085066.png | RGBA，1254×1254 | 1981468 |
| grass.png | exec-eea17ced-d325-4eac-b02d-c4ad2cf51ac4.png | RGBA，1254×1254 | 2754248 |
| fern.png | exec-056e385b-abe3-4e4a-8c13-97cf370d75b4.png | RGBA，1254×1254 | 2536951 |
| rock.png | exec-bd6f965f-37c4-4387-9b05-65a0a19bbe03.png | RGBA，1254×1254 | 2250363 |

五份抠图均以 `transparent_background: true` 请求并实测透明通道最小值 0、最大值 255。未在生成后替换背景或重新抠图；网页运行时根据 Alpha 计算可见包围盒、拾取掩码并绘制阴影，不改动素材文件。

## 背景完整提示词

Photorealistic Japanese courtyard garden base plate for an interactive 2D landscape editor. Wide landscape 1600x1100 composition, camera at about 2.5m elevated looking down at 30 degrees, 40mm architectural garden photography. A weathered warm wood engawa veranda and part of a shoji house occupy the extreme left edge (left 18%); a dark charcoal timber fence and distant softly blurred trees occupy only the upper 30%. Most of the frame is a beautifully detailed ground plane: gently curving fine pale gravel path from bottom center towards upper-left center, crossing a few irregular flat gray stepping stones. On both sides are EMPTY gently undulating rich dark planting soil beds with low textured moss edges and scattered fine gravel. Empty planting beds span middle and foreground right, and lower left. Main editable planting area starts at 40% image height and ends near94%. NO shrubs, NO flowers, NO large plants, NO freestanding decorative rocks in the main foreground or middle beds; leave beds empty so transparent plants can be placed over them later. A few distant background twigs beyond fence are fine. Soft warm daylight from upper left, delicate dappled tree shadows, realistic contact shadows and moist subtle moss texture, sophisticated natural color grading. Must look like an actual professionally photographed real garden. No UI, no text, no frame, no labels, no people.

## 抠图公共前缀

每一份抠图的完整提示词为以下公共前缀加对应主体描述：

Photorealistic botanical cutout asset for a premium fixed-camera Japanese garden design editor. Camera elevated 30 degrees looking down, natural three-quarter frontal view, 50mm lens look, soft outdoor daylight from upper left, natural neutral greens, exquisite real leaf veins and fine organic irregularity. Entire subject visible with small transparent margin on every side, ground/root contact centered along bottom of subject, no cut-off leaves, no pot, no label, no text, no background, no ground plane, no cast shadow. Real alpha transparency including all gaps between leaves. Single cohesive plant specimen, not collage. Landscape plant photography quality, not illustration, not low poly or plasticky CGI. Square image.

### hydrangea.png

Subject: one lush compact rounded blue hydrangea shrub with five to seven soft powder-blue and pale periwinkle flower clusters amid deep healthy green leaves, natural asymmetry. Low dense garden mound, flowers blend softly among leaves, no exposed tall stem.

### hosta.png

Subject: one mature dense elegant variegated hosta clump, broad gently arched leaves with deep olive green centers and creamy ivory margins, many overlapping leaves radiating from a low crown, naturally layered foliage, no flowers, not calathea.

### grass.png

Subject: one elegant dense clump of fine green ornamental grass, gracefully arching narrow blades with a few delicate pale cream feathery seed heads, graceful upright fountain shape, natural irregular leaf tips, compact roots.

### fern.png

Subject: one lush mature low fern clump with many graceful spreading pinnate fronds, fine serrated leaflets, rich soft moss green with subtly lighter growing tips, low naturally spreading mound.

### rock.png

Subject: one low asymmetrical natural gray weathered garden boulder with finely cracked slate-like stone texture and soft green moss growing on its base and sheltered crevices. Mostly gray rock with about30% moss, broad grounded shape, no plant stems or surrounding soil.
