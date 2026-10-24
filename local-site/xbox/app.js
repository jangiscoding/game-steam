'use strict';

const catalog=window.XBOX_GAME_PASS_DATA;
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>new Intl.NumberFormat('vi-VN').format(value);
const PAGE_SIZE=36;

const genreLabels={
  'Action & adventure':'Hành động & phiêu lưu','Card & board':'Bài & bàn cờ',Classics:'Kinh điển','Family & kids':'Gia đình & trẻ em',Fighting:'Đối kháng','Multi-player Online Battle Arena':'Đấu trường trực tuyến',Music:'Âm nhạc',Other:'Khác',Platformer:'Đi cảnh', 'Puzzle & trivia':'Giải đố & đố vui','Racing & flying':'Đua xe & bay lượn','Role playing':'Nhập vai',Shooter:'Bắn súng',Simulation:'Mô phỏng',Sports:'Thể thao',Strategy:'Chiến thuật'
};
const featureLabels={
  SinglePlayer:'Một người chơi',XblOnlineMultiPlayer:'Nhiều người trực tuyến',OnlineMultiplayer:'Nhiều người trực tuyến',XblLocalMultiPlayer:'Nhiều người cùng máy',LocalMultiplayer:'Nhiều người cùng máy',SharedSplitScreen:'Chia đôi màn hình',XblOnlineCoop:'Co-op trực tuyến',CoopSupportOnline:'Co-op trực tuyến',XblLocalCoop:'Co-op cùng máy',CoopSupportLocal:'Co-op cùng máy',XblCrossPlatformMultiPlayer:'Chơi chéo nền tảng',XblCrossPlatformCoop:'Co-op chéo nền tảng',Capability4k:'4K Ultra HD',CapabilityHDR:'HDR',ConsoleGen9Optimized:'Tối ưu Series X|S',XPA:'Xbox Play Anywhere',PcGamePad:'Tay cầm PC','60fps':'60 FPS','120fps':'120 FPS',RayTracing:'Ray Tracing',CapabilityVRR:'Tần số quét biến thiên',DolbyAtmos:'Dolby Atmos',XboxLive:'Xbox Network'
};
const collections=[
  {id:'all',icon:'◈',label:'Tất cả Game Pass',test:()=>true},
  {id:'pc',icon:'▣',label:'PC Game Pass',test:g=>g.platforms.includes('pc')},
  {id:'console',icon:'⊕',label:'Xbox Console',test:g=>g.platforms.includes('console')},
  {id:'single',icon:'●',label:'Một người chơi',test:g=>hasAny(g,['SinglePlayer'])},
  {id:'online-coop',icon:'◎',label:'Co-op trực tuyến',test:g=>hasAny(g,['XblOnlineCoop','CoopSupportOnline','XblCrossPlatformCoop'])},
  {id:'local-coop',icon:'♧',label:'Co-op cùng máy',test:g=>hasAny(g,['XblLocalCoop','CoopSupportLocal','SharedSplitScreen'])},
  {id:'multiplayer',icon:'◉',label:'Multiplayer',test:g=>hasAny(g,['XblOnlineMultiPlayer','OnlineMultiplayer','XblLocalMultiPlayer','LocalMultiplayer'])},
  {id:'xpa',icon:'↔',label:'Xbox Play Anywhere',test:g=>hasAny(g,['XPA'])},
  {id:'series',icon:'X|S',label:'Tối ưu Series X|S',test:g=>hasAny(g,['ConsoleGen9Optimized'])}
];
const featureFilters=[
  {id:'all',label:'Tất cả tính năng',test:()=>true},{id:'4k',label:'4K',test:g=>hasAny(g,['Capability4k'])},{id:'hdr',label:'HDR',test:g=>hasAny(g,['CapabilityHDR'])},{id:'60fps',label:'60 FPS',test:g=>hasAny(g,['60fps'])},{id:'120fps',label:'120 FPS',test:g=>hasAny(g,['120fps'])},{id:'crossplay',label:'Chơi chéo',test:g=>hasAny(g,['XblCrossPlatformMultiPlayer','CrossPlatformMultiPlayer'])},{id:'gamepad',label:'Tay cầm PC',test:g=>hasAny(g,['PcGamePad'])},{id:'raytracing',label:'Ray Tracing',test:g=>hasAny(g,['RayTracing'])}
];

let filtered=[];
let page=1;
let activeCollection='all';
let activeGenre='all';
let activeFeature='all';
let activeSort='az';

function hasAny(game,names){return names.some(name=>(game.features||[]).includes(name));}
function genreLabel(value){return genreLabels[value]||value;}
function safeImage(url){return /^https:\/\//i.test(url||'')?url:'';}
function dateLabel(value){if(!value)return 'Chưa rõ ngày';const date=new Date(value);return Number.isNaN(date.valueOf())?'Chưa rõ ngày':date.toLocaleDateString('vi-VN',{year:'numeric',month:'short',day:'numeric'});}
function platformBadges(game){return game.platforms.map(item=>`<span class="platform ${item}">${item==='pc'?'PC':'XBOX'}</span>`).join('');}
function xboxAppUrl(game){return `msxbox://game/?productId=${encodeURIComponent(game.id)}`;}

function initialize(){
  if(!catalog?.games?.length){$('#game-grid').innerHTML='<div class="empty">Không có dữ liệu Xbox Game Pass.</div>';return;}
  const meta=catalog.metadata;
  $('#total-games').textContent=number(meta.totalGames);
  $('#pc-games').textContent=number(meta.pcGames);
  $('#console-games').textContent=number(meta.consoleGames);
  $('#updated-at').textContent=`Cập nhật ${new Date(meta.updatedAt).toLocaleString('vi-VN')} · Microsoft Catalog (${meta.market})`;
  renderCollections();
  renderGenreChips();
  renderFeatureChips();
  $('#search').addEventListener('input',()=>{page=1;applyFilters();});
  $('#collections').addEventListener('click',event=>{const button=event.target.closest('[data-collection]');if(!button)return;activeCollection=button.dataset.collection;page=1;renderCollections();applyFilters();});
  $('#genre-chips').addEventListener('click',event=>{const button=event.target.closest('[data-genre]');if(!button)return;activeGenre=button.dataset.genre;page=1;renderGenreChips();applyFilters();});
  $('#feature-chips').addEventListener('click',event=>{const button=event.target.closest('[data-feature]');if(!button)return;activeFeature=button.dataset.feature;page=1;renderFeatureChips();applyFilters();});
  $('#sort-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-sort]');if(!button)return;activeSort=button.dataset.sort;page=1;document.querySelectorAll('[data-sort]').forEach(item=>item.classList.toggle('active',item===button));applyFilters();});
  $('#active-filters').addEventListener('click',event=>{if(!event.target.closest('[data-reset-filters]'))return;activeCollection='all';activeGenre='all';activeFeature='all';$('#search').value='';renderCollections();renderGenreChips();renderFeatureChips();applyFilters();});
  $('#pagination').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;page=Number(button.dataset.page);render();scrollTo({top:document.querySelector('.catalog-section').offsetTop-70,behavior:'smooth'});});
  $('#game-grid').addEventListener('click',event=>{const button=event.target.closest('[data-game]');if(button)openDetail(button.dataset.game);});
  $('#detail').addEventListener('click',event=>{if(event.target.closest('[data-close]')||event.target===$('#detail'))closeDetail();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#detail').open)closeDetail();if(event.key==='/'&&document.activeElement!==$('#search')){event.preventDefault();$('#search').focus();}});
  applyFilters();
}

function renderCollections(){
  $('#collections').innerHTML=collections.map(item=>`<button class="collection ${item.id===activeCollection?'active':''}" data-collection="${item.id}"><span><i>${item.icon}</i>${item.label}</span><b>${number(catalog.games.filter(item.test).length)}</b></button>`).join('');
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
    const haystack=[game.name,game.developer,game.publisher,...(game.genres||[]),...translatedGenres].join(' ').toLocaleLowerCase('vi');
    return (!query||haystack.includes(query))&&collection.test(game)&&feature.test(game)&&(activeGenre==='all'||game.genres.includes(activeGenre));
  });
  filtered.sort((a,b)=>activeSort==='newest'?(Date.parse(b.releaseDate)||0)-(Date.parse(a.releaseDate)||0):(activeSort==='za'?-1:1)*a.name.localeCompare(b.name,'vi'));
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
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,pages);
  const games=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  $('#game-grid').innerHTML=games.length?games.map(game=>`<article class="game-card"><button data-game="${esc(game.id)}"><div class="art"><img src="${esc(safeImage(game.imageUrl))}" alt="${esc(game.name)}" loading="lazy"><div class="badges">${platformBadges(game)}</div></div><div class="card-body"><div class="genre">${esc(genreLabel(game.genres?.[0]||'Xbox Game Pass'))}</div><h3>${esc(game.name)}</h3><p>${esc(game.publisher||game.developer||'Xbox Store')}</p></div></button></article>`).join(''):'<div class="empty">Không tìm thấy game phù hợp.</div>';
  const start=Math.max(1,page-2),end=Math.min(pages,start+4);let controls='';
  if(page>1)controls+=`<button data-page="${page-1}">←</button>`;
  for(let index=start;index<=end;index++)controls+=`<button class="${index===page?'active':''}" data-page="${index}">${index}</button>`;
  if(page<pages)controls+=`<button data-page="${page+1}">→</button>`;
  $('#pagination').innerHTML=pages>1?controls:'';
  document.querySelectorAll('.art img').forEach(image=>image.addEventListener('error',()=>{image.closest('.art')?.classList.add('no-image');image.remove();},{once:true}));
}

function openDetail(id){
  const game=catalog.games.find(item=>item.id===id);if(!game)return;
  const features=[...new Set((game.features||[]).map(item=>featureLabels[item]).filter(Boolean))].slice(0,12);
  $('#detail-inner').innerHTML=`<button class="close" data-close aria-label="Đóng">×</button><div class="detail-hero" style="background-image:linear-gradient(90deg,#07120b 0%,rgba(7,18,11,.82) 45%,rgba(7,18,11,.15)),url('${esc(safeImage(game.heroImageUrl||game.imageUrl))}')"><div><span class="detail-kicker">XBOX GAME PASS · ${esc(game.id)}</span><h2>${esc(game.name)}</h2><div class="detail-badges">${platformBadges(game)}</div></div></div><div class="detail-body"><p class="description">${esc(game.shortDescription||'Microsoft chưa cung cấp mô tả ngắn cho trò chơi này.')}</p><div class="facts"><div><label>PHÁT HÀNH</label><strong>${esc(dateLabel(game.releaseDate))}</strong></div><div><label>NHÀ PHÁT TRIỂN</label><strong>${esc(game.developer||'Chưa xác định')}</strong></div><div><label>NHÀ PHÁT HÀNH</label><strong>${esc(game.publisher||'Chưa xác định')}</strong></div><div><label>PHÂN LOẠI</label><strong>${esc(game.ageRating||'Chưa xác định')}</strong></div></div>${features.length?`<h3>Tính năng</h3><div class="feature-list">${features.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}<h3>Thể loại</h3><div class="feature-list">${(game.genres||[]).map(item=>`<span>${esc(genreLabel(item))}</span>`).join('')}</div><div class="detail-actions"><a class="store-button" href="${esc(xboxAppUrl(game))}">MỞ TRONG ỨNG DỤNG XBOX</a><a class="web-button" href="${esc(game.storeUrl)}" target="_blank" rel="noopener">Xem trên web ↗</a></div><p class="source-note">Nếu ứng dụng Xbox chưa được cài, dùng liên kết web dự phòng. Game Pass thay đổi theo thời gian và khu vực; dữ liệu lấy từ Microsoft Catalog lúc ${esc(new Date(catalog.metadata.updatedAt).toLocaleString('vi-VN'))}.</p></div>`;
  $('#detail').showModal();document.body.classList.add('dialog-open');
}
function closeDetail(){$('#detail').close();document.body.classList.remove('dialog-open');}

initialize();
