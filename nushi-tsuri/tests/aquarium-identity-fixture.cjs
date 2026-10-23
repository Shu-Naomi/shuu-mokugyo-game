const {seed}=require('./game-harness.cjs');
const day=188;
const fish=(uid,sex,generation,length=2400)=>({uid,species:'isaki',tank:1,length,bornSize:generation?150:1400,origin:generation?'bred':'shop',generation,sex,acquiredDay:day-4,lastDay:day,fedDay:day-1,changedDay:day-1,water:55,health:90,careDays:4,stars:1,xp:40});
function fixture(){
 const legacy=fish('pet-34');delete legacy.sex;delete legacy.generation;
 return {...seed(),money:596209,gameMinutes:day*1440+360,soundEnabled:false,x:199,y:36,caught:{isaki:2},
  petLife:{version:5,unlockedTanks:6,food:1165,selected:'pet-23',selectedTank:1,nextId:36,
   fish:[fish('pet-23','male',0),fish('pet-32','female',1),fish('pet-33','male',2,150),legacy,fish('pet-35','female',20)],
   eggs:[{uid:'egg-1',species:'isaki',tank:2,laidDay:day-1,hatchDay:day+2,generation:2,water:100}]}};
}
module.exports={fixture,fish,day};
