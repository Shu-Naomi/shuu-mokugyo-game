const base=require('./aquarium-mutation-namazu-fixture.cjs');
const mutationSeed='00000000000000000000000000000934';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.medaka=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='medaka';f.bornSize=f.generation?20:130;f.length=130;}
 p.breeding={'0:medaka':p.breeding['0:namazu']};
 p.fish.push({...p.fish[0],uid:'pet-8',species:'namazu',bornSize:150,length:3000,tank:1,mutation:{checked:true,kind:'albino',ruleVersion:1}});p.nextId=9;
 p.mutationDiscoveries.push({species:'namazu',kind:'albino',firstUid:'pet-8',firstDay:base.day-6,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'medaka',name:'メダカ',kind:'gold',label:'黄金',title:'黄金のメダカ',artId:'medakaGold',hatchDays:3,childUid:'pet-9',previousDiscovery:true,notebook:true,nickname:'こがねちゃん'};
