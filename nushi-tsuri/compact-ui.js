/* Compact shop and bag views keep the game's original transaction controls. */
(function(root){
  'use strict';
  const controllers=new Set(),decorations=new Map(),pages=new Map(),selections=new Map(),groups=new Map(),focusAfter=new Map();
  let sheet=null;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const clean=n=>(n?.textContent||'').replace(/\s+/g,' ').trim();
  const icon=kind=>'<svg class="compact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="'+({box:'M3 5h18v15H3zM6 9h12M6 15h4m4 2h4',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',info:'M12 10v8m0-12v1M3 3h18v18H3z',feed:'M5 8h14v13H5zM8 3h8v5M8 12h8m-8 4h3',gear:'M4 6h16v14H4zM8 3v6m8-6v6M8 14h8',wallet:'M3 5h18v15H3zM15 10h6v5h-6z'})[kind||'box']+'"/></svg>';
  function button(label,kind){const b=el('button','compact-button');b.type='button';if(kind)b.innerHTML=icon(kind);b.append(el('span','',label));return b;}
  function key(n){if(n.id)return ['id',n.id];return [...n.attributes].filter(a=>a.name.startsWith('data-')&&!a.name.startsWith('data-compact-')).map(a=>[a.name,a.value])[0]||null;}
  function rememberFocus(scope){const n=document.activeElement;if(scope.contains(n)&&n.tagName==='BUTTON'){const k=key(n);if(k)focusAfter.set(scope.id,k);}}
  function restoreFocus(scope){const k=focusAfter.get(scope.id);if(!k)return;focusAfter.delete(scope.id);const n=[...scope.querySelectorAll('button')].find(n=>n.getAttribute(k[0])===k[1]);if(!n)return;
    const c=[...controllers].find(c=>c.root.contains(n));if(c)c.reveal(n);(n.disabled?n.closest('.compact-product')?.querySelector('[data-compact-info]'):n)?.focus({preventScroll:true});}
  function move(n,to,d){if(!n)return;const mark=document.createComment('compact-position');n.before(mark);d.moves.push({n,mark,hidden:n.hidden,onclick:n.onclick});to.append(n);}
  function suppress(n,d){if(n&&!n.classList.contains('compact-suppressed')){n.classList.add('compact-suppressed');d.suppressed.push(n);}}
  function decorate(scope){const d={scope,moves:[],nodes:[],suppressed:[],cleanup:[]};decorations.set(scope,d);scope.classList.add('compact-window');return d;}
  function add(parent,n,d){parent.append(n);d.nodes.push(n);return n;}
  function cloneArt(n){if(!n)return el('span','compact-fallback');const copy=n.cloneNode(true),from=[...(n.tagName==='CANVAS'?[n]:n.querySelectorAll('canvas'))],to=[...(copy.tagName==='CANVAS'?[copy]:copy.querySelectorAll('canvas'))];
    [copy,...copy.querySelectorAll('[id]')].forEach(e=>e.removeAttribute('id'));from.forEach((c,i)=>{try{to[i]?.getContext('2d').drawImage(c,0,0);}catch(_){}});return copy;}
  function closeSheet(restore=true){if(!sheet)return;const old=sheet;sheet=null;old.moves.reverse().forEach(m=>{if(m.mark.parentNode)m.mark.replaceWith(m.n);});old.inert.forEach(([n,v])=>n.inert=v);old.layer.remove();if(restore&&old.opener?.isConnected)old.opener.focus({preventScroll:true});}
  function openSheet(scope,title,opener,fill){closeSheet(false);const layer=el('div','compact-sheet-layer'),shade=button('案内を閉じる');shade.className='compact-sheet-shade';shade.tabIndex=-1;
    const panel=el('section','compact-sheet'),head=el('header','compact-sheet-heading'),heading=el('h3','',title),back=button('戻る'),body=el('div','compact-sheet-body');heading.id='compactSheetTitle';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby',heading.id);
    back.dataset.compactSheetClose='';head.append(heading,back);panel.append(head,body);layer.append(shade,panel);
    const inert=[...scope.children].map(n=>[n,n.inert]);inert.forEach(([n])=>n.inert=true);scope.append(layer);sheet={scope,layer,opener,inert,moves:[]};fill(body,sheet);
    back.onclick=shade.onclick=e=>{e.stopPropagation();closeSheet();};panel.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSheet();return;}
      if(e.key!=='Tab')return;const a=[...panel.querySelectorAll('button:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getBoundingClientRect().width>0);if(!a.length)return;
      if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus();}
    });back.focus({preventScroll:true});return body;
  }
  function guide(scope,title,opener,nodes){openSheet(scope,title,opener,(body,s)=>{
    for(const n of (typeof nodes==='function'?nodes():nodes)){if(!n)continue;const mark=document.createComment('compact-guide');n.before(mark);s.moves.push({n,mark});body.append(n);}
    if(!body.children.length)body.append(el('p','','品物の「詳細」から用途や使い方を確認できるよ。'));
  });}
  function nameOf(n,opts){const named=opts.name?.(n)||clean(n.querySelector('b'));if(named)return named;const span=n.querySelector('span'),label=span?[...span.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim():'';return label||clean(span)||clean(n)||'品物';}
  function detailsOf(n,opts){const lines=[...n.querySelectorAll('small,p,.pet-card-comment')].map(clean).filter(Boolean);if(opts.description)lines.push(opts.description(n));return [...new Set(lines)].filter(Boolean);}
  function actionText(b){const a=b.dataset,price=(clean(b.querySelector('[data-sam-total],[data-sam-price],strong'))||clean(b)).match(/[\d,]+円/);
    if(a.fishingMethod!=null||a.fightMode!=null)return b.getAttribute('aria-pressed')==='true'?'選択中':clean(b);
    if(b.disabled&&b.classList.contains('owned'))return '購入済み';
    if([...b.attributes].some(x=>/^data-buy-/.test(x.name))||a.petBuy!=null)return '購入'+(price?' · '+price[0]:'');
    if(a.petNushi!=null)return b.disabled?'迎え済み':'無料で迎える';
    if(a.cookRecipe!=null)return '作る';if(a.eatPreparedMeal!=null||a.useItem!=null)return '食べる';
    if([...b.attributes].some(x=>/^data-(pick|equip)-/.test(x.name)))return b.classList.contains('selected')?'選択中':'選ぶ';
    if(a.petBuybackTank!=null)return '水槽を開く';if(a.petBuyback!=null)return 'この子を見る';
    return clean(b);
  }
  function sourceArt(n){return n.querySelector(':scope > i,.shop-item-art,.rod-display-art,.pet-fish-thumb,.pet-specimen-window,svg.pixel-item-icon,svg.tackle-pixel-icon');}
  function catalog(node,opts={}){
    const scope=node.closest('.compact-window');if(!scope)return;
    const cards=opts.cards||[...node.querySelectorAll(opts.selector||'.inventory-card')];
    const grid=el('div','compact-product-grid'),pager=el('nav','compact-pager'),previous=button('前へ','left'),next=button('次へ','right'),label=el('span','compact-page-label');pager.setAttribute('aria-label','品物のページ');previous.dataset.compactPage='previous';next.dataset.compactPage='next';label.setAttribute('aria-live','polite');pager.append(previous,label,next);grid.setAttribute('role','listbox');grid.setAttribute('aria-label','品物を選ぶ');
    const children=[...node.childNodes];children.forEach(n=>grid.append(n));node.append(grid,pager);node.classList.add('compact-catalog');
    const operationSpace=opts.list?el('div','compact-operation-space'):null;if(operationSpace){operationSpace.setAttribute('aria-hidden','true');node.append(operationSpace);node.classList.add('compact-sam-list');}
    const items=cards.map((original,i)=>{
      const wrap=el('article','compact-product'),pick=button(''),thumb=el('span','compact-row-art'),caption=el('span','compact-row-caption'),art=el('div','compact-art'),title=el('span','compact-product-name'),stock=el('small','compact-product-stock'),detail=el('section','compact-selection-panel'),head=el('div','compact-selection-heading'),words=el('div','compact-selection-caption'),name=el('h3','compact-selection-name'),status=el('small','compact-selection-status'),description=el('p','compact-selection-description'),actions=el('div','compact-product-actions'),info=button('詳しく','info');info.dataset.compactInfo='';thumb.setAttribute('aria-hidden','true');pick.className='compact-product-select';pick.dataset.compactSelect=String(i);pick.setAttribute('role','option');pick.setAttribute('aria-selected','false');
      original.before(wrap);original.classList.add('compact-original');caption.append(title,stock);pick.append(thumb,caption);words.append(name,status);head.append(art,words);detail.append(head,description,actions);wrap.append(pick,detail);actions.append(original,info);
      let picture=sourceArt(original),artMark=null;if(picture){artMark=document.createComment('compact-art');picture.before(artMark);art.append(picture);}else{const html=opts.art?.(original);if(html)art.innerHTML=html;else art.innerHTML=icon(opts.icon||'box');}
      const controls=original.tagName==='BUTTON'?[original]:[...original.querySelectorAll('button')],paths=new Set(),aria=new Map();
      controls.forEach(b=>{aria.set(b,b.getAttribute('aria-label'));b.classList.add('compact-action');for(let p=b.parentElement;p&&p!==original&&original.contains(p);p=p.parentElement){p.classList.add('compact-action-path');paths.add(p);}});
      const item={original,wrap,pick,thumb,art,title,stock,detail,name,status,description,info,controls,picture,artMark,paths,aria};
      pick.onclick=e=>{e.stopPropagation();c.choose(i);};
      pick.onkeydown=e=>{const step={ArrowDown:c.columns||1,ArrowRight:1,ArrowUp:-(c.columns||1),ArrowLeft:-1,PageDown:c.size,PageUp:-c.size}[e.key];let index=e.key==='Home'?0:e.key==='End'?items.length-1:step==null?null:i+step;if(index==null)return;e.preventDefault();index=Math.max(0,Math.min(items.length-1,index));c.choose(index);items[index].pick.focus({preventScroll:true});};
      info.onclick=e=>{e.stopPropagation();openSheet(scope,nameOf(original,opts),info,body=>{
        const hero=el('div','compact-detail-art');hero.append(cloneArt(art));body.append(hero);
        for(const text of detailsOf(original,opts))body.append(el('p','',text));
        const status=opts.stock?.(original)||clean(original.querySelector('[data-sam-stock]'))||clean(original.querySelector('.inventory-purpose,strong'));if(status)body.append(el('p','compact-detail-status',status));
        const dock=el('div','compact-detail-actions');controls.forEach(b=>{const action=button(opts.action?.(b)||actionText(b));action.disabled=b.disabled;action.onclick=e=>{e.stopPropagation();if(b.disabled||!b.isConnected)return;closeSheet(false);b.focus({preventScroll:true});b.click();};dock.append(action);});if(dock.children.length)body.append(dock);
      });};return item;
    });
    if(!items.length){const empty=el('div','compact-catalog-empty');empty.innerHTML=icon(opts.icon||'box');empty.append(el('p','',opts.empty||clean(grid)||'この分類の品物はまだないよ。'));grid.replaceChildren(empty);}
    const groupNodes=[...grid.querySelectorAll('.grid,.shop-goods,.equipment-options,.tackle-options,.compact-source-group')];groupNodes.forEach(n=>n.classList.add('compact-grid-source'));
    const id=opts.key||node.id,c={root:node,grid,pager,items,page:pages.get(id)||0,selected:selections.get(id)||0,size:3,observer:null};
    c.update=()=>{
      items.forEach((item,i)=>{const n=item.original;item.title.textContent=nameOf(n,opts);item.name.textContent=item.title.textContent;const stock=(opts.stock?.(n)||clean(n.querySelector('[data-sam-stock]'))||clean(n.querySelector('.inventory-card-actions strong,:scope > strong,.inventory-purpose'))).replace(/[\d,]+円/g,'').trim(),price=clean(n.querySelector('[data-sam-total],[data-sam-price],strong,button[data-pet-buy]')).match(/[\d,]+円/);item.stock.textContent=[price?.[0],stock].filter(Boolean).join(' · ');item.status.textContent=stock;
        item.description.textContent=detailsOf(n,opts).filter(t=>t!==stock).join(' · ')||'この品物の説明と操作を確認できるよ。';item.pick.setAttribute('aria-label',item.title.textContent+' · '+item.stock.textContent);item.pick.setAttribute('aria-selected',String(i===c.selected));item.wrap.classList.toggle('compact-selected',i===c.selected);item.detail.hidden=i!==c.selected;
        item.controls.forEach(b=>{const label=opts.action?.(b)||actionText(b);b.setAttribute('data-compact-action-label',label);if(item.aria.get(b)==null)b.setAttribute('aria-label',label+' · '+item.title.textContent);});item.wrap.classList.toggle('compact-unavailable',item.controls.length>0&&item.controls.every(b=>b.disabled));
      });};
    c.apply=()=>{const boxHeight=node.clientHeight,style=boxHeight?getComputedStyle(node):null,height=boxHeight?boxHeight-parseFloat(style.paddingTop||0)-parseFloat(style.paddingBottom||0):(innerHeight>500?350:150),available=height-(opts.list?48:0),step=opts.list?46:48,all=Math.max(1,Math.floor((available+step-44)/step));
      c.columns=opts.list&&items.length>all&&(node.clientWidth||innerWidth*.55)>=300?2:1;node.style.setProperty('--compact-list-columns',c.columns);c.size=items.length<=all*c.columns?all*c.columns:Math.max(1,Math.floor((available-44)/step))*c.columns;
      const total=Math.max(1,Math.ceil(items.length/c.size));c.selected=Math.max(0,Math.min(c.selected,items.length-1));c.page=Math.floor(c.selected/c.size);
      items.forEach((it,i)=>it.wrap.hidden=Math.floor(i/c.size)!==c.page);pager.hidden=total===1;previous.disabled=c.page===0;next.disabled=c.page===total-1;label.textContent=(c.page+1)+' / '+total+' · '+items.length+'品';pages.set(id,c.page);selections.set(id,c.selected);c.update();opts.onLayout?.();
      if(opts.list){const listHeight=Math.max(1,Math.ceil(Math.min(c.size,items.length-c.page*c.size)/c.columns))*46-2;node.style.setProperty('--compact-list-height',listHeight+'px');node.style.setProperty('--compact-operation-top',(listHeight+4+(pager.hidden?0:48))+'px');}
      if(opts.quantity&&items[c.selected])items[c.selected].detail.append(opts.quantity);
      items.forEach(it=>{const copy=cloneArt(it.art);[copy,...copy.querySelectorAll('*')].forEach(n=>{for(const a of [...n.attributes])if(a.name.startsWith('data-'))n.removeAttribute(a.name);});it.thumb.replaceChildren(copy);});
    };
    c.announce=()=>{const it=items[c.selected];if(it)opts.describe?.(it.name.textContent,it.description.textContent);};
    c.choose=i=>{c.selected=i;c.page=Math.floor(i/c.size);c.apply();c.announce();};c.reveal=n=>{const i=items.findIndex(it=>it.wrap.contains(n));if(i>=0)c.choose(i);};
    previous.onclick=()=>c.choose((c.page-1)*c.size);next.onclick=()=>c.choose((c.page+1)*c.size);
    c.release=()=>{c.observer?.disconnect();items.forEach(it=>{if(it.artMark?.parentNode)it.artMark.replaceWith(it.picture);it.controls.forEach(b=>{b.classList.remove('compact-action');b.removeAttribute('data-compact-action-label');if(it.aria.get(b)==null)b.removeAttribute('aria-label');else b.setAttribute('aria-label',it.aria.get(b));});it.paths.forEach(n=>n.classList.remove('compact-action-path'));it.original.classList.remove('compact-original');it.wrap.replaceWith(it.original);});groupNodes.forEach(n=>n.classList.remove('compact-grid-source'));children.forEach(n=>node.insertBefore(n,grid));grid.remove();pager.remove();operationSpace?.remove();['--compact-list-columns','--compact-list-height','--compact-operation-top'].forEach(p=>node.style.removeProperty(p));node.classList.remove('compact-catalog','compact-sam-list');controllers.delete(c);};
    controllers.add(c);c.apply();if(typeof ResizeObserver==='function'){c.observer=new ResizeObserver(()=>c.apply());c.observer.observe(opts.list?node:grid);}return c;
  }
  function release(scope,remember=true){if(!scope)return;if(sheet&&scope.contains(sheet.scope))closeSheet(false);if(remember)rememberFocus(scope);else focusAfter.delete(scope.id);[...controllers].filter(c=>scope.contains(c.root)).forEach(c=>c.release());
    for(const [s,d] of [...decorations])if(scope.contains(s)){d.moves.reverse().forEach(m=>{if(m.mark.parentNode)m.mark.replaceWith(m.n);m.n.hidden=m.hidden;m.n.onclick=m.onclick;});d.cleanup.forEach(f=>f());d.suppressed.forEach(n=>n.classList.remove('compact-suppressed'));d.nodes.forEach(n=>n.remove());s.classList.remove('compact-window','compact-pet-shop','compact-location-shop','compact-store','compact-vehicle-shop','compact-inventory','compact-service');d.panel?.classList.remove('compact-panel');decorations.delete(s);}
  }
  function frame(scope,panel,money,nodes){const d=decorate(scope);d.panel=panel;panel.classList.add('compact-panel');const heading=el('header','compact-window-heading'),title=panel.querySelector('h2'),close=scope.querySelector('[data-close]');panel.prepend(heading);d.nodes.push(heading);move(title,heading,d);if(title&&!title.id)title.id='compactTitle-'+scope.id;scope.setAttribute('role','dialog');scope.setAttribute('aria-modal','true');if(title)scope.setAttribute('aria-labelledby',title.id);
    const wallet=el('span','compact-wallet',Number(money||0).toLocaleString('ja-JP')+'円'),help=button('案内','info');help.dataset.compactGuide='';heading.append(wallet,help);move(close,heading,d);help.onclick=e=>{e.stopPropagation();guide(scope,'案内・使い方',help,nodes);};return d;}
  function sceneConversation(scope,scene,dialogue,d){if(!scene||!dialogue)return;const box=add(scene,el('div','compact-scene-dialogue'),d);move(dialogue,box,d);const actors=scene.querySelector('.shop-actors');if(actors){const fit=actors.getAttribute('preserveAspectRatio');actors.setAttribute('preserveAspectRatio','xMidYMid slice');d.cleanup.push(()=>actors.setAttribute('preserveAspectRatio',fit));}}
  function sam(scope,ctx){release(scope);scope.classList.add('compact-store');const panel=scope.querySelector('.shop-panel'),d=frame(scope,panel,ctx.money,()=>[...scope.querySelectorAll('#shopDialogue,#samWeatherHint,#samStoryLine,#samStoryOffer,.rival-shop-actions,#tournamentOffer,#practiceOffer,.sam-window-note')]);
    sceneConversation(scope,scope.querySelector('.shop-interior'),panel.querySelector('#shopDialogue'),d);
    ['.shop-brand','#samWeatherHint','#samStoryLine','#samStoryOffer','.rival-shop-actions','#tournamentOffer','#practiceOffer','.shop-tabs','#samTackleCategories','#samGoodsCategories'].forEach(q=>suppress(panel.querySelector(q),d));
    const nav=el('nav','compact-kind-nav');nav.setAttribute('aria-label','サムの売り場');d.nodes.push(nav);panel.querySelector('.compact-window-heading').after(nav);
    for(const [tab,entries] of Object.entries(ctx.categories))for(const entry of entries){const holder=scope.querySelector(tab==='tackle'?'#samTackleCategories':'#samGoodsCategories'),b=holder.querySelector('[data-sam-category="'+entry.id+'"]');move(b,nav,d);b.dataset.compactSamTab=tab;d.cleanup.push(()=>b.removeAttribute('data-compact-sam-tab'));b.setAttribute('aria-pressed',String(ctx.tab===tab&&ctx.selected[tab]===entry.id));b.onclick=()=>ctx.select(tab,entry.id);}
    const parking=add(panel,el('div','compact-quantity-parking'),d),quantity=panel.querySelector('.bait-quantity-picker');parking.hidden=true;move(quantity,parking,d);
    panel.querySelectorAll('[data-sam-category-panel]').forEach(n=>catalog(n,{selector:'.shop-goods > button',key:'sam:'+n.id,art:ctx.art,list:true,quantity:n.dataset.samCategoryPanel==='bait'?quantity:null,describe:ctx.describe}));samCategory(scope,ctx.tab,ctx.selected[ctx.tab]);restoreFocus(scope);
  }
  function samCategory(scope,tab,id){if(!scope.classList.contains('compact-window'))return;scope.querySelectorAll('[data-compact-sam-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.compactSamTab===tab&&b.dataset.samCategory===id)));[...controllers].find(c=>scope.contains(c.root)&&c.root.dataset.samCategoryPanel===id)?.announce();}
  function location(scope,ctx){release(scope);if(!ctx.enabled)return;scope.classList.add('compact-location-shop');const panel=scope.querySelector('.location-panel'),d=frame(scope,panel,ctx.money,()=>[...scope.querySelectorAll('#locationDialogue,#locationNote,.cooking-kitchen-status,.sam-window-note')]);
    ['.location-brand','#locationNote','.cooking-kitchen-status'].forEach(q=>suppress(panel.querySelector(q),d));const stock=scope.querySelector('#locationGoods');
    if(stock.hidden){scope.classList.add('compact-service');const hero=add(panel,el('div','compact-service-card'),d);move(panel.querySelector('#locationDialogue'),hero,d);}else sceneConversation(scope,scope.querySelector('.location-visual'),panel.querySelector('#locationDialogue'),d);
    const dock=add(panel,el('footer','compact-quantity-dock'),d);move(stock.querySelector('.quantity-picker'),dock,d);move(panel.querySelector('#locationAction'),dock,d);dock.hidden=!dock.querySelector('.quantity-picker')&&scope.querySelector('#locationAction')?.hidden;
    stock.querySelectorAll('[data-location-category-panel]').forEach(n=>catalog(n,{selector:'button.location-good',key:'location:'+ctx.id+':'+n.id}));restoreFocus(scope);
  }
  function vehicle(scope,ctx){release(scope);scope.classList.add('compact-vehicle-shop');const panel=scope.querySelector('.vehicle-shop-shell'),d=frame(scope,panel,ctx.money,()=>[panel.querySelector('#vehicleShopDialogue')]);suppress(panel.querySelector('.shop-brand'),d);
    const stock=panel.querySelector('.shop-goods');catalog(stock,{selector:'button[data-buy-vehicle]',key:'vehicles',art:ctx.art,stock:n=>ctx.owned().includes(n.dataset.buyVehicle)?'購入済み':'未購入',action:n=>ctx.owned().includes(n.dataset.buyVehicle)?ctx.equipped?.()===n.dataset.buyVehicle?'装備中':'装備する':null});restoreFocus(scope);
  }
  function groupBrowser(scope,panel,entries,id,art){const d=decorations.get(scope),nav=add(panel,el('nav','compact-kind-nav'),d),body=add(panel,el('div','compact-group-body'),d);nav.setAttribute('aria-label','道具の種類');const current=groups.get(id)||entries[0]?.id;
    const choose=value=>{groups.set(id,value);body.querySelectorAll('[data-compact-group-panel]').forEach(n=>n.hidden=n.dataset.compactGroupPanel!==value);nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.compactGroup===value)));};
    entries.forEach(entry=>{const b=button(entry.label),section=el('section','compact-group-panel');b.dataset.compactGroup=entry.id;b.onclick=()=>choose(entry.id);section.dataset.compactGroupPanel=entry.id;nav.append(b);body.append(section);
      if(entry.node){move(entry.node,section,d);entry.node.classList.add('compact-source-group');d.cleanup.push(()=>entry.node.classList.remove('compact-source-group'));catalog(section,{selector:'button',key:id+':'+entry.id,art,description:entry.description});}else catalog(section,{cards:[],key:id+':'+entry.id,empty:entry.empty});
    });choose(entries.some(e=>e.id===current)?current:entries[0]?.id);
  }
  function inventory(scope,ctx){release(scope);scope.classList.add('compact-inventory');const shell=scope.querySelector('.inventory-shell'),d=frame(scope,shell,ctx.money,()=>[scope.querySelector('.compact-equipment-summary'),scope.querySelector('#inventoryTackleSummary'),scope.querySelector('#inventoryCategoryHint'),scope.querySelector('.inventory-footer'),...scope.querySelectorAll('.equipment-row small,.duel-options > p,.duel-options > small')]);
    suppress(scope.querySelector('.inventory-heading'),d);suppress(scope.querySelector('.inventory-footer'),d);suppress(scope.querySelector('.item-category-summary'),d);const head=scope.querySelector('.compact-window-heading');move(scope.querySelector('.inventory-vitals'),head,d);move(scope.querySelector('.inventory-items-toolbar .pet-tank-link'),head,d);suppress(scope.querySelector('.inventory-items-toolbar'),d);
    scope.querySelectorAll('[data-inventory-category-panel]').forEach(n=>catalog(n,{selector:'.inventory-card',key:'bag:'+n.id}));
    const equip=scope.querySelector('[data-inventory-panel="equipment"]'),summary=add(equip,el('div','compact-equipment-summary'),d);suppress(equip.querySelector('h3'),d);suppress(equip.querySelector('.equipment-list'),d);
    [['釣り竿','.equipment-rod-current'],['手装備','#equipmentHands'],['乗り物','#equipmentVehicle'],['相棒','#equipmentDog']].forEach(([label,q])=>{const cell=el('div','');cell.append(el('small','',label));summary.append(cell);move(scope.querySelector(q),cell,d);});
    groupBrowser(scope,equip,[{id:'hands',label:'手装備',node:scope.querySelector('#handEquipmentOptions')},{id:'vehicles',label:'乗り物',node:scope.querySelector('#vehicleEquipmentOptions')}],'equipment',ctx.art);
    const tackle=scope.querySelector('[data-inventory-panel="tackle"]'),duel=scope.querySelector('#inventoryTackleSummary').nextElementSibling,roles=[...duel.querySelectorAll('[role="group"]')];suppress(tackle.querySelector('.inventory-tackle-grid'),d);suppress(duel,d);
    groupBrowser(scope,tackle,[{id:'bait',label:'餌',node:scope.querySelector('#inventoryBaitOptions')},{id:'hook',label:'ハリ',node:scope.querySelector('#inventoryHookOptions')},{id:'rod',label:'釣り竿',node:scope.querySelector('#inventoryRodOptions')},{id:'method',label:'釣り方',node:roles[1],description:()=>clean(duel.querySelector('small'))},{id:'fight',label:'ファイト',node:roles[0],description:()=>clean(duel.querySelector('p'))},{id:'copies',label:'重ね・売却',node:duel.querySelector('.rod-duplicates'),empty:'重なった星見の竿はここで保管・売却・強化を選べるよ。'}],'tackle',ctx.art);restoreFocus(scope);
  }
  function pet(scope,ctx){release(scope);if(!ctx.enabled)return;const d=decorate(scope);scope.classList.add('compact-pet-shop');const content=scope.querySelector('.pet-content'),host=content.querySelector('.pet-shop-host');if(!host)return;
    const help=button('案内','info');help.dataset.compactGuide='';add(host,help,d);help.onclick=e=>{e.stopPropagation();guide(scope,'アスアルのお店の案内',help,()=>[...content.querySelectorAll('.pet-note,.pet-asual-comment,.pet-legend-pools,.pet-supplies > p,.pet-contest-result,.pet-buyback-steps')]);};
    content.querySelectorAll('.pet-note,.pet-asual-comment,.pet-legend-pools').forEach(n=>suppress(n,d));
    move(content.querySelector('.pet-tank-picker'),host,d);move(content.querySelector('.pet-buyback-heading'),host,d);suppress(content.querySelector('.pet-buyback-steps'),d);
    content.querySelectorAll('.pet-stock').forEach((n,i)=>catalog(n,{selector:':scope > article',key:'pet:'+ctx.tab+':'+i,onLayout:ctx.onLayout}));
    const supplies=content.querySelector('.pet-supplies');if(supplies)catalog(supplies,{selector:'button',key:'pet:supplies',icon:'feed',name:n=>n.dataset.petAction?.startsWith('food-')?'魚のエサ · '+clean(n).split(' · ')[0]:clean(n),stock:n=>n.dataset.petAction?.startsWith('food-')?ctx.food+'食所持':''});
    content.querySelectorAll('.pet-buyback-tanks,.pet-buyback-fish').forEach(n=>catalog(n,{selector:':scope > button',key:n.classList.contains('pet-buyback-tanks')?'pet:buyback:tanks':'pet:buyback:fish:'+ctx.buybackTank,stock:n=>clean(n.querySelector(':scope > span')),onLayout:ctx.onLayout}));
    const registration=content.querySelector('.pet-contest-selectors');if(registration){content.querySelectorAll(':scope > p,:scope > .pet-contest-result').forEach(n=>suppress(n,d));}
    restoreFocus(scope);
  }
  function refresh(money){document.querySelectorAll('.compact-window.open .compact-wallet').forEach(n=>n.textContent=Number(money||0).toLocaleString('ja-JP')+'円');controllers.forEach(c=>{if(c.root.closest('.compact-window.open'))c.update();});}
  function toast(scope,message){if(!scope?.classList.contains('compact-window')||!scope.classList.contains('open'))return;if(scope.querySelector('.compact-scene-dialogue'))return;scope.querySelector('.compact-toast')?.remove();const n=el('p','compact-toast',String(message).replace(/[「」]/g,''));n.setAttribute('role','status');scope.append(n);setTimeout(()=>n.remove(),4500);}
  root.ShuCompactUI=Object.freeze({catalog,release,closeSheet,hasSheet:()=>!!sheet,sam,samCategory,location,vehicle,inventory,pet,refresh,toast});
})(typeof window==='undefined'?globalThis:window);
