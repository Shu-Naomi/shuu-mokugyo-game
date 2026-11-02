const base=require('./aquarium-mutation-kamatsuka-fixture.cjs');
const mutationSeed='000000000000000000000000000008cf';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.raigyo=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='raigyo';f.bornSize=f.generation?150:2500;f.length=2500;}
 p.breeding={'0:raigyo':p.breeding['0:kamatsuka']};
 // Keep the eighth rare fish in tank 2, leaving one space in tank 1 for the new child.
 p.fish.push({...p.fish[0],uid:'pet-13',species:'kamatsuka',bornSize:125,length:800,tank:2,mutation:{checked:true,kind:'albino',ruleVersion:1}});p.nextId=14;
 p.mutationDiscoveries.push({species:'kamatsuka',kind:'albino',firstUid:'pet-13',firstDay:base.day-1,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'raigyo',name:'ライギョ',kind:'albino',label:'白化',title:'白化ライギョ',artId:'raigyoAlbino',hatchDays:3,childUid:'pet-14',previousDiscovery:true,notebook:true,nickname:'しらくも'};
