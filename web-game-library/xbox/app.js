'use strict';

const catalog=window.XBOX_GAME_PASS_DATA;
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>new Intl.NumberFormat('vi-VN').format(value);
const PAGE_SIZE=36;
let filtered=[];
let page=1;

const featureLabels={SinglePlayer:'Một người chơi',OnlineMultiplayer:'Nhiều người trực tuyến',LocalMultiplayer:'Nhiều người cùng máy',CoopSupportOnline:'Co-op trực tuyến',CoopSupportLocal:'Co-op cùng máy',Capability4k:'4K Ultra HD',CapabilityHDR:'HDR',ConsoleGen9Optimized:'Tối ưu Series X|S',XPA:'Xbox Play Anywhere',XboxLive:'Xbox Network'};

function safeImage(url){return /^https:\/\//i.test(url||'')?url:'';}
function dateLabel(value){if(!value)return 'Chưa rõ ngày';const date=new Date(value);return Number.isNaN(date.valueOf())?'Chưa rõ ngày':date.toLocaleDateString('vi-VN',{year:'numeric',month:'short',day:'numeric'});}
function platformBadges(game){return game.platforms.map(item=>`<span class="platform ${item}">${item==='pc'?'PC':'XBOX'}</span>`).join('');}

function initialize(){
  if(!catalog?.games?.length){$('#game-grid').innerHTML='<div class="empty">Không có dữ liệu Xbox Game Pass.</div>';return;}
  const meta=catalog.metadata;
  $('#total-games').textContent=number(meta.totalGames);
  $('#pc-games').textContent=number(meta.pcGames);
  $('#console-games').textContent=number(meta.consoleGames);
  $('#updated-at').textContent=`Cập nhật ${new Date(meta.updatedAt).toLocaleString('vi-VN')} · Microsoft Catalog (${meta.market})`;
  const genres=[...new Set(catalog.games.flatMap(game=>game.genres||[]))].sort((a,b)=>a.localeCompare(b,'vi'));
  $('#genre').insertAdjacentHTML('beforeend',genres.map(genre=>`<option value="${esc(genre)}">${esc(genre)}</option>`).join(''));
  for(const selector of ['#search','#platform','#genre','#sort'])$(selector).addEventListener(selector==='#search'?'input':'change',()=>{page=1;applyFilters();});
  $('#pagination').addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(!button)return;page=Number(button.dataset.page);render();scrollTo({top:document.querySelector('.catalog-section').offsetTop-70,behavior:'smooth'});});
  $('#game-grid').addEventListener('click',event=>{const button=event.target.closest('[data-game]');if(button)openDetail(button.dataset.game);});
  $('#detail').addEventListener('click',event=>{if(event.target.closest('[data-close]')||event.target===$('#detail'))closeDetail();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#detail').open)closeDetail();if(event.key==='/'&&!/input|select/i.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  applyFilters();
}

function applyFilters(){
  const query=$('#search').value.trim().toLocaleLowerCase('vi');
  const platform=$('#platform').value;
  const genre=$('#genre').value;
  filtered=catalog.games.filter(game=>{
    const haystack=[game.name,game.developer,game.publisher,...(game.genres||[])].join(' ').toLocaleLowerCase('vi');
    return (!query||haystack.includes(query))&&(platform==='all'||game.platforms.includes(platform))&&(genre==='all'||game.genres.includes(genre));
  });
  const sort=$('#sort').value;
  filtered.sort((a,b)=>sort==='newest'?(Date.parse(b.releaseDate)||0)-(Date.parse(a.releaseDate)||0):(sort==='za'?-1:1)*a.name.localeCompare(b.name,'vi'));
  $('#result-title').textContent=platform==='pc'?'PC Game Pass':platform==='console'?'Xbox Console Game Pass':'Tất cả Game Pass';
  $('#result-count').textContent=`${number(filtered.length)} game`;
  render();
}

function render(){
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,pages);
  const games=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  $('#game-grid').innerHTML=games.length?games.map(game=>`<article class="game-card"><button data-game="${esc(game.id)}"><div class="art"><img src="${esc(safeImage(game.imageUrl))}" alt="${esc(game.name)}" loading="lazy"><div class="badges">${platformBadges(game)}</div></div><div class="card-body"><div class="genre">${esc(game.genres?.[0]||'Xbox Game Pass')}</div><h3>${esc(game.name)}</h3><p>${esc(game.publisher||game.developer||'Xbox Store')}</p></div></button></article>`).join(''):'<div class="empty">Không tìm thấy game phù hợp.</div>';
  const start=Math.max(1,page-2),end=Math.min(pages,start+4);let controls='';
  if(page>1)controls+=`<button data-page="${page-1}">←</button>`;
  for(let index=start;index<=end;index++)controls+=`<button class="${index===page?'active':''}" data-page="${index}">${index}</button>`;
  if(page<pages)controls+=`<button data-page="${page+1}">→</button>`;
  $('#pagination').innerHTML=pages>1?controls:'';
  document.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{image.closest('.art')?.classList.add('no-image');image.remove();},{once:true}));
}

function openDetail(id){
  const game=catalog.games.find(item=>item.id===id);if(!game)return;
  const features=(game.features||[]).filter(item=>featureLabels[item]).slice(0,10);
  $('#detail-inner').innerHTML=`<button class="close" data-close aria-label="Đóng">×</button><div class="detail-hero" style="background-image:linear-gradient(90deg,#07120b 0%,rgba(7,18,11,.82) 45%,rgba(7,18,11,.15)),url('${esc(safeImage(game.heroImageUrl||game.imageUrl))}')"><div><span class="detail-kicker">XBOX GAME PASS · ${esc(game.id)}</span><h2>${esc(game.name)}</h2><div class="detail-badges">${platformBadges(game)}</div></div></div><div class="detail-body"><p class="description">${esc(game.shortDescription||'Microsoft chưa cung cấp mô tả ngắn cho trò chơi này.')}</p><div class="facts"><div><label>PHÁT HÀNH</label><strong>${esc(dateLabel(game.releaseDate))}</strong></div><div><label>NHÀ PHÁT TRIỂN</label><strong>${esc(game.developer||'Chưa xác định')}</strong></div><div><label>NHÀ PHÁT HÀNH</label><strong>${esc(game.publisher||'Chưa xác định')}</strong></div><div><label>PHÂN LOẠI</label><strong>${esc(game.ageRating||'Chưa xác định')}</strong></div></div>${features.length?`<h3>Tính năng</h3><div class="feature-list">${features.map(item=>`<span>${esc(featureLabels[item])}</span>`).join('')}</div>`:''}<h3>Thể loại</h3><div class="feature-list">${(game.genres||[]).map(item=>`<span>${esc(item)}</span>`).join('')}</div><a class="store-button" href="${esc(game.storeUrl)}" target="_blank" rel="noopener">MỞ TRÊN XBOX STORE ↗</a><p class="source-note">Game Pass là dịch vụ có danh mục thay đổi theo thời gian và khu vực. Trạng thái này lấy từ Microsoft Catalog lúc ${esc(new Date(catalog.metadata.updatedAt).toLocaleString('vi-VN'))}.</p></div>`;
  $('#detail').showModal();document.body.classList.add('dialog-open');
}
function closeDetail(){$('#detail').close();document.body.classList.remove('dialog-open');}

initialize();
