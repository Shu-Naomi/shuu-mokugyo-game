// Old feature checks use this common, real UI entry after the staged title was added.
module.exports=async function startAdventure(page,mobile=false,options={}){
 if(await page.locator('#villageCandidateBootstrap').count()){for(let i=0;i<450;i++){if(await page.evaluate(()=>globalThis.ShuVillageReleaseGate?.started===true))break;if(i===449)throw Error('Production save gate did not start');await new Promise(r=>setTimeout(r,100));}}
 const press=q=>page.locator(q)[mobile?'tap':'click']();
 if(await page.locator('#game.active').count())return;
 const slot=options.slot||await page.evaluate(()=>(globalThis.ShuVillageReleaseGate?.adapter||ShuSaveSlots.create(()=>localStorage)).initial(location.search));
 const exists=await page.evaluate(id=>(globalThis.ShuVillageReleaseGate?.adapter||ShuSaveSlots.create(()=>localStorage)).read(id).exists,slot),fresh=options.isNew??!exists;
 await press(fresh?'#titleNew':'#titleContinue');await press(`[data-save-slot="${slot}"]`);
 if(!fresh){await press('#titleResume');await page.locator('#game.active').waitFor({state:'visible'});return;}
 await press('#titleSlotsNext');if(options.avatar)await press(`[data-avatar="${options.avatar}"]`);
 if(options.name!==undefined)await page.locator('#titlePlayerName').fill(options.name);
 await press('#titleCharacterNext');if(options.dog)await press(`[data-dog="${options.dog}"]`);
 await press('#titleDogsNext');await press('#start');await page.locator('#game.active').waitFor({state:'visible'});
};
