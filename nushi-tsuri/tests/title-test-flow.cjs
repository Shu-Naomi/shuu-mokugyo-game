// Drive the same title controls as a player, without bypassing the commit guard.
function enter(w,{slot,avatar,name,dog,isNew}={}){
 const click=q=>w.document.querySelector(q).click(),input=w.document.querySelector('#titlePlayerName');
 const current=slot||w.eval('activeSaveSlot'),saved=w.ShuSaveSlots.create(()=>w.localStorage).read(current);
 const fresh=isNew??!saved.exists;
 click(fresh?'#titleNew':'#titleContinue');click(`[data-save-slot="${current}"]`);
 if(!fresh){click('#titleResume');return;}
 click('#titleSlotsNext');if(avatar)click(`[data-avatar="${avatar}"]`);
 if(name!==undefined){input.value=name;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 click('#titleCharacterNext');if(dog)click(`[data-dog="${dog}"]`);click('#titleDogsNext');click('#start');
}
module.exports=enter;
