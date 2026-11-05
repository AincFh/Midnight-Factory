import {STEPS,COPY,guideStep,normalizeLang,clampStep} from './atlas-guide-data.mjs';
const by=id=>document.getElementById(id);
const frame=by('factory'),panel=by('guide-panel'),toggle=by('guide-toggle');
let lang='zh',index=0,ready=false;
try{lang=normalizeLang(localStorage.getItem('atlas-mf-language')||'zh');index=clampStep(Number(localStorage.getItem('atlas-mf-step'))||0)}catch{}
function remember(){try{localStorage.setItem('atlas-mf-language',lang);localStorage.setItem('atlas-mf-step',String(index))}catch{}}
function toast(message){const el=by('guide-toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2600)}
function translate(){
 const c=COPY[lang],s=guideStep(index,lang);
 document.documentElement.lang=lang==='zh'?'zh-CN':'en';
 toggle.innerHTML='';toggle.append(document.createTextNode(c.brand+' '));const mark=document.createElement('span');mark.textContent='✦';toggle.append(mark);
 by('guide-series').textContent=c.series;by('guide-title').textContent=c.subtitle;by('step-number').textContent=String(index+1).padStart(2,'0')+' / '+String(STEPS.length).padStart(2,'0');
 by('guide-icon').textContent=s.symbol;by('step-title').textContent=s.title;by('step-description').textContent=s.body;by('step-hint').textContent=s.hint;
 by('previous').textContent=c.prev;by('next').textContent=index===STEPS.length-1?c.finish:c.next;by('locate').textContent=c.locate;by('guide-close').setAttribute('aria-label',c.close);by('guide-credit').textContent=c.credit;
 by('previous').disabled=index===0;by('step-dots').replaceChildren(...STEPS.map((_,j)=>{const span=document.createElement('span');span.className=j===index?'active':j<index?'complete':'';return span}));
 remember();
}
function show(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));try{if(open)localStorage.setItem('atlas-mf-seen','1')}catch{}if(open)translate();}
by('locale').onclick=()=>{lang=lang==='zh'?'en':'zh';translate()};
toggle.onclick=()=>show(panel.hidden);
by('guide-close').onclick=()=>show(false);
by('previous').onclick=()=>{index=clampStep(index-1);translate()};
by('next').onclick=()=>{if(index===STEPS.length-1){show(false);toast(COPY[lang].done);return}index++;translate()};
by('locate').onclick=()=>{
 const selector=STEPS[index].target;
 let el;try{el=frame.contentDocument?.querySelector(selector)}catch{}
 if(!el){toast(COPY[lang].notFound);return}
 try{
  const parent=frame.contentDocument;
  if(!parent.getElementById('atlas-mf-highlight')){
   const style=parent.createElement('style');style.id='atlas-mf-highlight';style.textContent='.atlas-mf-active{outline:3px solid #f6d287!important;outline-offset:3px!important;filter:drop-shadow(0 0 9px #f2ce86);z-index:9999!important}';parent.head.append(style);
  }
  el.classList.add('atlas-mf-active');el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  setTimeout(()=>el.classList.remove('atlas-mf-active'),3500);
  toast(COPY[lang].located);
 }catch{toast(COPY[lang].notFound)}
};
frame.addEventListener('load',()=>{ready=true;frame.title='Gakuseei / Midnight Factory';});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false)});
translate();
try{if(localStorage.getItem('atlas-mf-seen')!=='1')show(true)}catch{show(true)}
window.ATLAS_FACTORY_GUIDE={getState:()=>({lang,index,open:!panel.hidden,ready}),next:()=>by('next').click(),toggle:()=>toggle.click()};
