const base=require('./aquarium-mutation-unagi-fixture.cjs');
const mutationSeed='0000000000000000000000000000021e';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.dojo=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='dojo';f.bornSize=f.generation?40:800;f.length=800;}
 p.breeding={'0:dojo':p.breeding['0:unagi']};
 // Keep room in tank 1 for the new child to move there after hatching.
 p.fish.push({...p.fish[0],uid:'pet-10',species:'unagi',bornSize:150,length:3150,tank:2,mutation:{checked:true,kind:'albino',ruleVersion:1}});p.nextId=11;
 p.mutationDiscoveries.push({species:'unagi',kind:'albino',firstUid:'pet-10',firstDay:base.day-2,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'dojo',name:'ドジョウ',kind:'albino',label:'白化',title:'白化ドジョウ',artId:'dojoAlbino',hatchDays:3,childUid:'pet-11',previousDiscovery:true,notebook:true,nickname:'しらもち'};
