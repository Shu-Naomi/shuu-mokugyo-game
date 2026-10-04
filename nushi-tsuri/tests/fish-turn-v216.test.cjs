const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const Art=require('../fish-art.js'),Aquarium=require('../aquarium-life.js');

function silhouette(ctx){
  const data=ctx.getImageData(0,0,448,224).data;let count=0,left=448,right=0,top=224,bottom=0,edge=0;
  for(let n=0;n<448*224;n++)if(data[n*4+3]>100){
    const x=n%448,y=Math.floor(n/448);count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    if(x<2||x>445||y<2||y>221)edge++;
  }
  return {count,width:right-left+1,height:bottom-top+1,center:(right+left)/2,edge};
}
test('dense fish turns retain complete frontal volume and Kurodai cannot turn frontward again near the left side',async()=>{
  for(const id of ['suzuki','kurodai','moroko','ayu']){
    const images=new Map();for(const src of Art.assets(id))images.set(src,await loadImage(path.join(__dirname,'..',src)));
    const ctx=createCanvas(448,224).getContext('2d'),shapes=[];
    for(let n=0;n<=96;n++){
      assert.equal(Art.draw(ctx,images.get(Art.species[id].asset),id,7,n/16,src=>images.get(src)),true);
      const shape=silhouette(ctx);assert.ok(shape.count>3500,id+' complete '+n);assert.equal(shape.edge,0,id+' unclipped '+n);shapes.push(shape);
    }
    assert.ok(shapes[48].width>shapes[0].width*.25,id+' frontal thickness and paired fins');
    assert.ok(shapes[48].height>shapes[0].height*.8,id+' frontal head retains height');
    if(id==='kurodai'){
      assert.ok(shapes[92].width>=shapes[88].width*.95,'late leftward pose must not suddenly narrow towards the viewer');
      assert.ok(Math.abs(shapes[92].center-shapes[88].center)<20,'late turn keeps head and body in place');
    }
  }
});

test('all species get a readable turn at 60 fps even with six fast swimmers, without jumps in position',()=>{
  const catalog=Object.keys(Art.species).map(id=>({id,max:12000}));let turns=0;
  for(const id of Object.keys(Art.species)){
    const fish=Array.from({length:6},(_,i)=>({uid:id+i,species:id,length:2600})),started=Array(6).fill(null);
    let previous=null,completed=0;
    for(let tick=0;tick<7200;tick++){
      const seconds=tick/60,poses=Aquarium.layout(fish,catalog,720,350,seconds,()=>2).poses;
      for(let i=0;i<poses.length;i++){
        const p=poses[i],turning=p.yaw>.0001&&p.yaw<Math.PI-.0001;
        if(previous)assert.ok(Math.abs(p.x-previous[i].x)<3,id+' stays on its swim path');
        const wasTurning=previous&&previous[i].yaw>.0001&&previous[i].yaw<Math.PI-.0001;
        // A fish may already be halfway through its turn at time zero.
        if(turning&&previous&&!wasTurning)started[i]=seconds;
        if(!turning&&started[i]!==null){
          assert.ok(seconds-started[i]>=1.72,id+' readable turning time '+(seconds-started[i]));started[i]=null;completed++;turns++;
        }
      }
      previous=poses;
    }
    assert.ok(completed>0,id+' turns were observed');
  }
  assert.ok(turns>100);
});
