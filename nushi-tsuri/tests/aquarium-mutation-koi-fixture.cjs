const base=require('./aquarium-mutation-fixture.cjs');
const mutationSeed='00000000000000000000000000000503';
function fixture(){const s=base.fixture(),p=s.petLife;p.mutationSeed=mutationSeed;s.caught.koi=1;
 for(const f of p.fish.filter(f=>['pet-1','pet-2'].includes(f.uid)))f.species='koi';
 p.breeding={'0:koi':p.breeding['0:funa']};
 p.fish.push({...p.fish[0],uid:'pet-3',species:'funa',tank:1,mutation:{checked:true,kind:'gold',ruleVersion:1}});
 p.mutationDiscoveries=[{species:'funa',kind:'gold',firstUid:'pet-3',firstDay:base.day-10,notified:true}];
 return s;
}
module.exports={fixture,day:base.day,mutationSeed,species:'koi',name:'コイ',previousDiscovery:true};
