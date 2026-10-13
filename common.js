const enc=encodeURIComponent;
const mapUrl=q=>"https://map.naver.com/p/search/"+enc(q);
const imgUrl=q=>"https://search.naver.com/search.naver?where=image&query="+enc(q);
const blogUrl=q=>"https://search.naver.com/search.naver?where=blog&query="+enc(q+" 후기");
const GRAD=["#2bb3c0,#0b6fb8","#f6a35c,#e8590c","#7ad07a,#2f9e44","#b197fc,#6741d9","#ff8787,#e03131"];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const btns=q=>`<div class="btns"><a class="b map" target="_blank" rel="noopener" href="${mapUrl(q)}">📍 네이버지도</a><a class="b" target="_blank" rel="noopener" href="${imgUrl(q)}">🖼️ 이미지</a><a class="b" target="_blank" rel="noopener" href="${blogUrl(q)}">📝 후기</a></div>`;
const LIST={spot:SPOT,food:FOOD};
const detailUrl=(t,i)=>`detail.html?t=${t}&i=${i}`;

// 사진/소개: 위키백과 → 위키미디어 커먼즈 순으로 검색, localStorage 캐시
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw 0;return r.json();}
async function fetchInfo(wiki,commons){
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

// 내 일정 (localStorage). 형식은 PLAN과 동일: [요일,시간,일정,지역,메모,지도검색어,상세참조]
const PKEY="bupa.plan.v1",DAYS=["월","화","수","목"];
function loadPlan(){try{const a=JSON.parse(localStorage.getItem(PKEY));if(Array.isArray(a))return a;}catch(e){}return PLAN.map(r=>r.slice());}
function savePlan(a){try{localStorage.setItem(PKEY,JSON.stringify(a));return true;}catch(e){return false;}}
function isCustom(){try{return !!localStorage.getItem(PKEY);}catch(e){return false;}}
function resetPlan(){try{localStorage.removeItem(PKEY);}catch(e){}}
