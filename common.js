const enc=encodeURIComponent;
const mapUrl=q=>"https://map.naver.com/p/search/"+enc(q);
const imgUrl=q=>"https://search.naver.com/search.naver?where=image&query="+enc(q);
const blogUrl=q=>"https://search.naver.com/search.naver?where=blog&query="+enc(q+" 후기");
const GRAD=["#2bb3c0,#0b6fb8","#f6a35c,#e8590c","#7ad07a,#2f9e44","#b197fc,#6741d9","#ff8787,#e03131"];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const btns=q=>`<div class="btns"><a class="b map" target="_blank" rel="noopener" href="${mapUrl(q)}">📍 네이버지도</a><a class="b" target="_blank" rel="noopener" href="${imgUrl(q)}">🖼️ 이미지</a><a class="b" target="_blank" rel="noopener" href="${blogUrl(q)}">📝 후기</a></div>`;
// ---- 데이터 저장소: data/*.json (GitHub 저장소 파일) ----
// 읽기: 토큰이 있으면 GitHub API(항상 최신), 없으면 배포된 JSON. 쓰기: 토큰으로 해당 파일만 덮어쓰기.
const REPO={owner:"Jung-JongWoo",repo:"bu_pa_vaca",branch:"main"};
const FILES={plan:"data/plan.json",custom:"data/custom.json"};
const LS={tok:"bupa.token",plan:"bupa.plan.v1",custom:"bupa.custom.v1",dirty:k=>"bupa.dirty."+k};
const BASE={spot:SPOT.length,food:FOOD.length};
let CUSTOM={spot:[],food:[]},PLAN_STATE=null;const SHA={};
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
const lsDel=k=>{try{localStorage.removeItem(k);}catch(e){}};
const getToken=()=>lsGet(LS.tok)||"";
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/\s/g,""))));
const b64e=s=>btoa(unescape(encodeURIComponent(s)));
const apiUrl=k=>`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${FILES[k]}`;
async function readRemote(k){
 const t=getToken();
 if(t){try{
  const r=await fetch(apiUrl(k)+"?ref="+REPO.branch+"&t="+Date.now(),{headers:{Authorization:"Bearer "+t,Accept:"application/vnd.github+json"},cache:"no-store"});
  if(r.ok){const j=await r.json();SHA[k]=j.sha;return JSON.parse(b64d(j.content));}
  if(r.status===404)SHA[k]=null;
 }catch(e){}}
 try{const r=await fetch(FILES[k]+"?v="+Date.now(),{cache:"no-store"});if(r.ok)return await r.json();}catch(e){}
 return null;
}
// 저장 안 된 수정(draft)이 있으면 그것을, 없으면 원격 JSON을, 그것도 없으면 기본값을 사용
const READY=(async()=>{
 for(const k of ["plan","custom"]){
  let v=null;
  if(lsGet(LS.dirty(k))){try{v=JSON.parse(lsGet(LS[k]));}catch(e){}}
  if(!v)v=await readRemote(k);
  if(k==="plan")PLAN_STATE=Array.isArray(v)?v:PLAN.map(r=>r.slice());
  else if(v&&Array.isArray(v.spot)&&Array.isArray(v.food))CUSTOM=v;
 }
 SPOT.push(...CUSTOM.spot);FOOD.push(...CUSTOM.food);
})();
function saveCustom(){lsSet(LS.custom,JSON.stringify(CUSTOM));return lsSet(LS.dirty("custom"),"1");}
async function pushAll(){
 const t=getToken();if(!t)return{ok:false,msg:"먼저 🔑 토큰을 입력하세요."};
 const H={Authorization:"Bearer "+t,Accept:"application/vnd.github+json"};
 for(const k of ["plan","custom"]){
  if(!lsGet(LS.dirty(k)))continue;
  try{
   if(SHA[k]===undefined){const r=await fetch(apiUrl(k)+"?ref="+REPO.branch,{headers:H,cache:"no-store"});SHA[k]=r.ok?(await r.json()).sha:null;}
   const body={message:"일정 수정: "+FILES[k],content:b64e(JSON.stringify(k==="plan"?PLAN_STATE:CUSTOM,null,1)),branch:REPO.branch};
   if(SHA[k])body.sha=SHA[k];
   const r=await fetch(apiUrl(k),{method:"PUT",headers:{...H,"Content-Type":"application/json"},body:JSON.stringify(body)});
   if(r.status===401||r.status===403||r.status===404)return{ok:false,msg:"토큰 권한 오류("+r.status+"). 이 저장소의 Contents 쓰기 권한을 확인하세요."};
   if(r.status===409||r.status===422){SHA[k]=undefined;return{ok:false,msg:"다른 곳에서 먼저 바뀌었어요. 💾 저장을 다시 누르면 지금 내용으로 덮어써요."};}
   if(!r.ok)return{ok:false,msg:"저장 실패("+r.status+")"};
   SHA[k]=(await r.json()).content.sha;lsDel(LS.dirty(k));lsDel(LS[k]);
  }catch(e){return{ok:false,msg:"네트워크 오류로 저장하지 못했어요."};}
 }
 return{ok:true,msg:"✔ 저장 완료! 다른 기기에는 1~2분 뒤 반영돼요."};
}
const LIST={spot:SPOT,food:FOOD};
const detailUrl=(t,i)=>`detail.html?t=${t}&i=${i}`;

// 사진/소개: 위키백과 → 위키미디어 커먼즈 순으로 검색, localStorage 캐시
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw 0;return r.json();}
async function fetchInfo(wiki,commons){
 if(!wiki&&!commons)return null;
 const key="pv1:"+wiki+"|"+commons;
 try{const c=localStorage.getItem(key);if(c)return JSON.parse(c);}catch(e){}
 let info=null;
 if(wiki)try{
  const j=await getJSON("https://ko.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=900&exintro=1&explaintext=1&exchars=400&gsrsearch="+enc(wiki));
  const ps=Object.values(j.query?.pages||{}).sort((a,b)=>a.index-b.index);
  const p=ps.find(x=>x.thumbnail);
  if(p)info={img:p.thumbnail.source,title:p.title,text:p.extract||"",src:"위키백과 · "+p.title,url:"https://ko.wikipedia.org/wiki/"+enc(p.title)};
 }catch(e){}
 if(!info){
  try{
   const j=await getJSON("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=900&gsrsearch="+enc(commons));
   const ps=Object.values(j.query?.pages||{}).sort((a,b)=>a.index-b.index).filter(x=>/jpe?g|png/.test(x.imageinfo?.[0]?.mime||""));
   if(ps[0])info={img:ps[0].imageinfo[0].thumburl,text:"",src:"위키미디어 커먼즈",url:ps[0].imageinfo[0].descriptionurl};
  }catch(e){}
 }
 if(info)try{localStorage.setItem(key,JSON.stringify(info));}catch(e){}
 return info;
}
const wikiOf=(t,r)=>t==="spot"?[r[6],r[7]]:[r[7],r[8]];

// 일정: [요일,시간,일정,지역,메모,지도검색어,상세참조] — READY 이후 사용
const DAYS=["월","화","수","목"];
const loadPlan=()=>PLAN_STATE;
function savePlan(a){PLAN_STATE=a;lsSet(LS.plan,JSON.stringify(a));return lsSet(LS.dirty("plan"),"1");}
const isDirty=()=>!!(lsGet(LS.dirty("plan"))||lsGet(LS.dirty("custom")));
function resetPlan(){savePlan(PLAN.map(r=>r.slice()));}

// ---- 최종 일정 내보내기/불러오기 (JSON 파일) ----
function exportData(){
 const d=new Date(),pad=n=>String(n).padStart(2,"0");
 const data={app:"bu_pa_vaca",version:1,exportedAt:d.toISOString(),plan:PLAN_STATE,custom:CUSTOM};
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));
 a.download=`부산여행_일정_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.json`;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
// 형식 검증 후 이 기기에 임시 저장(= 화면에 반영). 공유 저장은 planner의 💾 저장으로.
async function importData(file){
 let j;
 try{j=JSON.parse(await file.text());}catch(e){return{ok:false,msg:"JSON 파일이 아니에요."};}
 if(!j||j.app!=="bu_pa_vaca"||!Array.isArray(j.plan))return{ok:false,msg:"이 사이트에서 내보낸 일정 파일이 아니에요."};
 const c=j.custom&&Array.isArray(j.custom.spot)&&Array.isArray(j.custom.food)?j.custom:{spot:[],food:[]};
 const okSpot=c.spot.every(r=>Array.isArray(r)&&r.length>=8),okFood=c.food.every(r=>Array.isArray(r)&&r.length>=9);
 if(!okSpot||!okFood)return{ok:false,msg:"내 명소/맛집 데이터 형식이 올바르지 않아요."};
 const n={spot:BASE.spot+c.spot.length,food:BASE.food+c.food.length};
 const plan=[];
 for(const r of j.plan){
  if(!Array.isArray(r)||!DAYS.includes(r[0]))return{ok:false,msg:"일정 데이터 형식이 올바르지 않아요."};
  const x=[0,1,2,3,4,5,6].map(k=>typeof r[k]==="string"?r[k]:"");
  const m=x[6].match(/^(spot|food):(\d+)$/);
  if(x[6]&&(!m||+m[2]>=n[m[1]]))x[6]="";
  plan.push(x);
 }
 savePlan(plan);CUSTOM=c;saveCustom();
 return{ok:true,msg:`일정 ${plan.length}개, 내 장소 ${c.spot.length+c.food.length}개를 불러왔어요.`};
}
function pickAndImport(){
 const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
 i.onchange=async()=>{
  const f=i.files[0];if(!f)return;
  if(!confirm("지금 일정을 불러온 파일 내용으로 바꿀까요?"))return;
  const r=await importData(f);alert(r.msg);if(r.ok)location.reload();
 };
 i.click();
}
