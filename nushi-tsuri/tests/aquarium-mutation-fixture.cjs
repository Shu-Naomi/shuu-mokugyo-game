const {seed}=require('./game-harness.cjs');
const day=188,mutationSeed='000000000000000000000000000001ea';
function fish(uid,species,sex,generation){return {uid,species,sex,generation,tank:0,bornSize:generation?150:1300,length:3000,origin:generation?'bred':'shop',acquiredDay:day-4,lastDay:day-1,fedDay:day-1,changedDay:day-1,water:100,health:90,careDays:4,stars:1,xp:40,mutation:{checked:true,kind:'normal',ruleVersion:0}};}
function fixture(){const legacy=fish('pet-4','funa');delete legacy.sex;delete legacy.generation;
 return {...seed(),money:596209,gameMinutes:day*1440+360,soundEnabled:false,x:199,y:36,caught:{funa:1,moroko:1},
  petLife:{version:6,mutationSeed,unlockedTanks:6,food:1000,nextId:6,nextEggId:1,selected:'pet-1',selectedTank:0,
   fish:[fish('pet-1','funa','male',0),fish('pet-2','funa','female',1),legacy,fish('pet-5','moroko','male',0)],
   breeding:{'0:funa':{days:2,lastDay:day-1,mother:'pet-2',father:'pet-1'}}}};
}
module.exports={fixture,day,mutationSeed};
