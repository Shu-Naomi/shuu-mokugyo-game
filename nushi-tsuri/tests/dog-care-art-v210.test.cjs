const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {boot}=require('./game-harness.cjs');

test('care portraits preserve the authored fur and silhouette without cut-out seams',async()=>{
  const app=boot(),w=app.window;
  try{
    const source=w.eval('dogIdleImage.src'),image=await loadImage(path.join(__dirname,'..',source.split('?')[0]));
    const eyes={shuu:[[135,103],[184,103]],riku:[[131,88],[170,88]],grey:[[132,97],[182,97]]};
    const mouths={shuu:[160,140],riku:[150,121],grey:[160,132]};
    for(const [row,dog]of ['shuu','riku','grey'].entries()){
      const size=dog==='riku'?220:188,scale=size/320,paw={shuu:298,riku:232,grey:300}[dog];
      const ox=144-size/2,oy=166-paw*scale,bottoms=[];
      for(const mode of ['idle','pet','treat'])for(const progress of [0,.2,.4,.5,.65,.9,1]){
        const canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);
        ctx.imageSmoothingEnabled=false;ctx.drawImage=(im,...args)=>draw(im.src===source?image:im,...args);
        const anchors=w.drawDogCareCloseup(ctx,dog,mode,progress,10000);
        const actual=ctx.getImageData(0,0,320,180).data;
        // Reference is one intact portrait, with a gentle sway anchored at the paws.
        const reference=createCanvas(320,180),ref=reference.getContext('2d');ref.imageSmoothingEnabled=false;
        const sway=mode==='idle'?0:Math.sin(progress*Math.PI*3)*.035;
        ref.setTransform(scale,0,scale*sway,scale,ox-sway*paw*scale,oy);
        ref.drawImage(image,0,row*320,320,320,0,0,320,320);
        const expected=ref.getImageData(0,0,320,180).data;let bottom=0,changed=0;
        for(let y=0;y<180;y++)for(let x=0;x<320;x++){
          const i=(y*320+x)*4;
          assert.equal(actual[i+3],expected[i+3],`${dog} ${mode} ${progress}: silhouette split at ${x},${y}`);
          if(actual[i+3]>100)bottom=Math.max(bottom,y);
          if(actual[i]===expected[i]&&actual[i+1]===expected[i+1]&&actual[i+2]===expected[i+2])continue;
          const sy=(y+.5-oy)/scale,sx=(x+.5-ox)/scale-sway*(sy-paw);
          const lid=eyes[dog].some(([ex,ey])=>Math.hypot(sx-ex,sy-ey)<12);
          const [mx,my]=mouths[dog],mouth=Math.abs(sx-mx)<10&&Math.abs(sy-my)<9;
          assert.ok(lid||mouth,`${dog} ${mode} ${progress}: fur overwritten at ${x},${y}`);changed++;
        }
        if(mode==='idle')assert.equal(changed,0,'neutral portrait must match the original exactly');
        if(mode==='pet'&&progress===.5)assert.ok(changed>20,'relaxed eyelids still animate');
        const [mx,my]=mouths[dog];
        assert.ok(Math.abs(anchors.x-(ox+(mx+sway*(my-paw))*scale))<.001,'food follows the mouth');
        assert.ok(Math.abs(anchors.y-(oy+my*scale))<.001);bottoms.push(bottom);
      }
      assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<=1,`${dog} paws hop: ${bottoms}`);
    }
    assert.deepEqual(app.errors,[]);
  }finally{app.dispose();}
});
