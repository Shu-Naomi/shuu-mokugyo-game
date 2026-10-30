const base=require('./aquarium-mutation-madai-fixture.cjs');
const mutationSeed='000000000000000000000000000002ca';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.kamatsuka=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='kamatsuka';f.bornSize=f.generation?40:800;f.length=800;}
 p.breeding={'0:kamatsuka':p.breeding['0:madai']};
 // Keep the seventh discovery in its own sea-water tank and tank 1 available for the new freshwater child.
 p.fish.push({...p.fish[0],uid:'pet-12',species:'madai',bornSize:150,length:2700,tank:3,mutation:{checked:true,kind:'blue',ruleVersion:1}});p.nextId=13;
 p.mutationDiscoveries.push({species:'madai',kind:'blue',firstUid:'pet-12',firstDay:base.day-1,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'kamatsuka',name:'カマツカ',kind:'albino',label:'白化',title:'白化カマツカ',artId:'kamatsukaAlbino',hatchDays:3,childUid:'pet-13',previousDiscovery:true,notebook:true,nickname:'しらすな'};
