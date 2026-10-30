const base=require('./aquarium-mutation-dojo-fixture.cjs');
const mutationSeed='000000000000000000000000000002fb';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.madai=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='madai';f.bornSize=f.generation?150:2700;f.length=2700;}
 p.breeding={'0:madai':p.breeding['0:dojo']};
 p.fish.push({...p.fish[0],uid:'pet-11',species:'dojo',bornSize:40,length:800,tank:2,mutation:{checked:true,kind:'albino',ruleVersion:1}});p.nextId=12;
 p.mutationDiscoveries.push({species:'dojo',kind:'albino',firstUid:'pet-11',firstDay:base.day-1,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
// Normalization moves the legacy freshwater fish to tank 1; tank 3 stays empty for the sea-water child.
module.exports={fixture,day:base.day,mutationSeed,species:'madai',name:'マダイ',kind:'blue',label:'蒼鱗',title:'蒼鱗マダイ',artId:'madaiBlue',hatchDays:3,childUid:'pet-12',moveTank:3,previousDiscovery:true,notebook:true,nickname:'あおしお',labelColor:'rgb(177, 231, 255)'};
