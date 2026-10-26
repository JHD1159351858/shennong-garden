const asset = (id, name, file, color, swatch) => ({ id:`flat-${id}`, name, url:`/assets/flat/${file}.png`, color, swatch });

export const FLAT_FAMILIES = [
  { id:'hydrangea', name:'绣球', category:'花卉', width:.27, variants:[
    asset('hydrangea','蓝色绣球','hydrangea','雾蓝','#8cace4'),
    asset('hydrangea-pink','粉色绣球','hydrangea-pink','柔粉','#e7a4bb'),
    asset('hydrangea-purple','紫色绣球','hydrangea-purple','淡紫','#ae91ca'),
    asset('hydrangea-white','白色绣球','hydrangea-white','奶白','#f3eedc'),
  ] },
  { id:'rose', name:'庭院玫瑰', category:'花卉', width:.24, variants:[
    asset('rose-pink','粉色玫瑰','rose-pink','蔷薇粉','#df91a0'),
    asset('rose-cream','奶油玫瑰','rose-cream','奶油黄','#ecd69d'),
  ] },
  { id:'daisy', name:'白色雏菊', category:'花卉', width:.2, variants:[asset('daisy','白色雏菊','daisy','白色','#f3eedc')] },
  { id:'lavender', name:'紫花薰衣草', category:'花卉', width:.22, variants:[asset('lavender','紫花薰衣草','lavender','紫色','#9e87b5')] },
  { id:'hosta', name:'斑叶玉簪', category:'观叶', width:.25, variants:[asset('hosta','斑叶玉簪','hosta','斑叶绿','#91a177')] },
  { id:'fern', name:'羽叶蕨丛', category:'观叶', width:.22, variants:[asset('fern','羽叶蕨丛','fern','蕨绿','#718a48')] },
  { id:'maple', name:'红叶鸡爪槭', category:'观叶', width:.38, variants:[asset('maple','红叶鸡爪槭','maple','枫红','#a75c55')] },
  { id:'grass', name:'细叶观赏草', category:'观赏草', width:.24, variants:[asset('grass','细叶观赏草','grass','草绿','#a9b48b')] },
  { id:'rock', name:'苔痕景石', category:'景石', width:.25, variants:[asset('rock','苔痕景石','rock','自然石色','#8e9382')] },
  { id:'lantern', name:'日式石灯', category:'装饰', width:.17, variants:[asset('lantern','日式石灯','lantern','灰石','#aaa79b')] },
  { id:'pot', name:'陶土花盆', category:'装饰', width:.14, variants:[asset('pot','陶土花盆','pot','陶土','#bb8062')] },
  { id:'bench', name:'庭院长椅', category:'装饰', width:.32, variants:[asset('bench','庭院长椅','bench','木色','#a38d70')] },
];

export const FLAT_ASSETS = FLAT_FAMILIES.flatMap(family => family.variants.map(variant => ({
  ...variant, family:family.id, category:family.category, width:family.width,
})));
