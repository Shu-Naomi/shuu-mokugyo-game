const base=require('./aquarium-mutation-raigyo-fixture.cjs');
const mutationSeed='000000000000000000000000000000ea';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.tanago=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='tanago';f.bornSize=f.generation?20:300;f.length=300;}
 p.breeding={'0:tanago':p.breeding['0:raigyo']};
 // Keep the ninth discovery and leave room for the new golden child.
 p.fish.push({...p.fish[0],uid:'pet-14',species:'raigyo',bornSize:150,length:2500,tank:2,mutation:{checked:true,kind:'albino',ruleVersion:1}});p.nextId=15;
 p.mutationDiscoveries.push({species:'raigyo',kind:'albino',firstUid:'pet-14',firstDay:base.day-1,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'tanago',name:'タナゴ',kind:'gold',label:'黄金',title:'黄金のタナゴ',artId:'tanagoGold',hatchDays:3,childUid:'pet-15',previousDiscovery:true,notebook:true,nickname:'こがねびより'};
