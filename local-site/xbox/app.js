'use strict';

const catalog=window.XBOX_GAME_PASS_DATA;
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>new Intl.NumberFormat('vi-VN').format(value);
const PERSONAL_KEY='jang-xbox-personal-v1';
const readPersonal=()=>{try{return JSON.parse(localStorage.getItem(PERSONAL_KEY))||{};}catch{return {};}};
const savedPersonal=readPersonal();
const favorites=new Set(savedPersonal.favorites||[]);
const savePersonal=()=>{try{localStorage.setItem(PERSONAL_KEY,JSON.stringify({favorites:[...favorites]}));}catch{}};

const genreLabels={
  'Action & adventure':'Hành động & phiêu lưu','Card & board':'Bài & bàn cờ',Classics:'Kinh điển','Family & kids':'Gia đình & trẻ em',Fighting:'Đối kháng','Multi-player Online Battle Arena':'Đấu trường trực tuyến',Music:'Âm nhạc',Other:'Khác',Platformer:'Đi cảnh', 'Puzzle & trivia':'Giải đố & đố vui','Racing & flying':'Đua xe & bay lượn','Role playing':'Nhập vai',Shooter:'Bắn súng',Simulation:'Mô phỏng',Sports:'Thể thao',Strategy:'Chiến thuật'
};
const featureLabels={
  SinglePlayer:'Một người chơi',XblOnlineMultiPlayer:'Nhiều người trực tuyến',OnlineMultiplayer:'Nhiều người trực tuyến',XblLocalMultiPlayer:'Nhiều người cùng máy',LocalMultiplayer:'Nhiều người cùng máy',SharedSplitScreen:'Chia đôi màn hình',XblOnlineCoop:'Co-op trực tuyến',CoopSupportOnline:'Co-op trực tuyến',XblLocalCoop:'Co-op cùng máy',CoopSupportLocal:'Co-op cùng máy',XblCrossPlatformMultiPlayer:'Chơi chéo nền tảng',XblCrossPlatformCoop:'Co-op chéo nền tảng',Capability4k:'4K Ultra HD',CapabilityHDR:'HDR',XPA:'Xbox Play Anywhere',PcGamePad:'Tay cầm PC','60fps':'60 FPS','120fps':'120 FPS',RayTracing:'Ray Tracing',CapabilityVRR:'Tần số quét biến thiên',DolbyAtmos:'Dolby Atmos',XboxLive:'Xbox Network'
};
const collections=[
  {id:'all',icon:'◈',label:'Tất cả PC Game Pass',test:()=>true},
  {id:'favorites',icon:'♥',label:'Game yêu thích',test:g=>favorites.has(g.id)},
  {id:'vietnamese',icon:'VI',label:'Ngôn ngữ tiếng Việt',test:g=>g.supportsVietnamese===true},
  {id:'viethoa',icon:'VH',label:'Có hỗ trợ Việt hóa',test:g=>g.hasVietnamesePatch===true},
  {id:'single',icon:'●',label:'Một người chơi',test:g=>hasAny(g,['SinglePlayer'])},
  {id:'online-coop',icon:'◎',label:'Co-op trực tuyến',test:g=>hasAny(g,['XblOnlineCoop','CoopSupportOnline','XblCrossPlatformCoop'])},
  {id:'local-coop',icon:'♧',label:'Co-op cùng máy',test:g=>hasAny(g,['XblLocalCoop','CoopSupportLocal','SharedSplitScreen'])},
  {id:'multiplayer',icon:'◉',label:'Multiplayer',test:g=>hasAny(g,['XblOnlineMultiPlayer','OnlineMultiplayer','XblLocalMultiPlayer','LocalMultiplayer'])},
  {id:'gamepad',icon:'🎮',label:'Hỗ trợ tay cầm PC',test:g=>hasAny(g,['PcGamePad'])},
  {id:'xpa',icon:'↔',label:'Xbox Play Anywhere',test:g=>hasAny(g,['XPA'])}
];
const featureFilters=[
  {id:'all',label:'Tất cả tính năng',test:()=>true},{id:'4k',label:'4K',test:g=>hasAny(g,['Capability4k'])},{id:'hdr',label:'HDR',test:g=>hasAny(g,['CapabilityHDR'])},{id:'60fps',label:'60 FPS',test:g=>hasAny(g,['60fps'])},{id:'120fps',label:'120 FPS',test:g=>hasAny(g,['120fps'])},{id:'crossplay',label:'Chơi chéo',test:g=>hasAny(g,['XblCrossPlatformMultiPlayer','CrossPlatformMultiPlayer'])},{id:'gamepad',label:'Tay cầm PC',test:g=>hasAny(g,['PcGamePad'])},{id:'raytracing',label:'Ray Tracing',test:g=>hasAny(g,['RayTracing'])}
];

let filtered=[];
let activeCollection='all';
let activeGenre='all';
let activeFeature='all';
let activeSort='newest';
let activeDetailVideos=[];
let activeHls=null;
let activeScreenshots=[];
let lightboxIndex=0;
let lightboxReturnFocus=null;

function hasAny(game,names){return names.some(name=>(game.features||[]).includes(name));}
function genreLabel(value){return genreLabels[value]||value;}
function safeImage(url){return /^https:\/\//i.test(url||'')?url:'';}
function safeLink(url){return /^https?:\/\//i.test(url||'')?url:'';}
function dateLabel(value){if(!value)return 'Chưa rõ ngày';const date=new Date(value);return Number.isNaN(date.valueOf())?'Chưa rõ ngày':date.toLocaleDateString('vi-VN',{year:'numeric',month:'short',day:'numeric'});}
function yearNumber(value){if(!value)return 'Chưa rõ năm';const year=new Date(value).getFullYear();return Number.isFinite(year)?String(year):'Chưa rõ năm';}
function platformBadges(game){
  const badges=['<span class="platform pc">PC</span>'];
  if(game.supportsVietnamese)badges.push('<span class="platform vietnamese">VI</span>');
  if(game.hasVietnamesePatch)badges.push('<span class="platform viethoa">VIỆT HÓA</span>');
  return badges.join('');
}
function xboxAppUrl(game){return `msxbox://game/?productId=${encodeURIComponent(game.id)}`;}

function initialize(){
  if(!catalog?.games?.length){$('#game-grid').innerHTML='<div class="empty">Không có dữ liệu Xbox Game Pass.</div>';return;}
  const meta=catalog.metadata;
  $('#total-games').textContent=number(meta.totalGames);
  $('#vietnamese-games').textContent=number(meta.vietnameseLanguageGames||0);
  $('#viethoa-games').textContent=number(meta.vietnamesePatchGames||0);
  $('#updated-at').textContent=`Cập nhật ${new Date(meta.updatedAt).toLocaleString('vi-VN')} · Microsoft Catalog (${meta.market})`;
  renderCollections();
  renderGenreChips();
  renderFeatureChips();
  $('#search').addEventListener('input',applyFilters);
  $('#collections').addEventListener('click',event=>{const button=event.target.closest('[data-collection]');if(!button)return;activeCollection=button.dataset.collection;renderCollections();applyFilters();});
  $('#genre-chips').addEventListener('click',event=>{const button=event.target.closest('[data-genre]');if(!button)return;activeGenre=button.dataset.genre;renderGenreChips();applyFilters();});
  $('#feature-chips').addEventListener('click',event=>{const button=event.target.closest('[data-feature]');if(!button)return;activeFeature=button.dataset.feature;renderFeatureChips();applyFilters();});
  $('#sort-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-sort]');if(!button)return;activeSort=button.dataset.sort;document.querySelectorAll('[data-sort]').forEach(item=>item.classList.toggle('active',item===button));applyFilters();});
  $('#active-filters').addEventListener('click',event=>{if(!event.target.closest('[data-reset-filters]'))return;activeCollection='all';activeGenre='all';activeFeature='all';$('#search').value='';renderCollections();renderGenreChips();renderFeatureChips();applyFilters();});
  $('#game-grid').addEventListener('click',event=>{const button=event.target.closest('[data-game]');if(button)openDetail(button.dataset.game);});
  $('#game-grid').addEventListener('click',event=>{const button=event.target.closest('[data-favorite]');if(button){event.stopPropagation();toggleFavorite(button.dataset.favorite);}});
  $('#detail').addEventListener('click',event=>{
    if(event.target.closest('[data-close]')||event.target===$('#detail')){closeDetail();return;}
    const favorite=event.target.closest('[data-detail-favorite]');if(favorite){toggleFavorite(favorite.dataset.detailFavorite,true);return;}
    const video=event.target.closest('[data-play-xbox-video]');if(video){playXboxVideo(Number(video.dataset.playXboxVideo));return;}
    const screenshot=event.target.closest('[data-view-xbox-shot]');if(screenshot){openLightbox(Number(screenshot.dataset.viewXboxShot),screenshot);return;}
    if(event.target.closest('[data-open-xbox-gallery]')){openLightbox(0,event.target.closest('[data-open-xbox-gallery]'));return;}
  });
  $('#xbox-lightbox').addEventListener('click',event=>{if(event.target.closest('[data-lightbox-close]')||event.target===$('#xbox-lightbox'))closeLightbox();else if(event.target.closest('#lightbox-prev'))previousLightboxImage();else if(event.target.closest('#lightbox-next'))nextLightboxImage();});
  $('#xbox-lightbox').addEventListener('cancel',event=>{event.preventDefault();closeLightbox();});
  document.addEventListener('keydown',event=>{
    if($('#xbox-lightbox').open){if(event.key==='Escape'||event.key==='Backspace'){event.preventDefault();closeLightbox();}else if(event.key==='ArrowLeft'||event.key.toLowerCase()==='a'){event.preventDefault();previousLightboxImage();}else if(event.key==='ArrowRight'||event.key.toLowerCase()==='d'){event.preventDefault();nextLightboxImage();}return;}
    if(event.key==='Escape'&&$('#detail').open)closeDetail();if(event.key==='/'&&document.activeElement!==$('#search')){event.preventDefault();$('#search').focus();}
  });
  document.addEventListener('xbox:gamepad-category',event=>{
    if($('#detail').open)return;
    const current=Math.max(0,collections.findIndex(item=>item.id===activeCollection));
    activeCollection=collections[(current+event.detail.direction+collections.length)%collections.length].id;
    renderCollections();applyFilters();
  });
  document.addEventListener('xbox:gamepad-reset',()=>{
    if($('#detail').open)return;
    activeCollection='all';activeGenre='all';activeFeature='all';$('#search').value='';
    renderCollections();renderGenreChips();renderFeatureChips();applyFilters();
  });
  document.addEventListener('xbox:gamepad-favorite',event=>toggleFavorite(event.detail.id,Boolean($('#detail').open)));
  applyFilters();
}

function renderCollections(){
  $('#collections').innerHTML=collections.map(item=>`<button class="collection ${item.id===activeCollection?'active':''}" data-collection="${item.id}"><span><i>${item.icon}</i>${item.label}</span><b>${number(catalog.games.filter(item.test).length)}</b></button>`).join('');
}
function toggleFavorite(id,reopen=false){
  if(favorites.has(id))favorites.delete(id);else favorites.add(id);
  savePersonal();renderCollections();applyFilters();
  if(reopen&&$('#detail').open)openDetail(id);
  else setTimeout(()=>document.dispatchEvent(new CustomEvent('xbox:focus-game',{detail:{id}})),0);
}
function renderGenreChips(){
  const genres=[...new Set(catalog.games.flatMap(game=>game.genres||[]))].sort((a,b)=>genreLabel(a).localeCompare(genreLabel(b),'vi'));
  $('#genre-chips').innerHTML=`<button class="chip ${activeGenre==='all'?'active':''}" data-genre="all">Tất cả <small>${number(catalog.games.length)}</small></button>`+genres.map(genre=>`<button class="chip ${activeGenre===genre?'active':''}" data-genre="${esc(genre)}">${esc(genreLabel(genre))} <small>${number(catalog.games.filter(game=>game.genres.includes(genre)).length)}</small></button>`).join('');
}
function renderFeatureChips(){
  $('#feature-chips').innerHTML=featureFilters.map(item=>`<button class="chip feature-chip ${item.id===activeFeature?'active':''}" data-feature="${item.id}">${item.label} <small>${number(catalog.games.filter(item.test).length)}</small></button>`).join('');
}

function applyFilters(){
  const query=$('#search').value.trim().toLocaleLowerCase('vi');
  const collection=collections.find(item=>item.id===activeCollection)||collections[0];
  const feature=featureFilters.find(item=>item.id===activeFeature)||featureFilters[0];
  filtered=catalog.games.filter(game=>{
    const translatedGenres=(game.genres||[]).map(genreLabel);
    const languageTerms=game.supportsVietnamese?['tiếng Việt','Vietnamese']:[];
    const patchTerms=game.hasVietnamesePatch?['Việt hóa',...(game.vietnamesePatches||[]).flatMap(item=>[item.source,item.name])]:[];
    const haystack=[game.name,game.developer,game.publisher,...(game.genres||[]),...translatedGenres,...languageTerms,...patchTerms].join(' ').toLocaleLowerCase('vi');
    return (!query||haystack.includes(query))&&collection.test(game)&&feature.test(game)&&(activeGenre==='all'||game.genres.includes(activeGenre));
  });
  filtered.sort((a,b)=>{if(activeSort==='newest')return(Date.parse(b.releaseDate)||0)-(Date.parse(a.releaseDate)||0);if(activeSort==='size-large'||activeSort==='size-small'){const as=Number(a.storageBytes)||0,bs=Number(b.storageBytes)||0;if(Boolean(as)!==Boolean(bs))return as?-1:1;if(as!==bs)return activeSort==='size-large'?bs-as:as-bs;}return(activeSort==='za'?-1:1)*a.name.localeCompare(b.name,'vi');});
  $('#result-title').textContent=collection.label;
  $('#result-count').textContent=`${number(filtered.length)} game`;
  const active=[];
  if(activeGenre!=='all')active.push(genreLabel(activeGenre));
  if(activeFeature!=='all')active.push(featureFilters.find(item=>item.id===activeFeature)?.label);
  if(query)active.push(`“${$('#search').value.trim()}”`);
  $('#active-filters').innerHTML=active.length?`<span>Đang lọc:</span>${active.map(value=>`<b>${esc(value)}</b>`).join('')}<button data-reset-filters>Xóa bộ lọc</button>`:'';
  render();
}

function render(){
  $('#game-grid').innerHTML=filtered.length?filtered.map(game=>`<article class="game-card"><button data-game="${esc(game.id)}"><div class="art"><img src="${esc(safeImage(game.imageUrl))}" alt="${esc(game.name)}" loading="lazy" decoding="async"><div class="badges">${platformBadges(game)}</div></div><div class="card-body"><div class="genre">${esc(genreLabel(game.genres?.[0]||'PC Game Pass'))}</div><h3>${esc(game.name)}</h3><p><span>${esc(game.publisher||game.developer||'Microsoft Store')}</span><b>${esc(yearNumber(game.releaseDate))} · ${esc(game.storageDisplay||'— GB')}</b></p></div></button><button class="favorite-button ${favorites.has(game.id)?'selected':''}" data-favorite="${esc(game.id)}" aria-label="${favorites.has(game.id)?'Bỏ khỏi':'Thêm vào'} game yêu thích">${favorites.has(game.id)?'♥':'♡'}</button></article>`).join(''):'<div class="empty">Không tìm thấy game phù hợp.</div>';
  document.querySelectorAll('.art img').forEach(image=>image.addEventListener('error',()=>{image.closest('.art')?.classList.add('no-image');image.remove();},{once:true}));
  document.dispatchEvent(new CustomEvent('xbox:navigation-updated'));
}

function openDetail(id){
  const game=catalog.games.find(item=>item.id===id);if(!game)return;
  const features=[...new Set((game.features||[]).map(item=>featureLabels[item]).filter(Boolean))].slice(0,12);
  const patches=game.vietnamesePatches||[];
  const languageStatus=game.supportsVietnamese?'Có tiếng Việt chính thức (Microsoft Store)':'Microsoft Store chưa ghi nhận tiếng Việt';
  const isFavorite=favorites.has(game.id);
  stopXboxVideo();
  const screenshots=(game.screenshots||[]).filter(item=>safeImage(item.url));activeScreenshots=screenshots;
  const videos=(game.trailers||[]).filter(item=>/^https:\/\//i.test(item.hlsUrl||''));activeDetailVideos=videos;
  const mediaHtml=`${screenshots.length?`<h3>Ảnh gameplay <small>${screenshots.length} ảnh</small></h3><button type="button" class="gallery-open-button" data-open-xbox-gallery>▣ XEM ẢNH (${screenshots.length})</button><div class="xbox-gallery">${screenshots.map((item,index)=>`<button type="button" data-view-xbox-shot="${index}" aria-label="Xem ảnh gameplay ${index+1} của ${esc(game.name)}"><img src="${esc(safeImage(item.url))}" alt="${esc(item.caption||`${game.name} — ảnh ${index+1}`)}" loading="lazy" decoding="async"><span>🔍 Phóng to</span></button>`).join('')}</div>`:''}${videos.length?`<h3>Trailer & clip <small>${videos.length} video</small></h3><div class="xbox-video-player" id="xbox-video-player"><p>Chọn một trailer để phát.</p></div><div class="xbox-video-list">${videos.map((item,index)=>`<button type="button" data-play-xbox-video="${index}"><img src="${esc(safeImage(item.previewImageUrl))}" alt="" loading="lazy"><span>▶ ${esc(item.title||`Trailer ${index+1}`)}</span></button>`).join('')}</div>`:''}`;
  $('#detail-inner').innerHTML=`<button class="close" data-close aria-label="Đóng">×</button><div class="detail-hero" style="background-image:linear-gradient(90deg,#101112 0%,rgba(16,17,18,.82) 45%,rgba(16,17,18,.15)),url('${esc(safeImage(game.heroImageUrl||game.imageUrl))}')"><div><span class="detail-kicker">PC GAME PASS · ${esc(game.id)}</span><h2>${esc(game.name)}</h2><div class="detail-badges">${platformBadges(game)}</div></div></div><div class="detail-body"><p class="description">${esc(game.shortDescriptionVi||'Mô tả tiếng Việt đang được bổ sung cho trò chơi này.')}</p><div class="facts"><div><label>PHÁT HÀNH</label><strong>${esc(dateLabel(game.releaseDate))}</strong></div><div><label>NHÀ PHÁT TRIỂN</label><strong>${esc(game.developer||'Chưa xác định')}</strong></div><div><label>NHÀ PHÁT HÀNH</label><strong>${esc(game.publisher||'Chưa xác định')}</strong></div><div><label>DUNG LƯỢNG PC</label><strong>${esc(game.storageDisplay||'Chưa xác định')}</strong></div><div><label>NGÔN NGỮ</label><strong>${esc(languageStatus)}</strong></div></div>${game.descriptionVi?`<h3>Giới thiệu trò chơi</h3><div class="xbox-description">${esc(game.descriptionVi)}</div><p class="translation-note">${game.translation?.status==='official'?'Mô tả tiếng Việt chính thức từ Microsoft Store.':'Bản dịch máy tiếng Việt để tham khảo; tên riêng và thuật ngữ có thể cần hiệu đính.'}</p>`:''}${patches.length?`<h3>Bản Việt hóa cộng đồng</h3><div class="patch-list">${patches.map(patch=>`<a href="${esc(patch.link)}" target="_blank" rel="noopener"><b>${esc(patch.source||'Nguồn Việt hóa')}</b><span>${esc(patch.name||game.name)} ↗</span></a>`).join('')}</div>`:''}${features.length?`<h3>Tính năng</h3><div class="feature-list">${features.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}<h3>Thể loại</h3><div class="feature-list">${(game.genres||[]).map(item=>`<span>${esc(genreLabel(item))}</span>`).join('')}</div>${mediaHtml}<div class="detail-actions"><a class="store-button" href="${esc(xboxAppUrl(game))}">MỞ TRONG ỨNG DỤNG XBOX</a><a class="web-button" href="${esc(game.storeUrl)}" target="_blank" rel="noopener">Xem trên web ↗</a>${safeLink(game.publisherWebsiteUrl)?`<a class="web-button" href="${esc(safeLink(game.publisherWebsiteUrl))}" target="_blank" rel="noopener">Trang nhà phát hành ↗</a>`:''}${safeLink(game.supportUrl)?`<a class="web-button" href="${esc(safeLink(game.supportUrl))}" target="_blank" rel="noopener">Hỗ trợ ↗</a>`:''}<button class="web-button" data-detail-favorite="${esc(game.id)}">${isFavorite?'♥ BỎ YÊU THÍCH':'♡ YÊU THÍCH'}</button></div><p class="source-note">Ảnh, trailer, mô tả gốc và dung lượng từ Microsoft Store. Ngôn ngữ lấy từ SupportedLanguages của Microsoft Catalog; Việt hóa được ghép theo tên chính xác và cần kiểm tra tương thích bản Microsoft Store tại nguồn. Dữ liệu cập nhật ${esc(new Date(catalog.metadata.updatedAt).toLocaleString('vi-VN'))}.</p></div>`;
  if(!$('#detail').open)$('#detail').showModal();document.body.classList.add('dialog-open');
  document.dispatchEvent(new CustomEvent('xbox:navigation-updated'));
  document.dispatchEvent(new CustomEvent('xbox:focus-primary'));
  setTimeout(()=>$('#detail .store-button')?.focus({preventScroll:true}),0);
}
function stopXboxVideo(){if(activeHls){activeHls.destroy();activeHls=null;}const video=$('#xbox-video-player video');if(video){video.pause();video.removeAttribute('src');video.load();}}
function openLightbox(index,trigger){if(!activeScreenshots.length)return;lightboxIndex=Math.max(0,Math.min(index,activeScreenshots.length-1));lightboxReturnFocus=trigger||document.activeElement;updateLightbox();const lightbox=$('#xbox-lightbox');if(!lightbox.open)lightbox.showModal();document.body.classList.add('lightbox-open');document.dispatchEvent(new CustomEvent('xbox:navigation-updated'));setTimeout(()=>lightbox.querySelector('.lightbox-back-btn')?.focus({preventScroll:true}),0);}
function updateLightbox(){const item=activeScreenshots[lightboxIndex];if(!item)return;const url=safeImage(item.url);$('#lightbox-img').src=url;$('#lightbox-img').alt=item.caption||`Ảnh gameplay ${lightboxIndex+1}`;$('#lightbox-counter').textContent=`${lightboxIndex+1} / ${activeScreenshots.length}`;$('#lightbox-full-link').href=url;$('#lightbox-prev').disabled=activeScreenshots.length<=1;$('#lightbox-next').disabled=activeScreenshots.length<=1;}
function closeLightbox(){const lightbox=$('#xbox-lightbox');if(!lightbox.open)return;lightbox.close();$('#lightbox-img').src='';document.body.classList.remove('lightbox-open');if(lightboxReturnFocus?.isConnected)lightboxReturnFocus.focus({preventScroll:true});document.dispatchEvent(new CustomEvent('xbox:navigation-updated'));}
function nextLightboxImage(){if(activeScreenshots.length<=1)return;lightboxIndex=(lightboxIndex+1)%activeScreenshots.length;updateLightbox();}
function previousLightboxImage(){if(activeScreenshots.length<=1)return;lightboxIndex=(lightboxIndex-1+activeScreenshots.length)%activeScreenshots.length;updateLightbox();}
window.__xboxLightbox={close:closeLightbox,next:nextLightboxImage,previous:previousLightboxImage};
function playXboxVideo(index){const item=activeDetailVideos[index],host=$('#xbox-video-player');if(!item||!host)return;stopXboxVideo();host.innerHTML=`<video controls playsinline poster="${esc(safeImage(item.previewImageUrl))}" aria-label="${esc(item.title||'Xbox trailer')}"></video><strong>${esc(item.title||'Xbox trailer')}</strong>`;const video=host.querySelector('video'),url=item.hlsUrl;if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=url;else if(window.Hls?.isSupported()){activeHls=new Hls();activeHls.loadSource(url);activeHls.attachMedia(video);}else{host.innerHTML='<p>Trình duyệt này không phát được trailer HLS.</p>';return;}video.play().catch(()=>{});host.scrollIntoView({behavior:'smooth',block:'center'});}
function closeDetail(){closeLightbox();stopXboxVideo();activeDetailVideos=[];activeScreenshots=[];$('#detail').close();document.body.classList.remove('dialog-open');}

initialize();
