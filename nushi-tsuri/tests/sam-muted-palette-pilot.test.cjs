const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pilot=require('./sam-muted-palette-pilot.cjs');
test('bounded palette changes no dimensions, coordinates, alpha or exterior pixels',()=>{
 const width=1536,height=864,data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<data.length;i+=4){data[i]=(i/4)%256;data[i+1]=170;data[i+2]=90;data[i+3]=(i/4)%3?255:0;}
 const snapshot=Buffer.from(data),out=pilot.transform({width,height,data}),colors=new Set(pilot.palette.map(p=>p.join(',')));let changed=0;
 assert.equal(out.width,width);assert.equal(out.height,height);assert.deepEqual(Buffer.from(data),snapshot);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;assert.equal(out.data[i+3],data[i+3]);
  if(pilot.contains(x+.5,y+.5)&&data[i+3]){assert.ok(colors.has([...out.data.slice(i,i+3)].join(',')));changed++;}
  else assert.deepEqual(out.data.slice(i,i+4),data.slice(i,i+4));
 }
 assert.equal(out.selected,changed);assert.ok(out.changed>20000);assert.ok(out.selected<width*height*.05);
});
test('palette is deterministic and does not spread a neighboring color',()=>{
 const width=1536,height=864,data=new Uint8ClampedArray(width*height*4),i=(500*width+1200)*4;
 data.set([255,180,70,255],i);const out=pilot.transform({width,height,data});
 assert.equal(out.selected,1);assert.deepEqual([...out.data.slice(i,i+3)],pilot.color(255,180,70));
 assert.deepEqual(pilot.transform({width,height,data}).data,out.data);
});
test('pilot remains review-only and never enters production or offline loading',()=>{
 for(const file of ['index.html','sw.js','scene-layers.js','layered-scenery.js'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),/sam-muted-palette|SamMutedPalettePilot/);
 assert.throws(()=>pilot.transform({width:2,height:1,data:new Uint8ClampedArray(1)}),/Invalid image/);
});
