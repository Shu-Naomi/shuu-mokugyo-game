const assert=require('node:assert/strict');
// A range may sit below a newly added settings section. Bring the actual
// control into view before deriving the coordinates used by mouse or touch.
module.exports=async function dragRange(page,selector,from,to,cdp=null){
 const input=page.locator(selector);await input.scrollIntoViewIfNeeded();
 const r=await input.boundingBox(),viewport=page.viewportSize();
 assert.ok(r&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,'range must be visible before dragging: '+selector);
 const a={x:r.x+8+(r.width-16)*from,y:r.y+r.height/2},b={x:r.x+8+(r.width-16)*to,y:a.y};
 if(cdp){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}
};
