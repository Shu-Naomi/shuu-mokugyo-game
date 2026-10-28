const base=require('./aquarium-mutation-medaka-fixture.cjs');
const mutationSeed='000000000000000000000000000004ab';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.unagi=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid))){f.species='unagi';f.bornSize=f.generation?150:3000;f.length=3000;}
 p.breeding={'0:unagi':p.breeding['0:medaka']};
 p.fish.push({...p.fish[0],uid:'pet-9',species:'medaka',bornSize:20,length:220,tank:1,mutation:{checked:true,kind:'gold',ruleVersion:1}});p.nextId=10;
 p.mutationDiscoveries.push({species:'medaka',kind:'gold',firstUid:'pet-9',firstDay:base.day-4,notified:true});
 s.petNotebook.species=[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}));
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'unagi',name:'ウナギ',kind:'albino',label:'白化',title:'白化ウナギ',artId:'unagiAlbino',hatchDays:3,childUid:'pet-10',previousDiscovery:true,notebook:true,nickname:'しらゆき'};
