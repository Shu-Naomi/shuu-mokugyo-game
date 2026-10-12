// Reveal a product through real category/page buttons before clicking or tapping it.
async function revealProduct(page,selector,mobile=false){
 const press=n=>n[mobile?'tap':'click']();
 if(/data-sam-shop-tab=["']goods/.test(selector))selector='#store [data-sam-category="hands"]';
 if(/data-sam-shop-tab=["']tackle/.test(selector))selector='#store [data-sam-category="bait"]';
 const target=page.locator(selector).first();
 const where=await target.evaluate(n=>({
  scope:n.closest('.compact-window,.modal')?.id,
  sam:n.closest('[data-sam-category-panel]')?.dataset.samCategoryPanel,
  bag:n.closest('[data-inventory-category-panel]')?.dataset.inventoryCategoryPanel,
  tab:n.closest('[data-inventory-panel]')?.dataset.inventoryPanel,
  group:n.closest('[data-compact-group-panel]')?.dataset.compactGroupPanel,
  location:n.closest('[data-location-category-panel]')?.dataset.locationCategoryPanel,
 }));
 if(!await target.isVisible()){
  if(where.sam)await press(page.locator('#store [data-sam-category="'+where.sam+'"]'));
  if(where.tab)await press(page.locator('#inventory [data-inventory-tab="'+where.tab+'"]'));
  if(where.bag)await press(page.locator('#inventory [data-inventory-category="'+where.bag+'"]'));
  if(where.group)await press(page.locator('#inventory [data-compact-group="'+where.group+'"]'));
  if(where.location){const c=page.locator('#locationInterior [data-location-category="'+where.location+'"]');if(await c.count())await press(c);}
 }
 const catalog=target.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " compact-catalog ")][1]');
 if(await catalog.count()){
  const previous=catalog.locator('[data-compact-page="previous"]'),next=catalog.locator('[data-compact-page="next"]');
  if(!await target.isVisible())while(!await previous.isDisabled())await press(previous);
  for(let i=0;i<60&&!await target.isVisible();i++){if(await next.isDisabled())break;await press(next);}
 }
 if(!await target.isVisible()&&!await catalog.count()&&where.scope){
  const guide=page.locator('#'+where.scope+' [data-compact-guide]');
  if(await guide.isVisible())await press(guide);
 }
 return target;
}
async function pressProduct(page,selector,mobile=false){const target=await revealProduct(page,selector,mobile);await target[mobile?'tap':'click']();}
module.exports={revealProduct,pressProduct};
