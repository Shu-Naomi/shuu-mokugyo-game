/* Optional first days in the village. Presentation/progress only: no rewards. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ShuVillageGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const version=1,dogs=['shuu','riku','grey'],milestones=['home','notebook','sam','fishing'];
 function create(){return {version,enabled:true,home:false,notebook:false,dogs:[],sam:false,fishing:false};}
 function normalize(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  // Leave an unfamiliar saved component intact, but never activate it.
  if(value.version!==version)return value;
  return {version,enabled:value.enabled!==false,home:value.home===true,notebook:value.notebook===true,
   dogs:dogs.filter(id=>Array.isArray(value.dogs)&&value.dogs.includes(id)),sam:value.sam===true,fishing:value.fishing===true};
 }
 const valid=state=>state?.villageGuide?.version===version;
 function record(state,event,id){
  if(!valid(state))return false;const guide=state.villageGuide;
  if(event==='dog'){
   if(!dogs.includes(id)||guide.dogs.includes(id))return false;
   guide.dogs.push(id);return true;
  }
  if(!milestones.includes(event)||guide[event])return false;
  guide[event]=true;return true;
 }
 function goal(state){
  if(!valid(state))return {id:'home',place:'village-home',text:'家・三匹・サムの店。順番は自由だよ。'};
  const g=state.villageGuide;
  if(!g.home)return {id:'home',place:'village-home',text:'まずは左の祖父の家へ。寄り道もOK。'};
  if(!g.notebook)return {id:'notebook',place:'village-home',text:'家でメニュー → 湖の手帳を開こう。'};
  if(g.dogs.length<dogs.length)return {id:'dogs',place:'village-home',text:`三匹をナデナデしてみよう（${g.dogs.length}/3）。`};
  if(!g.sam)return {id:'sam',place:'village-sam',text:'村の東、港の北にあるサムの釣具屋へ。'};
  if(!g.fishing&&!state.practiceTutorialComplete)return {id:'fishing',place:'village-practice',text:'気が向いたら、サムの試し釣りへ。'};
  return {id:'done',place:'village-practice',text:'これからは、自分のペースで村の暮らしを。'};
 }
 function visible(state){return valid(state)&&state.villageGuide.enabled&&state.lakeStory?.introSeen===true&&goal(state).id!=='done';}
 function places(points){
  return [
   {id:'village-home',kind:'house',name:'祖父の家・三匹',point:points.home,notes:[
    {text:'村の西端で左へ進み、庭と玄関へ。Aで入る。'},
    {text:'ベッド・台所・水槽。手帳はメニューから。'},
    {text:'三匹に近づいてA。ナデナデで仲良くなろう。'}]},
   {id:'village-sam',kind:'shop',name:'サムの釣具屋',point:points.sam,notes:[
    {text:'村の東、港の北。中央の階段でA。'},
    {text:'餌や道具の相談、試し釣りができるよ。'},
    {text:'買い物も釣りも、気が向いたときで大丈夫。'}]},
   {id:'village-practice',kind:'water',name:'サムの試し釣り池',point:points.practice,notes:[
    {text:'店の「試し釣り」からも行けるよ。'},
    {text:'練習竿と餌は貸出。手持ちの餌は減らない。'},
    {text:'Aで講習開始。準備中はBでやめられる。'}]},
  ];
 }
 return {version,create,normalize,valid,record,goal,visible,places};
});
