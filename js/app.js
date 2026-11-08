function st(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}

/* navigation */
var V=["domu","akce","les","texty","foto","odkazy"];
var curSlug=null,pendingJump=null,docCache={};
function show(){
  var h=(location.hash||"").slice(1),tab=h;
  var isDoc=h.indexOf("txt-")===0;
  if(isDoc&&ALIAS[h.slice(4)]){location.replace("#txt-"+ALIAS[h.slice(4)]);return}
  if(isDoc){curSlug=h.slice(4);if(!HAS[curSlug]){isDoc=false;h="texty";tab="texty"}else tab=FOTOS.indexOf(curSlug)>=0?"foto":"texty"}
  else if(V.indexOf(h)<0){h="domu";tab="domu"}
  V.forEach(function(v){document.getElementById("v-"+v).hidden=(isDoc||v!==h)});
  document.getElementById("v-cten").hidden=!isDoc;
  document.querySelectorAll("nav a").forEach(function(a){
    if(a.getAttribute("href")==="#"+tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(isDoc)openDoc(curSlug);else window.scrollTo(0,0);
}
window.addEventListener("hashchange",show);

/* text size */
var size=parseFloat(st("pd-size"))||1.0625;
function applySize(){document.documentElement.style.setProperty("--base",size+"rem");st("pd-size",String(size))}
document.getElementById("bigger").onclick=function(){size=Math.min(1.5,size+.0625);applySize()};
document.getElementById("smaller").onclick=function(){size=Math.max(.9375,size-.0625);applySize()};
applySize();


/* texts */
function slugOf(f){return f.replace(/\.[^.]+$/,"").toLowerCase()}
function titleOf(slug){
  if(SUB[slug])return SUB[slug];
  for(var i=0;i<T.length;i++)if(slugOf(T[i][2])===slug)return T[i][1];
  return slug;
}
var read={};try{read=JSON.parse(st("pd-read")||"{}")||{}}catch(e){read={}}
var grp=-1,sidx=null,sidxLoading=false;
var chips=document.getElementById("chips");
function chip(label,g){
  var b=document.createElement("button");b.type="button";b.className="chip";b.textContent=label;
  b.setAttribute("aria-pressed",String(g===grp));
  b.onclick=function(){grp=g;renderChips();renderList()};
  return b;
}
function renderChips(){
  chips.innerHTML="";chips.appendChild(chip("Vše",-1));
  G.forEach(function(n,i){chips.appendChild(chip(n,i))});
}
function loadIdx(){
  if(sidx||sidxLoading)return;sidxLoading=true;
  fetch("texts/_search.json").then(function(r){return r.json()}).then(function(j){sidx=j;sidxLoading=false;renderList()}).catch(function(){sidxLoading=false});
}
function norm2(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function hrefFor(t){
  var sl=slugOf(t[2]);
  if(HAS[sl])return {h:"#txt-"+sl,ext:false};
  if(/\.pdf$/i.test(t[2]))return {h:t[2],ext:true};
  return {h:B+t[2],ext:true};
}
function rowHtml(title,file,h,ext,tag,hit){
  var r=!!read[file];
  return '<li class="row'+(r?" read":"")+'"><a href="'+esc(h)+'"'+(ext?' target="_blank" rel="noopener"':'')+'><span class="t">'+esc(title)+'</span>'
    +(tag?'<span class="tag">'+esc(tag)+'</span>':'')+(hit?'<span class="hit">shoda v textu</span>':'')+'</a>'
    +'<button type="button" class="mark" data-k="'+esc(file)+'" aria-pressed="'+r+'" aria-label="Označit jako přečtené: '+esc(title)+'">✓</button></li>';
}
function renderList(){
  var qraw=document.getElementById("q").value.trim(),q=norm2(qraw);
  if(q.length>=3)loadIdx();
  var out="",n=0,total=T.length,last=-2;
  T.forEach(function(t){
    if(grp>=0&&t[0]!==grp)return;
    var sl=slugOf(t[2]),inTitle=!q||norm2(t[1]).indexOf(q)>=0,inText=!!(q&&sidx&&sidx[sl]&&sidx[sl].indexOf(q)>=0);
    if(!inTitle&&!inText)return;
    if(t[0]!==last){if(last!==-2)out+="</ul>";out+='<h2 class="grp">'+esc(G[t[0]])+'</h2><ul class="plain">';last=t[0]}
    var l=hrefFor(t);
    out+=rowHtml(t[1],t[2],l.h,l.ext,t[3],q&&!inTitle&&inText);n++;
  });
  if(last!==-2)out+="</ul>";
  if(q&&grp<0&&sidx){
    var more="";
    Object.keys(SUB).forEach(function(sl){
      if(FOTOS.indexOf(sl)>=0)return;
      var inTitle=norm2(SUB[sl]).indexOf(q)>=0,inText=sidx[sl]&&sidx[sl].indexOf(q)>=0;
      if(inTitle||inText){more+=rowHtml(SUB[sl],FILEOF[sl],"#txt-"+sl,false,"",!inTitle&&inText);n++}
    });
    if(more)out+='<h2 class="grp">Další části</h2><ul class="plain">'+more+'</ul>';
  }
  document.getElementById("list").innerHTML=out||'<p class="empty">Nic nenalezeno. Zkuste jiné slovo.</p>';
  document.getElementById("count").textContent=n+(q?" nalezeno":" z "+total+" textů")+((q&&!sidx&&q.length>=3)?" · prohledávám celé texty…":"");
}
document.getElementById("list").addEventListener("click",function(e){
  var b=e.target.closest(".mark");if(!b)return;
  var k=b.getAttribute("data-k");if(read[k])delete read[k];else read[k]=1;
  st("pd-read",JSON.stringify(read));
  var y=window.scrollY;renderList();window.scrollTo(0,y);
});
document.getElementById("q").addEventListener("input",renderList);

/* reader */
function mainOrder(){var a=[];T.forEach(function(t){var sl=slugOf(t[2]);if(HAS[sl])a.push(sl)});return a}
function setMark(){
  var f=FILEOF[curSlug],b=document.getElementById("rmark");
  b.setAttribute("aria-pressed",String(!!read[f]));b.textContent=read[f]?"✓ Přečteno":"Označit jako přečtené";
}
function openDoc(slug){
  var d=document.getElementById("doc"),isFoto=FOTOS.indexOf(slug)>=0;
  document.title=titleOf(slug)+" · Přátelé Dhammy";
  var back=document.getElementById("rback");back.href=isFoto?"#foto":"#texty";back.textContent=isFoto?"‹ Zpět na fotogalerii":"‹ Zpět na texty";
  var ro=document.getElementById("rorig");ro.href=B+FILEOF[slug];ro.hidden=(slug==="dhammapada"||slug==="payutto-dny-a-noci"||slug==="pravidla1-2"||slug==="pravidla-buddhistickych-mnichu"||slug==="zasady"||slug==="tajemstvi"||slug==="sumedho-vdecnost-k-rodicum");
  var ord=mainOrder(),i=ord.indexOf(slug),pv=document.getElementById("rprev"),nx=document.getElementById("rnext");
  pv.hidden=i<=0;nx.hidden=(i<0||i>=ord.length-1);
  if(i>0){pv.href="#txt-"+ord[i-1];pv.title=titleOf(ord[i-1])}
  if(i>=0&&i<ord.length-1){nx.href="#txt-"+ord[i+1];nx.title=titleOf(ord[i+1])}
  setMark();
  function put(html){
    if(curSlug!==slug)return;
    d.innerHTML=html;applyMode();
    if(pendingJump){var el=document.getElementById(pendingJump);pendingJump=null;if(el){el.scrollIntoView();return}}
    window.scrollTo(0,0);
  }
  if(docCache[slug]){put(docCache[slug]);return}
  d.innerHTML='<p class="loading">Načítám text…</p>';
  fetch("texts/"+slug+".html").then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(h){docCache[slug]=h;put(h)})
   .catch(function(){
     if(curSlug!==slug)return;
     d.innerHTML=navigator.onLine===false
       ?'<p class="empty">Jste offline a tento text se ještě nestihl uložit do telefonu. Uloží se automaticky, až aplikaci spustíte s připojením k internetu.</p>'
       :'<p class="empty">Text se nepodařilo načíst. Otevřete ho na <a href="'+esc(B+FILEOF[slug])+'" target="_blank" rel="noopener">původním webu</a>.</p>'});
}
document.getElementById("rmark").onclick=function(){
  var f=FILEOF[curSlug];if(read[f])delete read[f];else read[f]=1;
  st("pd-read",JSON.stringify(read));setMark();renderList();
};
function applyMode(){
  var d=document.getElementById("doc"),m=st("pd-mode")||"both";
  d.setAttribute("data-mode",m);
  d.querySelectorAll("[data-mode]").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-mode")===m))});
}
document.getElementById("doc").addEventListener("click",function(e){
  var mb=e.target.closest("button[data-mode]");
  if(mb){st("pd-mode",mb.getAttribute("data-mode"));applyMode();return}
  var a=e.target.closest("a[data-jump]");if(!a)return;
  var id=a.getAttribute("data-jump"),h=a.getAttribute("href");
  if(h==="#"){e.preventDefault();var el=document.getElementById(id);if(el)el.scrollIntoView()}
  else pendingJump=id;
});

/* photos + links */
document.getElementById("fotolist").innerHTML=FOTOS.map(function(sl){
  return '<li class="row"><a href="#txt-'+sl+'"><span class="t">'+esc(SUB[sl])+'</span></a></li>'}).join("");
document.getElementById("fotoext").innerHTML=F.filter(function(f){return /WPN-Jan|WPP-Jan|tudong/.test(f[1])}).map(function(f){
  return '<li class="row"><a href="'+B+f[1]+'" target="_blank" rel="noopener"><span class="t">'+esc(f[0])+' ↗</span></a></li>'}).join("");
document.getElementById("linklist").innerHTML=L.map(function(l){
  return '<li class="row"><a href="'+esc(l[1])+'" target="_blank" rel="noopener"><span class="t">'+esc(l[0])+' ↗</span><span class="d">'+esc(l[2])+'</span></a></li>'}).join("");

renderChips();renderList();show();
/* Dhammapada verse of the day */
var vi=0;
function vShow(){document.getElementById("vtext").innerHTML="<b>"+(vi+1)+".</b> "+esc(DH[vi])}
(function(){
  var d=new Date(),day=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
  vi=(day*7+d.getFullYear())%DH.length;vShow();
  document.getElementById("vnext").onclick=function(){vi=(vi+1)%DH.length;vShow()};
  document.getElementById("vprev").onclick=function(){vi=(vi+DH.length-1)%DH.length;vShow()};
  document.getElementById("vrand").onclick=function(){vi=Math.floor(Math.random()*DH.length);vShow()};
})();

/* PWA: offline cache (service worker) + install prompt */
if("serviceWorker" in navigator&&location.protocol!=="file:"){
  window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
  /* download the whole library for offline reading */
  var off=document.getElementById("offline");
  navigator.serviceWorker.addEventListener("message",function(e){
    var m=e.data||{};if(m.type!=="precache-progress")return;
    if(m.done<m.total){off.hidden=false;off.textContent="Ukládám texty pro čtení offline… "+m.done+" / "+m.total}
    else if(m.failed&&navigator.onLine!==false){off.hidden=false;off.textContent="Uloženo "+(m.total-m.failed)+" z "+m.total+" textů pro čtení offline. Zbytek se uloží při příštím spuštění."}
    else if(m.failed){off.hidden=false;off.textContent="Část textů se uloží, až budete online."}
    else{off.hidden=false;off.textContent="✓ Všechny texty jsou uloženy pro čtení offline."}
  });
  navigator.serviceWorker.ready.then(function(reg){
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
    var urls=Object.keys(HAS).map(function(s){return "texts/"+s+".html"});urls.push("texts/_search.json");
    if(reg.active)reg.active.postMessage({type:"precache",urls:urls});
  });
}
(function(){
  var box=document.getElementById("install"),btn=document.getElementById("install-btn");
  var standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if(standalone||st("pd-install-hide"))return;
  var ua=navigator.userAgent,isIOS=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var deferred=null;
  if(isIOS){box.hidden=false;document.getElementById("install-ios").hidden=false}
  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();deferred=e;
    box.hidden=false;document.getElementById("install-android").hidden=false;btn.hidden=false;
  });
  btn.onclick=function(){
    if(!deferred)return;deferred.prompt();
    deferred.userChoice.then(function(){deferred=null;box.hidden=true});
  };
  window.addEventListener("appinstalled",function(){box.hidden=true});
  document.getElementById("install-close").onclick=function(){box.hidden=true;st("pd-install-hide","1")};
})();
