const base=require('./aquarium-mutation-koi-fixture.cjs');
const mutationSeed='00000000000000000000000000000229';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.namazu=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid)))f.species='namazu';
 p.breeding={'0:namazu':p.breeding['0:koi']};
 p.fish.push({...p.fish[0],uid:'pet-7',species:'koi',tank:1,mutation:{checked:true,kind:'gold',ruleVersion:1}});p.nextId=8;
 p.mutationDiscoveries.push({species:'koi',kind:'gold',firstUid:'pet-7',firstDay:base.day-8,notified:true});
 s.petNotebook={version:1,receivedDay:base.day-4,source:'existing',announced:true,species:[...new Set(p.fish.map(f=>f.species))].map(id=>({id,firstRecordedDay:base.day-4}))};
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'namazu',name:'ナマズ',kind:'albino',label:'白化',title:'白化ナマズ',artId:'namazuAlbino',hatchDays:3,childUid:'pet-8',previousDiscovery:true};
