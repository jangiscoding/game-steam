'use strict';
const $=s=>document.querySelector(s);const num=n=>new Intl.NumberFormat('vi-VN').format(n);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const norm=v=>String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const viGenres={Action:'Hành động',Adventure:'Phiêu lưu',RPG:'Nhập vai',Strategy:'Chiến thuật',Simulation:'Mô phỏng',Indie:'Độc lập',Casual:'Giải trí nhẹ',Racing:'Đua xe',Sports:'Thể thao','Early Access':'Truy cập sớm','Free To Play':'Miễn phí'};
const viTags={"Singleplayer": "Chơi đơn", "Multiplayer": "Nhiều người chơi", "Co-op": "Chơi phối hợp (Co-op)", "Online Co-Op": "Co-op trực tuyến", "Local Co-Op": "Co-op chung máy", "Local Multiplayer": "Nhiều người chung máy", "PvP": "Đấu người với người (PvP)", "PvE": "Chống máy / Quái (PvE)", "Competitive": "Đấu hạng cạnh tranh", "Team-Based": "Phối hợp đồng đội", "Split Screen": "Chia đôi màn hình", "4 Player Local": "Chơi 4 người chung máy", "Asynchronous Multiplayer": "Nhiều người bất đồng bộ", "Co-op Campaign": "Chiến dịch Co-op", "First-Person": "Góc nhìn thứ nhất", "Third Person": "Góc nhìn thứ ba", "Top-Down": "Góc nhìn từ trên xuống", "Isometric": "Góc nhìn đẳng cự", "Side Scroller": "Cuộn cảnh màn hình ngang", "2D": "Đồ họa 2D", "2.5D": "Đồ họa 2.5D", "3D": "Đồ họa 3D", "VR": "Thực tế ảo VR", "Asymmetric VR": "VR bất đối xứng", "TrackIR": "Theo dõi chuyển động TrackIR", "3D Vision": "Hỗ trợ 3D Vision", "360 Video": "Video 360 độ", "6DOF": "Tự do 6 bậc chuyển động", "Action": "Hành động", "Adventure": "Phiêu lưu", "Indie": "Game độc lập (Indie)", "Strategy": "Chiến thuật", "RPG": "Nhập vai (RPG)", "Simulation": "Mô phỏng", "Casual": "Giải trí nhẹ nhàng", "Racing": "Đua xe", "Sports": "Thể thao", "Early Access": "Truy cập sớm", "Free to Play": "Chơi miễn phí", "Free To Play": "Chơi miễn phí", "Massively Multiplayer": "Trực tuyến nhiều người (MMO)", "MMORPG": "Nhập vai trực tuyến MMORPG", "MOBA": "Đấu trường chiến thuật MOBA", "Open World": "Thế giới mở", "Sandbox": "Thế giới tự do Sandbox", "Exploration": "Khám phá thế giới", "Survival": "Sinh tồn", "Survival Horror": "Kinh dị sinh tồn", "Open World Survival Craft": "Sinh tồn chế tạo thế giới mở", "Horror": "Kinh dị", "Psychological Horror": "Kinh dị tâm lý", "Puzzle": "Giải đố", "Puzzle Platformer": "Đi cảnh giải đố", "Platformer": "Đi cảnh Platformer", "2D Platformer": "Đi cảnh 2D", "3D Platformer": "Đi cảnh 3D", "Precision Platformer": "Đi cảnh chuẩn xác", "Parkour Platformer": "Đi cảnh Parkour", "Metroidvania": "Khám phá Metroidvania", "Roguelike": "Thử thách Roguelike", "Roguelite": "Nhập vai Roguelite", "Traditional Roguelike": "Roguelike truyền thống", "Action Roguelike": "Hành động Roguelike", "Roguelike Deckbuilder": "Xây bài Roguelike", "Card Roguelike": "Thẻ bài Roguelike", "Souls-like": "Độ khó cao Souls-like", "Dungeon Crawler": "Khám phá hầm ngục", "Mystery Dungeon": "Hầm ngục bí ẩn", "Hack and Slash": "Chặt chém Hack & Slash", "Musou": "Chặt chém đám đông Musou", "Beat 'em up": "Đấm đá đường phố Beat 'em up", "Fighting": "Đối kháng", "2D Fighter": "Đối kháng 2D", "3D Fighter": "Đối kháng 3D", "Spectacle fighter": "Hành động chặt chém mãn nhãn", "Character Action Game": "Hành động điều khiển nhân vật", "Shooter": "Bắn súng", "FPS": "Bắn súng góc nhìn thứ nhất", "Third-Person Shooter": "Bắn súng góc nhìn thứ ba", "Tactical FPS": "Bắn súng chiến thuật FPS", "Arena Shooter": "Bắn súng đấu trường", "Hero Shooter": "Bắn súng tướng / Anh hùng", "Looter Shooter": "Bắn súng săn đồ Loot", "Boomer Shooter": "Bắn súng cổ điển Retro", "Top-Down Shooter": "Bắn súng góc nhìn trên", "Twin Stick Shooter": "Bắn súng 2 cần điều khiển", "Bullet Hell": "Mưa đạn Bullet Hell", "Bullet Heaven": "Mưa đạn sinh tồn (Bullet Heaven)", "Shoot 'Em Up": "Bắn súng máy bay Shoot 'Em Up", "On-Rails Shooter": "Bắn súng đường ray (On-Rails)", "Sniper": "Bắn tỉa cự ly xa Sniper", "Battle Royale": "Đấu trường sinh tồn Battle Royale", "Extraction Shooter": "Bắn súng sinh tồn rút lui", "Stealth": "Lén lút / Hành động bí mật", "Stealth Action": "Hành động lén lút", "Boss Rush": "Khiêu chiến liên tục Boss", "Story Rich": "Cốt truyện sâu sắc", "Choices Matter": "Lựa chọn quyết định kết cục", "Multiple Endings": "Nhiều kết thúc khác nhau", "Choose Your Own Adventure": "Tự chọn chuyến phiêu lưu", "Interactive Fiction": "Tương tác tiểu thuyết", "Visual Novel": "Tiểu thuyết trực quan", "Otome": "Tiểu thuyết tình cảm Otome", "Walking Simulator": "Mô phỏng tản bộ / Khám phá chậm", "Lore-Rich": "Bối cảnh & cốt truyện sâu rộng", "Narration": "Giọng kể dẫn dắt", "Dynamic Narration": "Thuyết minh tình huống động", "Cinematic": "Đậm chất điện ảnh", "FMV": "Phim người đóng tương tác (FMV)", "FMV Horror": "Kinh dị phim người đóng (FMV)", "Linear": "Cốt truyện tuyến tính", "Nonlinear": "Cốt truyện phi tuyến tính", "Narrative": "Tập trung cốt truyện", "Text-Based": "Dựa trên văn bản chữ", "Dialogue Heavy": "Nhiều lời thoại tương tác", "Drama": "Kịch tính chính kịch", "Emotional": "Cảm xúc sâu lắng", "Philosophical": "Triết lý sâu xa", "Mystery": "Bí ẩn ly kỳ", "Detective": "Thám tử điều tra", "Investigation": "Điều tra phá án", "Crime": "Tội phạm hình sự", "Heist": "Phi vụ trộm cắp / Đột kích", "Conspiracy": "Âm mưu bí mật", "Illuminati": "Tổ chức bí mật ngầm", "Villain Protagonist": "Nhân vật chính phản diện", "Female Protagonist": "Nhân vật chính là nữ", "Silent Protagonist": "Nhân vật chính kiệm lời", "Based On A Novel": "Chuyển thể từ tiểu thuyết", "Turn-Based": "Lối chơi theo lượt", "Turn-Based Strategy": "Chiến thuật theo lượt", "Turn-Based Tactics": "Chiến thuật lượt đi", "Turn-Based Combat": "Chiến đấu theo lượt", "Tactical": "Tính chiến thuật cao", "Tactical RPG": "Nhập vai chiến thuật", "Strategy RPG": "Chiến thuật nhập vai", "RTS": "Chiến thuật thời gian thực (RTS)", "Action RTS": "Chiến thuật hành động RTS", "Real-Time": "Thời gian thực", "Real-Time with Pause": "Thời gian thực tạm dừng", "Real Time Tactics": "Chiến thuật chiến trường thực", "Grand Strategy": "Đại chiến lược quy mô lớn", "4X": "Chiến lược 4X (Khám phá & Bành trướng)", "Wargame": "Mô phỏng chiến tranh quân sự", "Tower Defense": "Thủ thành Tower Defense", "Auto Battler": "Tự động đánh trận (Auto Battler)", "Grid-Based Movement": "Di chuyển theo ô bàn cờ", "Hex Grid": "Bản đồ ô lục giác", "Card Game": "Trò chơi thẻ bài", "Card Battler": "Chiến đấu thẻ bài", "Deckbuilding": "Xây dựng bộ bài", "Trading Card Game": "Thẻ bài giao dịch TCG", "Board Game": "Cờ bàn Board Game", "Tabletop": "Trò chơi trên bàn Tabletop", "Tabletop Simulator": "Mô phỏng bàn cờ", "Chess": "Cờ vua trí tuệ", "Solitaire": "Xếp bài Solitaire", "Dice": "Tung xúc xắc xí ngầu", "Match 3": "Xếp 3 viên Match-3", "Sokoban": "Đẩy hộp giải đố Sokoban", "Logic": "Tư duy logic", "Physics Puzzle": "Câu đố vật lý", "Escape Room": "Phòng thoát hiểm Escape Room", "Hidden Object": "Tìm đồ vật ẩn", "Word Game": "Trò chơi ô chữ", "Building": "Xây dựng công trình", "Base Building": "Xây dựng căn cứ", "City Builder": "Xây dựng thành phố", "Colony Sim": "Mô phỏng thuộc địa", "Management": "Quản lý điều hành", "Resource Management": "Quản lý tài nguyên", "Inventory Management": "Quản lý hòm đồ vật phẩm", "Economy": "Kinh tế & tài chính", "Capitalism": "Chủ nghĩa tư bản / Thương trường", "Trading": "Giao thương buôn bán", "Shop Keeper": "Quản lý cửa hàng tạp hóa", "Automation": "Tự động hóa sản xuất", "Crafting": "Chế tạo công cụ & trang bị", "Mining": "Đào khoáng sản", "Farming": "Trồng trọt làm nông", "Farming Sim": "Mô phỏng nông trại", "Life Sim": "Mô phỏng cuộc sống", "Job Simulator": "Mô phỏng công việc đời sống", "Space Sim": "Mô phỏng du hành vũ trụ", "Flight Simulator": "Mô phỏng lái máy bay", "Automobile Sim": "Mô phỏng lái xe ô tô", "Driving": "Lái xe đường trường", "Flight": "Lái máy bay bầu trời", "Trains": "Mô phỏng lái tàu hỏa", "Transportation": "Giao thông vận tải", "Naval": "Hải quân & tàu bè", "Naval Combat": "Hải chiến trên biển", "Sailing": "Chèo thuyền vượt biển", "Sailing Sim": "Mô phỏng chèo thuyền", "Submarine": "Tàu ngầm biển sâu", "Submarine Sim": "Mô phỏng tàu ngầm", "Fishing": "Câu cá thư giãn", "Hunting": "Săn bắn động vật", "Hunting Sim": "Mô phỏng săn bắn", "God Game": "Quyền năng sáng thế (God Game)", "Political Sim": "Mô phỏng chính trường", "Diplomacy": "Ngoại giao liên minh", "Outbreak Sim": "Mô phỏng bùng phát dịch bệnh", "Zoo": "Mô phỏng sở thú", "Cleaning": "Dọn dẹp lau chùi", "Organizing": "Sắp xếp dọn dẹp đồ đạc", "Decorating": "Trang trí nhà cửa nội thất", "Time Management": "Quản lý thời gian", "Base Management": "Quản lý căn cứ", "Hobby Sim": "Mô phỏng sở thích", "Medical Sim": "Mô phỏng y tế / Bác sĩ", "Sci-fi": "Khoa học viễn tưởng", "Fantasy": "Thế giới kỳ ảo / Phép thuật", "Dark Fantasy": "Kỳ ảo đen tối", "Cyberpunk": "Công nghệ vị lai Cyberpunk", "Steampunk": "Thế giới hơi nước Steampunk", "Post-apocalyptic": "Bối cảnh hậu tận thế", "Dystopian": "Xã hội phản địa đàng", "Space": "Vũ trụ không gian", "Spaceships": "Tàu vũ trụ", "Space Flight": "Bay lượn ngoài không gian", "Mars": "Khám phá Sao Hỏa", "Medieval": "Thời kỳ Trung Cổ", "Historical": "Lịch sử thế giới", "Historical War": "Chiến tranh lịch sử", "World War I": "Chiến tranh Thế giới thứ 1", "World War II": "Chiến tranh Thế giới thứ 2", "Cold War": "Thời kỳ Chiến tranh Lạnh", "Modern Warfare": "Chiến tranh hiện đại", "War": "Chiến tranh khốc liệt", "Military": "Quân sự & vũ khí", "Western": "Miền Tây hoang dã", "Pirates": "Cướp biển đại dương", "Ninja": "Nhẫn giả Ninja", "Samurai": "Võ sĩ Samurai Nhật Bản", "Vikings": "Chiến binh Viking Bắc Âu", "Rome": "Đế chế La Mã cổ đại", "Wuxia": "Võ hiệp kiếm hiệp (Wuxia)", "Xianxia": "Tiên hiệp huyền huyễn (Xianxia)", "Martial Arts": "Võ thuật phương Đông", "Martial Arts Combat": "Giao đấu võ thuật", "Swordplay": "Kỹ năng đấu kiếm", "Archery": "Bắn cung tên", "Archery Combat": "Chiến đấu cung tên", "Archery Sim": "Mô phỏng bắn cung", "Archery Target": "Bắn cung bia mục tiêu", "Crossbow": "Bắn nỏ", "Superhero": "Siêu anh hùng", "Dinosaurs": "Khủng long thời tiền sử", "Dragons": "Rồng thiêng thần thoại", "Elves": "Chủng tộc Elf", "Dwarves": "Chủng tộc người lùn Dwarves", "Robots": "Người máy Robot", "Mechs": "Robot chiến đấu khổng lồ Mechs", "Aliens": "Sinh vật ngoài hành tinh", "Zombies": "Xác sống Zombies", "Vampires": "Ma cà rồng", "Werewolves": "Người sói Werewolves", "Demons": "Ác quỷ địa ngục", "Lovecraftian": "Kinh dị vũ trụ Lovecraft", "Gothic": "Kiến trúc & phong cách Gothic", "Noir": "Phong cách trinh thám u tối (Noir)", "Mythology": "Thần thoại các nền văn minh", "Mythological": "Yếu tố thần thoại", "Magic": "Phép thuật ma thuật", "Faith": "Tôn giáo & tín ngưỡng", "Cult": "Giáo phái tà bí ẩn", "Supernatural": "Hiện tượng siêu nhiên", "Underwater": "Dưới đáy đại dương", "Underground": "Thế giới ngầm lòng đất", "Nature": "Thiên nhiên & sinh thái", "Snow": "Tuyết & mùa đông", "Science": "Khoa học khám phá", "Transhumanism": "Siêu nhân học công nghệ cao", "Assassins": "Sát thủ bóng đêm", "Espionage": "Điệp viên tình báo", "Atmospheric": "Bầu không khí sống động", "Dark": "U tối & u ám", "Relaxing": "Thư giãn êm dịu", "Cozy": "Ấm áp dễ chịu (Cozy)", "Wholesome": "Trong sáng & chữa lành", "Cute": "Dễ thương đáng yêu", "Beautiful": "Đồ họa tuyệt đẹp", "Funny": "Hài hước dí dỏm", "Comedy": "Hài kịch vui nhộn", "Dark Comedy": "Hài kịch châm biếm sâu cay", "Dark Humor": "Khiếu hài đen", "Satire": "Châm biếm xã hội", "Parody": "Nhại hài hước", "Memes": "Văn hóa Meme mạng", "Colorful": "Rực rỡ sắc màu", "Stylized": "Phong cách nghệ thuật cách điệu", "Pixel Graphics": "Đồ họa Pixel hoài niệm", "Retro": "Phong cách Retro cổ điển", "Old School": "Trường phái cổ điển kinh điển", "Classic": "Tác phẩm kinh điển", "Cult Classic": "Kinh điển trong lòng người hâm mộ", "Nostalgia": "Hoài niệm tuổi thơ", "1980s": "Phong cách thập niên 1980", "1990's": "Phong cách thập niên 1990", "Minimalist": "Phong cách tối giản", "Hand-drawn": "Vẽ tay thủ công", "Cartoony": "Phong cách hoạt hình", "Cartoon": "Phim hoạt họa", "Anime": "Phong cách hoạt hình Anime", "Comic Book": "Truyện tranh phong cách Comic", "Psychedelic": "Ảo ảnh thị giác", "Surreal": "Siêu thực huyền ảo", "Abstract": "Nghệ thuật trừu tượng", "Psychological": "Chiều sâu tâm lý", "Thriller": "Giật gân kịch tính", "Gore": "Cảnh máu me rùng rợn", "Violent": "Yếu tố bạo lực", "Blood": "Đổ máu kịch liệt", "Jump Scare": "Hù dọa bất ngờ", "Romance": "Tình cảm lãng mạn", "Dating Sim": "Mô phỏng hẹn hò", "Hentai": "Nội dung người lớn (Hentai)", "Hentai / Mature": "Nội dung người lớn", "Sexual Content": "Nội dung nhạy cảm", "Nudity": "Nội dung khỏa thân", "Family Friendly": "Thân thiện gia đình & trẻ em", "LGBTQ+": "Chủ đề đa dạng giới LGBTQ+", "Epic": "Hùng tráng sử thi", "Immersive": "Trải nghiệm chân thực đắm chìm", "Realistic": "Đồ họa chân thực", "Great Soundtrack": "Nhạc nền đỉnh cao", "Soundtrack": "Nhạc game (OST)", "Music": "Âm nhạc nghệ thuật", "Rock Music": "Âm nhạc Rock cuồng nhiệt", "Rhythm": "Nhịp điệu âm nhạc", "Music-Based Procedural Generation": "Sinh thế giới theo nhịp điệu nhạc", "Electronic Music": "Nhạc điện tử sống động", "Instrumental Music": "Khí nhạc hòa tấu", "Audio Production": "Sản xuất âm thanh", "Physics": "Vật lý mô phỏng chân thực", "Destruction": "Phá hủy môi trường", "Difficult": "Độ khó cao / Thử thách", "Perma Death": "Chết là mất hết (Permadeath)", "Fast-Paced": "Nhịp độ nhanh dồn dập", "Score Attack": "Chạy đua kỷ lục điểm số", "Time Attack": "Chạy đua với thời gian", "Replay Value": "Giá trị chơi lại cao", "Procedural Generation": "Bản đồ sinh ngẫu nhiên", "Level Editor": "Công cụ tự tạo màn chơi", "Moddable": "Hỗ trợ cài đặt Mod", "Mod": "Hỗ trợ bản Mod tùy biến", "Character Customization": "Tùy biến ngoại hình nhân vật", "Gun Customization": "Tùy biến súng ống phụ kiện", "Controller": "Hỗ trợ tay cầm chơi game", "Mouse Only": "Chỉ dùng chuột điều khiển", "Touch-Friendly": "Tối ưu màn hình cảm ứng", "Voice Control": "Điều khiển bằng giọng nói", "Intentionally Awkward Controls": "Phím điều khiển lóng ngóng hài hước", "Quick-Time Events": "Phản xạ nhanh QTE", "Falling Blocks": "Khối hình rơi (Tetris)", "Loot": "Săn đồ nhặt Loot", "Combat": "Chiến đấu đối đầu", "Vehicular Combat": "Chiến đấu xe cộ cơ giới", "Combat Racing": "Đua xe bắn súng chiến đấu", "Parkour": "Nhào lộn Parkour mạo hiểm", "Time Travel": "Du hành xuyên thời gian", "Time Manipulation": "Thao túng dòng thời gian", "Bullet Time": "Hiệu ứng làm chậm thời gian", "Hacking": "Xâm nhập hệ thống máy tính", "Crowd Control": "Khống chế đám đông", "Remake": "Bản làm lại hoàn toàn (Remake)", "Reboot": "Khởi động lại thương hiệu (Reboot)", "Sequel": "Phần tiếp theo (Sequel)", "Spiritual Successor": "Hậu bản tinh thần", "Episodic": "Phát hành theo từng tập", "Crowdfunded": "Dự án gây quỹ cộng đồng", "Clicker": "Bấm chuột liên tục (Clicker)", "Idler": "Game tự động chơi (Idler)", "Incremental": "Tăng tiến cấp số nhân", "Runner": "Chạy vô tận (Runner)", "Collectathon": "Thu thập vật phẩm số lượng lớn", "Creature Collector": "Thu thập & huấn luyện sinh vật", "Trophy Hunter": "Săn thành tựu & danh hiệu", "Experimental": "Thể nghiệm lối chơi mới", "Point & Click": "Trỏ và nhấn (Point & Click)", "Action RPG": "Nhập vai hành động (Action RPG)", "CRPG": "Nhập vai cổ điển máy tính (CRPG)", "JRPG": "Nhập vai phong cách Nhật (JRPG)", "Party-Based RPG": "Nhập vai theo tổ đội", "Action-Adventure": "Hành động phiêu lưu", "Arcade": "Trò chơi thùng Arcade", "Pinball": "Bắn bóng Pinball", "Minigames": "Trò chơi nhỏ Minigames", "Party Game": "Trò chơi nhóm tiệc tùng", "Party": "Trò chơi giao lưu bạn bè", "Social Deduction": "Suy luận xã hội / Ẩn vai", "Gambling": "May rủi cá cược", "Dungeons & Dragons": "Luật chơi Dungeons & Dragons", "Voxel": "Đồ họa khối Voxel", "Modern": "Bối cảnh hiện đại", "Futuristic": "Công nghệ tương lai", "Alternate History": "Lịch sử giả định thay thế", "Tanks": "Chiến xa xe tăng", "Class-Based": "Phân chia lớp nhân vật", "Immersive Sim": "Mô phỏng nhập tâm (Immersive Sim)", "Short": "Thời lượng chơi ngắn", "Addictive": "Lối chơi cực kỳ cuốn hút", "Tutorial": "Có phần hướng dẫn người chơi", "Artificial Intelligence": "Trí tuệ nhân tạo (AI)", "Football": "Bóng đá", "Soccer": "Bóng đá", "Football (Soccer)": "Bóng đá (Soccer)", "Football (American)": "Bóng bầu dục Mỹ", "Basketball": "Bóng rổ", "Tennis": "Quần vợt Tennis", "Table Tennis": "Bóng bàn", "Badminton": "Cầu lông", "Baseball": "Bóng chày", "Golf": "Đánh Golf", "Mini Golf": "Đánh Golf mini", "Bowling": "Ném bóng Bowling", "Boxing": "Quyền Anh Boxing", "Boxing Combat": "Giao đấu quyền Anh", "Kickboxing": "Võ Kickboxing", "Muay Thai": "Võ Muay Thái", "Karate": "Võ Karate", "Judo": "Võ Judo", "Taekwondo": "Võ Taekwondo", "Kung Fu": "Võ thuật Kung Fu", "Capoeira": "Võ Capoeira", "Kendo": "Kiếm đạo Kendo", "Sumo": "Đấu vật Sumo", "Wrestling": "Đấu vật biểu diễn", "Arm Wrestling": "Vật tay đối kháng", "Tug of War": "Trò chơi kéo co", "Fencing": "Môn đấu kiếm thể thao", "Rugby": "Bóng bầu dục Rugby", "Cricket": "Bóng gậy Cricket", "Hockey": "Khúc côn cầu Hockey", "Volleyball": "Bóng chuyền", "Water Polo": "Bóng nước", "Handball": "Bóng ném", "Dodgeball": "Ném bóng né Dodgeball", "Pool / Billiards": "Bi-a / Bida lỗ", "Billiards": "Bi-a Bida", "Snooker": "Bi-a Snooker", "Dart": "Phóng phi tiêu Darts", "Frisbee": "Ném đĩa Frisbee", "Air Hockey": "Khúc côn cầu bàn khí", "Foosball": "Bi lắc bàn Foosball", "Table Football": "Bi lắc bóng đá bàn", "Croquet": "Môn bóng vồ Croquet", "Bocce": "Môn ném bi Bocce", "Pétanque": "Môn bi sắt Pétanque", "Lawn Bowls": "Môn ném bóng trên cỏ", "Polo": "Mã cầu Polo", "Squash": "Bóng quần Squash", "Racquetball": "Quần vợt Racquetball", "Pickleball": "Môn Pickleball", "Skate": "Trượt ván Skate", "Skateboarding": "Môn trượt ván đường phố", "Skating": "Trượt pa-tanh / Trượt băng", "Snowboarding": "Trượt ván tuyết", "Skiing": "Trượt tuyết", "Cycling": "Đạp xe thể thao", "BMX": "Xe đạp địa hình mạo hiểm BMX", "Bikes": "Xe mô tô / Xe máy", "Motorbike": "Xe mô tô", "Motocross": "Đua mô tô địa hình", "ATV": "Xe vượt địa hình 4 bánh ATV", "Motorsport": "Thể thao đua xe tốc độ", "Kart": "Đua xe Go-Kart", "Offroad": "Đua xe địa hình Offroad", "Surfing": "Lướt sóng biển", "Windsurfing": "Lướt ván buồm", "Wakeboarding": "Lướt ván kéo cáp", "Kitesurfing": "Lướt ván diều", "Paddleboarding": "Chèo ván đứng SUP", "Rowing": "Chèo thuyền thể thao", "Kayaking": "Chèo thuyền Kayak", "Canoeing": "Chèo thuyền Cano", "Rafting": "Chèo xuồng vượt thác", "Rock Climbing": "Leo vách núi đá", "Bouldering": "Leo khối đá Bouldering", "Paragliding": "Bay dù lượn", "Hang Gliding": "Bay lượn diều có động cơ", "Curling": "Môn ném đá trên băng Curling", "Paintball": "Bắn súng sơn Paintball", "Laser Tag": "Bắn súng tia Laser", "eSports": "Thể thao điện tử (Esports)", "Animals": "Động vật muông thú", "Horses": "Loài ngựa", "Dogs": "Loài chó", "Cats": "Mèo cưng", "Cats & Dogs": "Chó mèo cưng", "Birds": "Loài chim muông", "Wolves": "Loài chó sói", "Foxes": "Loài cáo", "Capybaras": "Chuột lang nước Capybara", "Lemmings": "Đàn chuột Lemming", "Agriculture": "Nông nghiệp & trồng trọt", "Hardware": "Mô phỏng phần cứng thiết bị", "Software Training": "Hướng dẫn sử dụng phần mềm", "Language Learning": "Học tập ngoại ngữ", "Spelling": "Luyện đánh vần từ vựng", "Trivia": "Đố vui kiến thức", "Trivia / Quiz": "Trắc nghiệm đố vui", "Typing": "Luyện gõ bàn phím tốc độ", "Board": "Bàn cờ cổ điển", "Cooking": "Nấu ăn & làm bếp", "Education": "Giáo dục học tập", "Programming": "Lập trình tin học", "Game Development": "Phát triển làm game", "Animation & Modeling": "Hoạt hình & dựng hình 3D", "Design & Illustration": "Thiết kế & minh họa", "Desktop Companion": "Bạn đồng hành màn hình Desktop", "Benchmark": "Đo kiểm hiệu năng phần cứng", "Gaming": "Văn hóa game & giải trí", "Software": "Phần mềm máy tính", "Utilities": "Công cụ & tiện ích"};
const tagLabel=name=>viTags[name]||viGenres[name]||name;
const genreIcons={'genre-action':'●','genre-adventure':'◇','rpg':'⚔','genre-strategy':'♜','genre-simulation':'▦','genre-indie':'✦','genre-casual':'☕','genre-racing':'🏎','genre-sports':'⚽','genre-early-access':'⏳','genre-massively-multiplayer':'👥','genre-free-to-play':'🎁','genre-gore':'☣','genre-violent':'⚡','genre-game-development':'⚙','genre-sexual-content':'🔞','genre-nudity':'🔞','unclassified':'？'};
const featured=['1245620','1091500','1145360','1817070','413150','292030','271590','367520','1174180','1086940','620','400'];
let catalog,byId,tabSets,filtered=[],activeTab='all',detailToken=0,tagSortMode='alpha';let activeHls=null;let activeGame=null;const detailCache=new Map(),selectedTags=new Set(),selectedGenres=new Set();const dialog=$('#detail');
let currentLightboxImages=[],currentLightboxIndex=0,lightboxReturnFocus=null;
const storageKeys={personal:'jang-game-personal-v1',preferences:'jang-game-preferences-v1',hero:'jang-game-last-hero',scroll:'jang-game-scroll',installed:'jang-game-installed-v1'};
function readStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function writeStorage(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
const cachedInstalled=readStorage(storageKeys.installed,['1088850','1726400','249130','2651280','357190','410110','493840','620']);
let installedAppIds=new Set(cachedInstalled.map(String));
const personal=readStorage(storageKeys.personal,{favorites:[],recent:[],statuses:{}});const favorites=new Set(personal.favorites||[]);let recentGames=personal.recent||[];const gameStatuses=personal.statuses||{};
const savedPreferences=readStorage(storageKeys.preferences,{genres:[],tags:[],controller:'',sort:'featured'});
const virtual={cardHeight:0,columns:0,start:-1,end:-1,overscan:8};let virtualFrame=0,scrollSaveTimer=0;
function savePersonal(){writeStorage(storageKeys.personal,{favorites:[...favorites],recent:recentGames,statuses:gameStatuses});}
function savePreferences(){writeStorage(storageKeys.preferences,{genres:[...selectedGenres],tags:[...selectedTags],sort:$('#sort').value});}
function safeUrl(url){try{const u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function steamAppUrl(appId){return /^\d+$/.test(String(appId||''))?`steam://nav/games/details/${appId}`:'';}
function image(url,alt,extra=''){return `<img src="${esc(safeUrl(url))}" alt="${esc(alt)}" ${extra}>`;}
function imageFallbacks(root=document){root.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.style.opacity='0';img.parentElement.style.background='linear-gradient(135deg,#3b4939,#191d21)';},{once:true});});}
function personalIds(id){if(id==='favorites')return [...favorites];if(id==='recent')return recentGames;if(id.startsWith('status-'))return Object.keys(gameStatuses).filter(gameId=>gameStatuses[gameId]===id.slice(7));return null;}
function allowedSet(id){const ids=personalIds(id);return ids?new Set(ids):tabSets.get(id);}
function selectTab(id,scroll=false){if(!allowedSet(id))return;activeTab=id;resetVirtual();renderCollections();renderChips();applyFilters();if(scroll)$('#library').scrollIntoView({behavior:'smooth'});}
function renderCollections(){const groups=[['all','◈','Tất cả game'],['installed','✔','Game đã cài trên máy'],['favorites','♥','Game Jang yêu thích'],['recent','◷','Đã xem gần đây'],['local-controller','♧'],['controller','⊞'],['local-coop','♧'],['online-coop','◎']];$('#collections').innerHTML=groups.map(([id,icon,label])=>{const set=allowedSet(id)||new Set();const name=label||catalog?.tabs.find(t=>t.id===id)?.name||id;return `<button class="collection ${id===activeTab?'selected':''} ${id==='installed'?'collection-installed':''}" data-select-tab="${esc(id)}"><span><span>${icon}</span>${esc(name)}</span><b>${num(set.size)}</b></button>`;}).join('');}
function genreName(id){return catalog.tabs.find(t=>t.id===id)?.name||id;}

const DEFAULT_VIETHOA_SOURCES=[
  {id:'theredteam',name:'The Red Team',searchUrl:'https://theredteam.vn/list-search.php?q=',baseUrl:'https://theredteam.vn/'}
];
let viethoaSources=null,theredteamCache=null;
function getViethoaSources(){
  if(!viethoaSources){
    try{
      const raw=localStorage.getItem('jang_viethoa_sources');
      if(raw)viethoaSources=JSON.parse(raw);
    }catch(_){}
    if(!Array.isArray(viethoaSources)||!viethoaSources.length)viethoaSources=[...DEFAULT_VIETHOA_SOURCES];
  }
  return viethoaSources;
}
function saveViethoaSources(list){
  viethoaSources=list;
  try{localStorage.setItem('jang_viethoa_sources',JSON.stringify(list));}catch(_){}
}
function cleanTitleForSearch(name){
  if(!name)return '';
  return name.replace(/[™®©]/g,'')
    .replace(/\s*\([^)]*\)/g,'')
    .replace(/\s*\[[^\]]*\]/g,'')
    .replace(/\s*\/\s*[\u3000-\u9fff\uff00-\uffef]+/g,'')
    .replace(/\s*-\s*(GOTY|Game of the Year|Definitive|Enhanced|Remastered|Deluxe|Special|Anniversary)\s*Edition/gi,'')
    .trim()||name;
}
async function loadTheredteamCache(){
  if(theredteamCache)return;
  try{
    const res=await fetch('./data/theredteam.json');
    if(res.ok)theredteamCache=await res.json();
  }catch(_){}
}

async function initViethoaSection(g){
  const box=$('#viethoa-section');
  if(!box)return;
  const sources=getViethoaSources();
  const select=$('#viethoa-source-select');
  if(select){
    select.innerHTML=sources.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  }
  const input=$('#viethoa-search-input');
  const cleanTitle=cleanTitleForSearch(g.name);
  if(input)input.value=cleanTitle;
  renderViethoaSourcesList();
  const sourceId=select?.value||sources[0]?.id||'theredteam';
  await runViethoaSearch(cleanTitle,sourceId);
}

function renderViethoaSourcesList(){
  const container=$('#viethoa-sources-list');
  if(!container)return;
  const sources=getViethoaSources();
  container.innerHTML=sources.map(s=>`
    <div class="viethoa-source-entry">
      <div class="viethoa-source-meta">
        <strong>${esc(s.name)}</strong>
        <span>${esc(s.searchUrl)}</span>
      </div>
      ${sources.length>1?`<button type="button" class="viethoa-source-delete-btn" data-delete-source="${esc(s.id)}" title="Xóa nguồn này">Xóa</button>`:''}
    </div>
  `).join('');
}

async function runViethoaSearch(keyword,sourceId){
  const container=$('#viethoa-results-container');
  if(!container)return;
  const q=keyword.trim();
  const sources=getViethoaSources();
  const source=sources.find(s=>s.id===sourceId)||sources[0];
  if(!source)return;

  if(!q){
    container.innerHTML='<div class="viethoa-empty-alert"><p>Vui lòng nhập tên game để tìm kiếm bản Việt Hóa.</p></div>';
    return;
  }

  container.innerHTML='<div class="viethoa-loading-state"><span class="viethoa-spinner"></span> Đang tìm kiếm bản Việt Hóa trên <b>'+esc(source.name)+'</b>…</div>';

  let results=[];
  if(source.id==='theredteam'){
    await loadTheredteamCache();
    if(Array.isArray(theredteamCache)){
      const nq=norm(q);
      const matches=theredteamCache.filter(item=>norm(item.name).includes(nq)||norm(item.link).includes(nq));
      if(matches.length)results=matches;
    }
  }

  if(!results.length){
    try{
      const apiUrl=`/api/search-viethoa?url=${encodeURIComponent(source.searchUrl)}&q=${encodeURIComponent(q)}`;
      const res=await fetch(apiUrl,{cache:'no-store'});
      if(res.ok){
        const data=await res.json();
        if(data?.ok&&Array.isArray(data.results)&&data.results.length){
          results=data.results;
        }
      }
    }catch(_){}
  }

  if(results.length){
    container.innerHTML=`
      <div class="viethoa-found-alert">
        <span class="viethoa-found-icon">✔</span>
        <span>Tìm thấy <b>${results.length}</b> kết quả Việt Hóa trên <b>${esc(source.name)}</b>:</span>
      </div>
      <div class="viethoa-results-grid">
        ${results.map(r=>{
          const linkStr=String(r.link||'');
          const fullLink=linkStr.startsWith('http')?linkStr:(source.baseUrl.replace(/\/$/,'')+'/'+linkStr.replace(/^\//,''));
          const imgStr=String(r.img||'');
          const fullImg=imgStr?(imgStr.startsWith('http')?imgStr:(source.baseUrl.replace(/\/$/,'')+'/'+imgStr.replace(/^\//,''))):'';
          return `<div class="viethoa-item-card">
            ${fullImg?`<img src="${safeUrl(fullImg)}" class="viethoa-item-img" alt="${esc(r.name)}" loading="lazy">`:''}
            <div class="viethoa-item-info">
              <strong class="viethoa-item-name">${esc(r.name)}</strong>
              <div class="viethoa-item-actions">
                <a href="${esc(fullLink)}" target="_blank" rel="noopener" class="button primary viethoa-download-btn">
                  <span>📥</span> Tải Patch Việt Hóa (${esc(source.name)}) ↗
                </a>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }else{
    const shortWord=q.split(/[:\-–]/)[0].trim();
    container.innerHTML=`
      <div class="viethoa-empty-alert">
        <p>Chưa tìm thấy bản dịch trên <b>${esc(source.name)}</b> với từ khóa <i>"${esc(q)}"</i>.</p>
        ${shortWord&&shortWord!==q?`<div style="margin-bottom:10px"><button type="button" class="button ghost" data-viethoa-retry="${esc(shortWord)}" style="font-size:10px;padding:5px 10px">Thử tìm tên ngắn: "${esc(shortWord)}"</button></div>`:''}
        <div class="viethoa-fallback-actions">
          <a href="https://www.google.com/search?q=${encodeURIComponent(q+' việt hóa patch')}" target="_blank" rel="noopener" class="button ghost">
            🌐 Tìm trên Google
          </a>
          <a href="https://www.google.com/search?q=site:gametiengviet.com+${encodeURIComponent('"'+q+'"')}" target="_blank" rel="noopener" class="button ghost">
            🟢 Tìm trên GameTiengViet
          </a>
          <a href="https://store.steampowered.com/search/?term=${encodeURIComponent(q)}&tags=11014" target="_blank" rel="noopener" class="button ghost">
            ⚙ Steam Tag Tiếng Việt
          </a>
        </div>
      </div>
    `;
  }
}

function renderChips(){
  const genres=catalog.tabs.filter(t=>t.id.startsWith('genre-')||t.id==='rpg'||t.id==='unclassified');
  genres.sort((a,b)=>b.gameIds.length-a.gameIds.length);
  const installedCount=allowedSet('installed')?.size||0;
  const isInstalledActive=activeTab==='installed';
  const installedChip=`<button class="chip chip-installed ${isInstalledActive?'selected':''}" data-select-tab="installed" aria-pressed="${isInstalledActive}"><span>✔</span>Game đã cài trên máy <small>${num(installedCount)}</small></button>`;
  $('#genre-chips').innerHTML=installedChip+genres.map(t=>{
    const sel=selectedGenres.has(t.id);
    const icon=genreIcons[t.id]||'●';
    return `<button class="chip ${sel?'selected':''}" data-filter-genre-button="${esc(t.id)}" aria-pressed="${sel}"><span>${icon}</span>${esc(t.name)} <small>${num(t.gameIds.length)}</small></button>`;
  }).join('');
  renderSelectedFilters();
}

function renderSidebarTags(query=''){
  const container=$('#sidebar-tags');
  if(!container||!catalog?.tags)return;
  const needle=norm(query.trim());
  let list=catalog.tags.slice();
  if(needle){
    list=list.filter(t=>norm(t.name).includes(needle)||norm(tagLabel(t.name)).includes(needle));
  }
  if(tagSortMode==='alpha'){
    list.sort((a,b)=>tagLabel(a.name).localeCompare(tagLabel(b.name),'vi')||a.name.localeCompare(b.name));
  }else{
    list.sort((a,b)=>(b.games||0)-(a.games||0)||tagLabel(a.name).localeCompare(tagLabel(b.name),'vi'));
  }
  const countLabel=$('#tags-count-label');
  if(countLabel)countLabel.textContent=needle?`${list.length}/${catalog.tags.length}`:catalog.tags.length;
  if(!list.length){
    container.innerHTML='<div class="sidebar-tags-empty">Không tìm thấy tag phù hợp.</div>';
    return;
  }
  container.innerHTML=list.map(t=>{
    const sel=selectedTags.has(t.name);
    return `<button type="button" class="sidebar-tag-item ${sel?'selected':''}" data-sidebar-tag="${esc(t.name)}" aria-pressed="${sel}" title="${esc(tagLabel(t.name))} (${esc(t.name)}) · ${num(t.games)} game">
      <span class="tag-vi">${esc(tagLabel(t.name))}</span>
      <span class="tag-meta"><b class="tag-num">${num(t.games)}</b></span>
    </button>`;
  }).join('');
}

function filterChips(items,type,label){return items.length?items.map(([value,text])=>`<button type="button" data-remove-${type}="${esc(value)}" aria-label="Bỏ ${label} ${esc(text)}">${esc(text)}<span aria-hidden="true">×</span></button>`).join(''):'<em>Tất cả</em>';}
function renderSelectedFilters(){const genreItems=[...selectedGenres].map(id=>[id,genreName(id)]),tagItems=[...selectedTags].map(name=>[name,tagLabel(name)]);const tc=$('#tag-count');if(tc){tc.hidden=!tagItems.length;tc.textContent=tagItems.length;}$('#selected-genres').innerHTML=filterChips(genreItems,'genre','thể loại');$('#selected-tags').innerHTML=filterChips(tagItems,'tag','tag');}
function toggleTag(name,checked){if(checked)selectedTags.add(name);else selectedTags.delete(name);resetVirtual();renderSelectedFilters();renderSidebarTags($('#sidebar-tag-search')?.value||'');savePreferences();applyFilters();}
function toggleGenre(id,checked){if(checked)selectedGenres.add(id);else selectedGenres.delete(id);resetVirtual();document.querySelectorAll('[data-filter-genre-button]').forEach(btn=>{const gid=btn.dataset.filterGenreButton,sel=selectedGenres.has(gid);btn.classList.toggle('selected',sel);btn.setAttribute('aria-pressed',sel);});renderSelectedFilters();savePreferences();applyFilters();}
function activeTabName(){const personalNames={favorites:'Game Jang yêu thích',recent:'Đã xem gần đây',installed:'Đã cài trên máy'};return personalNames[activeTab]||catalog.tabs.find(t=>t.id===activeTab)?.name||'Tất cả game';}
function applyFilters(){const query=norm($('#search').value.trim());const tags=[...selectedTags],genreSets=[...selectedGenres].map(id=>tabSets.get(id)).filter(Boolean);const allowed=allowedSet(activeTab)||tabSets.get('all');filtered=catalog.games.filter(g=>allowed.has(g.id)&&genreSets.every(set=>set.has(g.id))&&(!query||g.searchKey.includes(query))&&(!tags.length||tags.every(tag=>(g.steamTags||[]).includes(tag))));const sort=$('#sort').value;filtered.sort((a,b)=>{if(sort==='featured'){const ar=featured.indexOf(a.steamAppId),br=featured.indexOf(b.steamAppId);if(ar!==br)return (ar<0?999:ar)-(br<0?999:br);}if(sort==='release-new'||sort==='release-old'){const ay=Number(a.releaseYear)||0,by=Number(b.releaseYear)||0;if(Boolean(ay)!==Boolean(by))return ay?-1:1;if(ay!==by)return sort==='release-new'?by-ay:ay-by;}return (sort==='za'?-1:1)*a.name.localeCompare(b.name,'vi');});$('#current-tab').textContent=activeTabName();$('#result-count').textContent=`${num(filtered.length)} game`;$('#notice').innerHTML=activeTab==='local-controller'?`<p class="language-note">Có hỗ trợ tay cầm và Local Co-op hoặc Shared/Split Screen. Dữ liệu Steam chưa xác nhận chính xác số tay cầm tối đa của từng game.</p>`:'';resetVirtual();renderGames(true);}
function resetVirtual(){virtual.cardHeight=0;virtual.columns=0;virtual.start=-1;virtual.end=-1;}
function cardMarkup(g){const coop=g.playerModes?.localCoop||g.playerModes?.sharedOrSplitScreen;const year=g.releaseYear?`Phát hành ${g.releaseYear}`:'Chưa rõ năm phát hành';const favorite=favorites.has(g.id);const isInstalled=installedAppIds.has(String(g.steamAppId));return `<article class="game-card ${isInstalled?'is-installed':''}"><button class="game-open" data-game="${esc(g.id)}" aria-label="Xem chi tiết ${esc(g.name)}"><div class="card-art">${image(g.imageUrl,g.name,'loading="lazy" decoding="async"')}<span class="card-tag">${coop?'CHƠI CHUNG MÁY':esc(viGenres[g.genres?.[0]]||g.genres?.[0]||'KHÁM PHÁ')}</span>${isInstalled?'<span class="badge-installed" title="Trò chơi đã cài đặt trên máy">✔ ĐÃ CÀI ĐẶT</span>':''}</div><div class="card-body"><h3 title="${esc(g.name)}">${esc(g.name)}</h3><div class="card-meta"><span>${esc((g.genres||[]).slice(0,2).map(t=>viGenres[t]||t).join(' · ')||'Chưa rõ thể loại')}</span><i>${esc(year)}</i></div></div></button><button class="favorite-button ${favorite?'selected':''}" data-favorite="${esc(g.id)}" aria-pressed="${favorite}" aria-label="${favorite?'Bỏ khỏi':'Thêm vào'} game Jang yêu thích">${favorite?'♥':'♡'}</button></article>`;}
function renderGames(force=false){const grid=$('#game-grid');if(!filtered.length){grid.innerHTML='<div class="empty"><strong>Chưa tìm thấy trò chơi này.</strong>Thử tên khác hoặc xóa bộ lọc để xem thêm game.</div>';$('#pagination').innerHTML='';return;}const style=getComputedStyle(grid);const columns=Math.max(1,style.gridTemplateColumns.split(' ').filter(Boolean).length);const rowGap=parseFloat(style.rowGap)||23;if(virtual.columns&&virtual.columns!==columns)resetVirtual();virtual.columns=columns;if(!virtual.cardHeight){const end=Math.min(filtered.length,40);grid.innerHTML=filtered.slice(0,end).map(cardMarkup).join('');imageFallbacks(grid);$('#pagination').innerHTML=`<span>${num(filtered.length)} game · Đang tối ưu danh sách</span>`;requestAnimationFrame(()=>{const card=grid.querySelector('.game-card');if(!card)return;virtual.cardHeight=card.getBoundingClientRect().height;virtual.start=-1;renderGames(true);});return;}const rowStep=virtual.cardHeight+rowGap;const gridTop=grid.getBoundingClientRect().top+window.scrollY;const offset=Math.max(0,window.scrollY-gridTop);const totalRows=Math.ceil(filtered.length/columns);const firstRow=Math.max(0,Math.floor(offset/rowStep)-virtual.overscan);const desiredLastRow=Math.min(totalRows,Math.ceil((offset+window.innerHeight)/rowStep)+virtual.overscan);const lastRow=Math.min(desiredLastRow,firstRow+Math.max(1,Math.floor(100/columns)));const start=firstRow*columns,end=Math.min(filtered.length,lastRow*columns);if(!force&&start===virtual.start&&end===virtual.end)return;virtual.start=start;virtual.end=end;const topHeight=Math.max(0,firstRow*rowStep-rowGap);const bottomRows=Math.max(0,totalRows-lastRow);const bottomHeight=Math.max(0,bottomRows*rowStep-rowGap);grid.innerHTML=(topHeight?`<div class="virtual-spacer" style="height:${topHeight}px" aria-hidden="true"></div>`:'')+filtered.slice(start,end).map(cardMarkup).join('')+(bottomHeight?`<div class="virtual-spacer" style="height:${bottomHeight}px" aria-hidden="true"></div>`:'');imageFallbacks(grid);$('#pagination').innerHTML=`<span>Đang hiển thị ${num(start+1)}–${num(end)}/${num(filtered.length)} · Chỉ giữ ${num(end-start)} thẻ trên màn hình</span>`;document.dispatchEvent(new CustomEvent('archive:rendered',{detail:{start,end}}));}
window.__archive={getFiltered:()=>filtered,getColumns:()=>virtual.columns||4,getRowStep:()=>{const grid=$('#game-grid'),s=grid?getComputedStyle(grid):null;return(virtual.cardHeight||300)+(s?parseFloat(s.rowGap)||23:23);},getCardHeight:()=>virtual.cardHeight,renderGames:force=>renderGames(force),scrollToGameIndex:index=>{const grid=$('#game-grid');if(!grid||!filtered.length)return;const style=getComputedStyle(grid),columns=Math.max(1,style.gridTemplateColumns.split(' ').filter(Boolean).length),rowGap=parseFloat(style.rowGap)||23,rowStep=(virtual.cardHeight||300)+rowGap,gridTop=grid.getBoundingClientRect().top+window.scrollY,row=Math.floor(index/columns),targetTop=gridTop+row*rowStep,viewTop=window.scrollY,viewBottom=viewTop+window.innerHeight;if(targetTop<viewTop+140){window.scrollTo({top:Math.max(0,targetTop-150),behavior:'instant'});renderGames(true);}else if(targetTop+rowStep>viewBottom-100){window.scrollTo({top:targetTop+rowStep-window.innerHeight+140,behavior:'instant'});renderGames(true);}}};
function scheduleVirtualRender(){if(virtualFrame)return;virtualFrame=requestAnimationFrame(()=>{virtualFrame=0;if(catalog)renderGames();});}
function stopVideo(){if(activeHls){activeHls.destroy();activeHls=null;}const video=$('#video-player video');if(video){video.pause();video.removeAttribute('src');video.load();}}
function closeDetail(){stopVideo();closeLightbox();detailToken++;dialog.close();document.body.style.overflow='';if(location.hash.startsWith('#game/'))history.replaceState(null,'','#library');}
async function openDetail(id){if(!byId.has(id))return;recentGames=[id,...recentGames.filter(gameId=>gameId!==id)].slice(0,30);savePersonal();if(activeTab==='recent')applyFilters();else renderCollections();const token=++detailToken;if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';$('#detail-inner').innerHTML='<button class="detail-close" data-close aria-label="Đóng chi tiết">×</button><div class="detail-loading">Đang mở trò chơi…</div>';history.replaceState(null,'',`#game/${encodeURIComponent(id)}`);try{let g=detailCache.get(id);if(!g){const response=await fetch(`./data/games/${encodeURIComponent(id)}.json`);if(!response.ok)throw Error('Không thể tải dữ liệu game.');g=await response.json();detailCache.set(id,g);}if(token!==detailToken)return;renderDetail(g);}catch(error){if(token!==detailToken)return;$('#detail-inner').innerHTML=`<button class="detail-close" data-close aria-label="Đóng">×</button><div class="detail-loading">${esc(error.message)}<br><button class="button ghost" data-game="${esc(id)}">Thử lại</button></div>`;}}
function renderDetail(g){activeGame=g;const c=g.content||{},m=c.media||{},vi=c.locales?.vi||{},en=c.locales?.en||{};const hasVi=['translated','reviewed'].includes(vi.status)&&Boolean(vi.detailedDescription||vi.shortDescription);const text=hasVi?vi:en;const description=text.detailedDescription||text.shortDescription||g.sourceProfile?.shortDescription;const shots=m.screenshots||[];const cover=shots[0]?.url||m.images?.find(i=>i.role==='header')?.url||g.imageUrl;const allShots=shots.length?shots:(cover?[{thumbnailUrl:cover,url:cover}]:[]);const yes=v=>v===true?'Có':v===false?'Không':'Chưa xác định';const control={full:'Đầy đủ',partial:'Một phần',unknown:'Chưa xác định'}[g.controllerSupport]||'Chưa xác định';const labels=[...(g.genres||[]),...(g.steamTags||[])].filter((v,i,a)=>a.indexOf(v)===i).slice(0,12),status=gameStatuses[g.id]||'';const isInstalled=installedAppIds.has(String(g.steamAppId));$('#detail-inner').innerHTML=`<button class="detail-close" data-close aria-label="Đóng chi tiết">×</button><div class="detail-cover" id="detail-cover"></div><div class="detail-content"><div class="eyebrow orange">HỒ SƠ GAME · STEAM ${esc(g.steamAppId)}</div><h2>${esc(g.name)}</h2><div class="detail-tags">${labels.map(t=>`<span>${esc(tagLabel(t))}</span>`).join('')}</div><div class="detail-actions">${isInstalled?`<a class="button primary play-button" href="steam://run/${esc(g.steamAppId)}"><span class="play-icon">▶</span> CHƠI NGAY (Steam)</a><a class="button ghost" href="${esc(steamAppUrl(g.steamAppId))}">Mở trang Steam</a>`:`<a class="button primary" href="${esc(steamAppUrl(g.steamAppId))}">Mở trong ứng dụng Steam</a>`}${allShots.length?`<button type="button" class="button ghost gallery-open-btn" data-open-gallery aria-label="Xem ${allShots.length} ảnh gameplay"><span class="gallery-icon">🖼</span> Xem ảnh (${allShots.length})</button>`:''}</div>${isInstalled?'<div class="installed-banner">✔ Trò chơi đã được cài đặt sẵn trên máy tính của bạn</div>':''}<div class="detail-facts"><div><label>HỖ TRỢ TAY CẦM</label><strong>${control}</strong></div><div><label>LOCAL CO-OP</label><strong>${yes(g.playerModes?.localCoop)}</strong></div><div><label>ONLINE CO-OP</label><strong>${yes(g.playerModes?.onlineCoop)}</strong></div><div><label>WINDOWS TỐI THIỂU</label><strong>${esc(g.storage?.windowsMinimumDisplay||'Chưa có dữ liệu')}</strong></div></div><div class="viethoa-section" id="viethoa-section"><div class="viethoa-header"><div class="viethoa-title-group"><span class="viethoa-flag">🇻🇳</span><h3>Bản dịch Tiếng Việt (Việt Hóa)</h3></div><div class="viethoa-header-actions"><button type="button" class="viethoa-config-trigger" id="btn-viethoa-config" title="Cấu hình nguồn tra cứu Việt Hóa">⚙ Cấu hình nguồn</button></div></div><div class="viethoa-search-bar"><div class="viethoa-input-wrap"><input type="text" id="viethoa-search-input" value="${esc(cleanTitleForSearch(g.name))}" placeholder="Tên game để tìm Việt Hóa…" aria-label="Tên game tìm Việt Hóa"><button type="button" class="viethoa-clear-btn" id="viethoa-input-clear" title="Xóa từ khóa">×</button></div><select id="viethoa-source-select" aria-label="Chọn nguồn tìm kiếm Việt Hóa"></select><button type="button" class="button primary viethoa-search-btn" id="btn-run-viethoa-search">🔍 Tìm kiếm</button></div><div id="viethoa-results-container" class="viethoa-results-container"></div><div id="viethoa-config-panel" class="viethoa-config-panel" hidden><div class="viethoa-config-header"><h4>⚙ Cấu hình nguồn tìm kiếm Việt Hóa</h4><button type="button" class="viethoa-config-close" id="btn-viethoa-config-close">✕</button></div><p class="viethoa-config-tip">Bạn có thể cấu hình URL API tìm kiếm trả về danh sách JSON (mặc định: <code>https://theredteam.vn/list-search.php?q=</code>).</p><div id="viethoa-sources-list" class="viethoa-sources-list"></div><form id="viethoa-add-source-form" class="viethoa-add-form"><div class="viethoa-form-row"><input type="text" id="new-source-name" placeholder="Tên nguồn (vd: The Red Team)" required><input type="url" id="new-source-search" placeholder="URL tìm kiếm (vd: https://theredteam.vn/list-search.php?q=)" required></div><div class="viethoa-form-row"><input type="url" id="new-source-base" placeholder="Base URL bài viết (vd: https://theredteam.vn/)" required><button type="submit" class="button primary">＋ Thêm nguồn</button></div></form><div class="viethoa-config-actions"><button type="button" class="button ghost" id="btn-reset-viethoa-sources">Khôi phục mặc định</button></div></div></div><h3>Về trò chơi</h3><div class="language-note">${hasVi?(vi.status==='reviewed'?'Bản tiếng Việt đã duyệt.':'Bản dịch tiếng Việt tham khảo, chưa được duyệt.'):'Mô tả gốc từ Steam. Bản tiếng Việt đang được bổ sung.'}${c.status==='pending_collection'?' Mô tả chi tiết và media đang được thu thập.':''}${c.identityStatus==='needs_verification'?' Liên kết tên game với App ID cần được xác minh thêm.':''}</div><p class="description-text">${esc(description||'Chưa có mô tả công khai cho trò chơi này.')}</p>${hasVi&&en.detailedDescription?`<details><summary class="text-button">Xem mô tả gốc tiếng Anh</summary><p class="description-text">${esc(en.detailedDescription)}</p></details>`:''}<h3>Ảnh gameplay <span class="text-button">${allShots.length} ảnh</span></h3>${allShots.length?`<div class="gallery" id="gameplay-gallery">${allShots.map((s,i)=>`<button type="button" class="gallery-item" data-view-shot="${i}" aria-label="Xem ảnh ${i+1} của ${esc(g.name)}">${image(s.thumbnailUrl||s.url,`${g.name} — ảnh ${i+1}`,'loading="lazy"')}<span class="gallery-zoom-badge">🔍 Phóng to</span></button>`).join('')}</div>`:'<p class="source-note">Chưa có ảnh gameplay trong dữ liệu đã thu thập.</p>'}${m.images?.some(i=>i.role==='description')?`<h3>Hình ảnh giới thiệu</h3><div class="gallery">${m.images.filter(i=>i.role==='description').map((img,i)=>`<button type="button" class="gallery-item" data-view-desc-img="${i}" aria-label="Xem ảnh giới thiệu ${i+1}">${image(img.url,img.alt||g.name,'loading="lazy"')}<span class="gallery-zoom-badge">🔍 Phóng to</span></button>`).join('')}</div>`:''}<h3>Trailer & video</h3>${m.videos?.length?`<p class="source-note">Chọn trailer để phát. Video giữ nguyên âm thanh và phụ đề từ nguồn Steam.</p><div id="video-player"></div><div class="video-list">${m.videos.map((v,i)=>`<button class="video-link" data-play-video="${i}">${image(v.thumbnailUrl,v.name||'Trailer','loading="lazy"')}<span>▶</span>${esc(v.name||'Xem trailer')}</button>`).join('')}</div>`:'<p class="source-note">Chưa có video trong dữ liệu đã thu thập.</p>'}<p class="source-note">Nhà phát triển: ${esc(g.sourceProfile?.developers?.join(', ')||'Chưa có dữ liệu')}<br>Nền tảng: ${esc((g.platforms||[]).join(', ')||'Chưa có dữ liệu')}<br>Ảnh và video thuộc chủ sở hữu tương ứng. Dữ liệu cập nhật từ JSON thư viện${c.fetchedAt?' · '+new Date(c.fetchedAt).toLocaleDateString('vi-VN'):''}.</p></div>`;$('#detail-cover').style.backgroundImage=`url(${JSON.stringify(safeUrl(cover))})`;imageFallbacks(dialog);dialog.scrollTop=0;const steamBtn=dialog.querySelector('a[href^="steam://"]');if(steamBtn&&document.body.classList.contains('gamepad-mode')){setTimeout(()=>{steamBtn.focus();document.querySelectorAll('.gamepad-focus').forEach(el=>el.classList.remove('gamepad-focus'));steamBtn.classList.add('gamepad-focus');},30);}initViethoaSection(g);}
async function openSteamUrl(url,linkEl){if(linkEl){const orig=linkEl.dataset.origText||linkEl.textContent;linkEl.dataset.origText=orig;linkEl.classList.add('steam-launching');linkEl.textContent='Đang mở Steam…';setTimeout(()=>{linkEl.textContent=orig;linkEl.classList.remove('steam-launching');},1800);}try{const res=await fetch(`/api/open-steam?url=${encodeURIComponent(url)}`,{cache:'no-store'});if(res.ok){const data=await res.json();if(data?.ok)return;}}catch(_){}try{window.location.assign(url);}catch(_){try{window.location.href=url;}catch(_){}}}

function openLightbox(images,index,triggerEl){
  if(!images||!images.length)return;
  currentLightboxImages=images;
  currentLightboxIndex=Math.max(0,Math.min(index,images.length-1));
  lightboxReturnFocus=triggerEl||document.activeElement;
  updateLightboxImage();
  const lb=$('#lightbox');
  if(lb){
    if(typeof lb.showModal==='function'&&!lb.open){
      try{lb.showModal();}catch(_){lb.setAttribute('open','');}
    }else if(!lb.open){
      lb.setAttribute('open','');
    }
    const backBtn=lb.querySelector('.lightbox-back-btn')||lb.querySelector('#lightbox-next');
    if(backBtn&&document.body.classList.contains('gamepad-mode')){
      backBtn.focus();
    }
  }
}
function updateLightboxImage(){
  if(!currentLightboxImages.length)return;
  const item=currentLightboxImages[currentLightboxIndex];
  const img=$('#lightbox-img'),counter=$('#lightbox-counter'),fullLink=$('#lightbox-full-link');
  if(img){img.src=safeUrl(item.url);img.alt=item.alt||'Ảnh gameplay';}
  if(counter)counter.textContent=`${currentLightboxIndex+1} / ${currentLightboxImages.length}`;
  if(fullLink)fullLink.href=safeUrl(item.url);
  const prevBtn=$('#lightbox-prev'),nextBtn=$('#lightbox-next');
  if(prevBtn)prevBtn.disabled=currentLightboxImages.length<=1;
  if(nextBtn)nextBtn.disabled=currentLightboxImages.length<=1;
}
function closeLightbox(){
  const lb=$('#lightbox');
  if(!lb||!lb.open)return;
  if(typeof lb.close==='function'&&lb.open){
    try{lb.close();}catch(_){}
  }
  lb.removeAttribute('open');
  const img=$('#lightbox-img');if(img)img.src='';
  currentLightboxImages=[];
  if(lightboxReturnFocus?.isConnected)lightboxReturnFocus.focus();
}
function nextLightboxImage(){
  if(currentLightboxImages.length<=1)return;
  currentLightboxIndex=(currentLightboxIndex+1)%currentLightboxImages.length;
  updateLightboxImage();
}
function prevLightboxImage(){
  if(currentLightboxImages.length<=1)return;
  currentLightboxIndex=(currentLightboxIndex-1+currentLightboxImages.length)%currentLightboxImages.length;
  updateLightboxImage();
}
window.__lightbox={close:closeLightbox,next:nextLightboxImage,prev:prevLightboxImage};
const _lbDialog=$('#lightbox');
if(_lbDialog){
  _lbDialog.addEventListener('cancel',event=>{event.preventDefault();closeLightbox();});
  _lbDialog.addEventListener('click',event=>{if(event.target===_lbDialog)closeLightbox();});
}

async function checkInstalledGames(){
  try{
    const res=await fetch('/api/installed-games',{cache:'no-store'});
    if(res.ok){
      const data=await res.json();
      if(data?.ok&&Array.isArray(data.installedAppIds)&&data.installedAppIds.length>0){
        installedAppIds=new Set(data.installedAppIds.map(String));
        writeStorage(storageKeys.installed,[...installedAppIds]);
        if(catalog){
          const installedIds=catalog.games.filter(g=>installedAppIds.has(String(g.steamAppId))).map(g=>g.id);
          tabSets.set('installed',new Set(installedIds));
          const heroInstalled=$('#hero-installed');
          if(heroInstalled)heroInstalled.textContent=num(installedIds.length);
          renderCollections();
          renderChips();
          renderGames(true);
        }
      }
    }
  }catch(_){}
}

document.addEventListener('click',event=>{
  const viethoaBtn=event.target.closest('#btn-run-viethoa-search');
  if(viethoaBtn){
    event.preventDefault();
    const q=$('#viethoa-search-input')?.value||'';
    const srcId=$('#viethoa-source-select')?.value||'theredteam';
    runViethoaSearch(q,srcId);
    return;
  }
  const clearBtn=event.target.closest('#viethoa-input-clear');
  if(clearBtn){
    const inp=$('#viethoa-search-input');
    if(inp){inp.value='';inp.focus();}
    return;
  }
  const cfgBtn=event.target.closest('#btn-viethoa-config');
  if(cfgBtn){
    const panel=$('#viethoa-config-panel');
    if(panel)panel.hidden=!panel.hidden;
    return;
  }
  const closeCfg=event.target.closest('#btn-viethoa-config-close');
  if(closeCfg){
    const panel=$('#viethoa-config-panel');
    if(panel)panel.hidden=true;
    return;
  }
  const delSource=event.target.closest('[data-delete-source]');
  if(delSource){
    const id=delSource.dataset.deleteSource;
    let list=getViethoaSources().filter(s=>s.id!==id);
    if(!list.length)list=[...DEFAULT_VIETHOA_SOURCES];
    saveViethoaSources(list);
    renderViethoaSourcesList();
    const sel=$('#viethoa-source-select');
    if(sel){sel.innerHTML=list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');}
    return;
  }
  const rstSources=event.target.closest('#btn-reset-viethoa-sources');
  if(rstSources){
    saveViethoaSources([...DEFAULT_VIETHOA_SOURCES]);
    renderViethoaSourcesList();
    const sel=$('#viethoa-source-select');
    if(sel){sel.innerHTML=DEFAULT_VIETHOA_SOURCES.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');}
    return;
  }
  const retryBtn=event.target.closest('[data-viethoa-retry]');
  if(retryBtn){
    const kw=retryBtn.dataset.viethoaRetry;
    const inp=$('#viethoa-search-input');
    if(inp)inp.value=kw;
    const srcId=$('#viethoa-source-select')?.value||'theredteam';
    runViethoaSearch(kw,srcId);
    return;
  }
  const steamLink=event.target.closest('a[href^="steam://"]');
  if(steamLink){event.preventDefault();openSteamUrl(steamLink.getAttribute('href'),steamLink);return;}
  const lbClose=event.target.closest('[data-lightbox-close]');
  if(lbClose){event.preventDefault();closeLightbox();return;}
  const lbPrev=event.target.closest('#lightbox-prev');
  if(lbPrev){event.preventDefault();prevLightboxImage();return;}
  const lbNext=event.target.closest('#lightbox-next');
  if(lbNext){event.preventDefault();nextLightboxImage();return;}
  const openGallery=event.target.closest('[data-open-gallery]');
  if(openGallery){
    event.preventDefault();
    const m=activeGame?.content?.media||{};
    const shots=m.screenshots||[];
    const cover=shots[0]?.url||m.images?.find(i=>i.role==='header')?.url||activeGame?.imageUrl;
    const allShots=shots.length?shots:(cover?[{thumbnailUrl:cover,url:cover}]:[]);
    const images=allShots.map((s,i)=>({url:s.url,alt:`${activeGame?.name||'Game'} — ảnh ${i+1}`}));
    openLightbox(images,0,openGallery);
    return;
  }
  const shotBtn=event.target.closest('[data-view-shot]');
  if(shotBtn){
    event.preventDefault();
    const idx=Number(shotBtn.dataset.viewShot);
    const m=activeGame?.content?.media||{};
    const shots=m.screenshots||[];
    const cover=shots[0]?.url||m.images?.find(i=>i.role==='header')?.url||activeGame?.imageUrl;
    const allShots=shots.length?shots:(cover?[{thumbnailUrl:cover,url:cover}]:[]);
    const images=allShots.map((s,i)=>({url:s.url,alt:`${activeGame?.name||'Game'} — ảnh ${i+1}`}));
    openLightbox(images,idx,shotBtn);
    return;
  }
  const descImgBtn=event.target.closest('[data-view-desc-img]');
  if(descImgBtn){
    event.preventDefault();
    const idx=Number(descImgBtn.dataset.viewDescImg);
    const imgs=(activeGame?.content?.media?.images||[]).filter(i=>i.role==='description');
    const images=imgs.map((img,i)=>({url:img.url,alt:img.alt||`${activeGame?.name||'Game'} — ảnh ${i+1}`}));
    openLightbox(images,idx,descImgBtn);
    return;
  }
  const sortBtn=event.target.closest('[data-tag-sort]');
  if(sortBtn){
    const mode=sortBtn.dataset.tagSort;
    if(mode!==tagSortMode){
      tagSortMode=mode;
      document.querySelectorAll('[data-tag-sort]').forEach(b=>b.classList.toggle('active',b.dataset.tagSort===mode));
      renderSidebarTags($('#sidebar-tag-search')?.value||'');
    }
    return;
  }
  const sidebarTag=event.target.closest('[data-sidebar-tag]');
  if(sidebarTag){
    const tagName=sidebarTag.dataset.sidebarTag;
    toggleTag(tagName,!selectedTags.has(tagName));
    return;
  }
  const play=event.target.closest('[data-play-video]');
  if(play){playVideo(Number(play.dataset.playVideo));return;}
  const close=event.target.closest('[data-close]');
  if(close){closeDetail();return;}
  const favorite=event.target.closest('[data-favorite]');
  if(favorite){
    const id=favorite.dataset.favorite;
    if(favorites.has(id))favorites.delete(id);else favorites.add(id);
    savePersonal();renderCollections();
    if(activeTab==='favorites')applyFilters();else renderGames(true);
    return;
  }
  const removeTag=event.target.closest('[data-remove-tag]');
  if(removeTag){
    selectedTags.delete(removeTag.dataset.removeTag);
    resetVirtual();renderSelectedFilters();renderSidebarTags($('#sidebar-tag-search')?.value||'');savePreferences();applyFilters();
    return;
  }
  const removeGenre=event.target.closest('[data-remove-genre]');
  if(removeGenre){
    selectedGenres.delete(removeGenre.dataset.removeGenre);
    resetVirtual();renderChips();savePreferences();applyFilters();
    return;
  }
  const genreButton=event.target.closest('[data-filter-genre-button]');
  if(genreButton){
    const id=genreButton.dataset.filterGenreButton;
    toggleGenre(id,!selectedGenres.has(id));
    return;
  }
  const game=event.target.closest('[data-game]');
  if(game){openDetail(game.dataset.game);return;}
  const tab=event.target.closest('[data-select-tab],[data-tab]');
  if(tab){event.preventDefault();selectTab(tab.dataset.selectTab||tab.dataset.tab,true);return;}
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDetail();}});
document.addEventListener('keydown',event=>{
  if(event.target.matches('#viethoa-search-input')&&event.key==='Enter'){
    event.preventDefault();
    const q=event.target.value;
    const srcId=$('#viethoa-source-select')?.value||'theredteam';
    runViethoaSearch(q,srcId);
    return;
  }
  const lb=$('#lightbox');
  if(lb&&lb.open){
    if(event.key==='Escape'||event.key==='Backspace'){event.preventDefault();closeLightbox();return;}
    if(event.key==='ArrowRight'||event.key==='d'||event.key==='D'){event.preventDefault();nextLightboxImage();return;}
    if(event.key==='ArrowLeft'||event.key==='a'||event.key==='A'){event.preventDefault();prevLightboxImage();return;}
  }
  if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
    event.preventDefault();$('#search').focus();$('#library').scrollIntoView({behavior:'smooth'});
  }
});
document.addEventListener('change',event=>{
  if(event.target.matches('#viethoa-source-select')){
    const q=$('#viethoa-search-input')?.value||'';
    runViethoaSearch(q,event.target.value);
  }
  if(event.target.matches('[data-game-status]')){
    const id=event.target.dataset.gameStatus,value=event.target.value;
    if(value)gameStatuses[id]=value;else delete gameStatuses[id];
    savePersonal();renderCollections();
    if(activeTab.startsWith('status-'))applyFilters();
  }
});
document.addEventListener('submit',event=>{
  const addForm=event.target.closest('#viethoa-add-source-form');
  if(addForm){
    event.preventDefault();
    const name=$('#new-source-name')?.value.trim();
    const sUrl=$('#new-source-search')?.value.trim();
    const bUrl=$('#new-source-base')?.value.trim()||'https://theredteam.vn/';
    if(name&&sUrl){
      const list=getViethoaSources();
      const newId='custom_'+Date.now();
      list.push({id:newId,name,searchUrl:sUrl,baseUrl:bUrl});
      saveViethoaSources(list);
      renderViethoaSourcesList();
      const sel=$('#viethoa-source-select');
      if(sel){
        sel.innerHTML=list.map(s=>`<option value="${esc(s.id)}" ${s.id===newId?'selected':''}>${esc(s.name)}</option>`).join('');
      }
      $('#new-source-name').value='';
      $('#new-source-search').value='';
      $('#new-source-base').value='';
      const q=$('#viethoa-search-input')?.value||'';
      runViethoaSearch(q,newId);
    }
  }
});
$('#search').addEventListener('input',()=>{resetVirtual();if(catalog)applyFilters();});
$('#sidebar-tag-search')?.addEventListener('input',event=>{if(catalog)renderSidebarTags(event.target.value);});
$('#sort').addEventListener('change',()=>{resetVirtual();savePreferences();if(catalog)applyFilters();});
$('#reset').addEventListener('click',()=>{
  $('#search').value='';
  selectedTags.clear();
  selectedGenres.clear();
  const st=$('#sidebar-tag-search');if(st)st.value='';
  
  $('#sort').value='featured';
  tagSortMode='alpha';
  document.querySelectorAll('[data-tag-sort]').forEach(b=>b.classList.toggle('active',b.dataset.tagSort==='alpha'));
  resetVirtual();
  if(catalog){
    renderSidebarTags();
    renderChips();
    renderSelectedFilters();
    savePreferences();
  }
  selectTab('all');
});
$('#back-to-top').addEventListener('click',()=>$('#library').scrollIntoView({behavior:'smooth'}));
window.addEventListener('scroll',()=>{
  const btn=$('#back-to-top');if(btn)btn.hidden=window.scrollY<500;
  scheduleVirtualRender();clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>writeStorage(storageKeys.scroll,window.scrollY),150);
},{passive:true});
window.addEventListener('resize',()=>{resetVirtual();renderGames(true);},{passive:true});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#game/'))openDetail(decodeURIComponent(location.hash.slice(6)));else if(dialog.open)closeDetail();});

const dailySlogans=[
  "Mỗi ngày thức dậy là một cơ hội để bắt đầu dịu dàng hơn.",
  "Không cần đi thật nhanh, chỉ cần đừng ngừng tin vào con đường của mình.",
  "Cuộc sống không đòi hỏi bạn hoàn hảo, chỉ cần bạn chân thành với chính mình.",
  "Những điều tốt đẹp thường lớn lên trong im lặng.",
  "Hôm nay có thể bình thường, nhưng vẫn là một phần quý giá của đời bạn.",
  "Điều đáng nhớ nhất không phải đích đến, mà là con người bạn trở thành trên đường đi.",
  "Có những ngày chỉ cần bình yên thôi cũng đã là một thành tựu.",
  "Đừng để một khoảnh khắc khó khăn định nghĩa cả hành trình dài.",
  "Bạn không cần sống giống ai để cuộc đời mình có ý nghĩa.",
  "Trưởng thành là học cách yêu cả những ngày chưa trọn vẹn.",
  "Một lựa chọn nhỏ hôm nay có thể mở ra một ngày mai rất khác.",
  "Cuộc đời rộng hơn nỗi buồn mà bạn đang mang.",
  "Hãy giữ lại trong mình một nơi mà hy vọng luôn có thể quay về.",
  "Thời gian không vội; bạn cũng không cần phải vội.",
  "Có những câu trả lời chỉ xuất hiện khi lòng mình đủ lặng.",
  "Hạnh phúc đôi khi chỉ là nhận ra mình đang có mặt trong khoảnh khắc này.",
  "Bạn được phép thay đổi để gần hơn với con người mình mong muốn.",
  "Ngày mới không xóa chuyện cũ, nhưng luôn cho ta một cách nhìn mới.",
  "Mọi hành trình đáng giá đều bắt đầu từ một bước rất nhỏ.",
  "Đừng quên ngước nhìn bầu trời khi cuộc sống khiến bạn chỉ nhìn xuống.",
  "Có thể bạn chưa đến nơi, nhưng bạn đã đi xa hơn mình tưởng.",
  "Cuộc sống dịu lại khi ta thôi cố kiểm soát mọi điều.",
  "Một trái tim biết biết ơn luôn tìm thấy ánh sáng giữa ngày thường.",
  "Đi chậm không có nghĩa là đi sai đường.",
  "Những điều thuộc về bạn sẽ đến vào lúc bạn đủ sẵn sàng.",
  "Mỗi mùa của cuộc đời đều có vẻ đẹp riêng, kể cả mùa chờ đợi.",
  "Đôi khi buông xuống không phải từ bỏ, mà là tự trả lại bình yên.",
  "Đừng so chương đầu của mình với chương cuối của người khác.",
  "Bạn có quyền viết lại câu chuyện đời mình từ bất kỳ trang nào.",
  "Sống sâu sắc không cần ồn ào; chỉ cần mỗi ngày hiểu mình thêm một chút.",
  "Can đảm không phải không sợ, mà là vẫn bước tiếp dù lòng còn run.",
  "Hãy làm điều có thể hôm nay; ngày mai sẽ tiếp nối phần còn lại.",
  "Bạn không cần nhìn thấy cả con đường để bước bước đầu tiên.",
  "Mọi tiến bộ, dù nhỏ đến đâu, đều xứng đáng được ghi nhận.",
  "Ước mơ lớn được xây bằng những ngày bình thường không bỏ cuộc.",
  "Đừng chờ cảm hứng; hãy bắt đầu, rồi cảm hứng sẽ tìm đến.",
  "Sự kiên trì âm thầm hôm nay sẽ trở thành sức mạnh ngày mai.",
  "Nếu chưa thành công, bạn vẫn đang thu thập kinh nghiệm để thành công.",
  "Không ai có thể bước thay bạn, nhưng bạn cũng không cần bước một mình.",
  "Một lần thử nữa có thể là khoảng cách giữa bỏ cuộc và bứt phá.",
  "Bạn mạnh hơn mỗi lần tự đứng dậy sau một ngày khó khăn.",
  "Hãy tập trung vào bước kế tiếp, đừng để quãng đường dài làm mình nản lòng.",
  "Điều bạn làm đều đặn quan trọng hơn điều bạn chỉ làm khi có hứng.",
  "Đừng thu nhỏ ước mơ chỉ vì hôm nay bạn đang mệt.",
  "Thành công bền vững thường mang dáng vẻ của sự kiên nhẫn.",
  "Mỗi sai lầm là một bài học đã trả học phí; hãy mang nó theo thật xứng đáng.",
  "Bạn không thất bại khi phải bắt đầu lại với nhiều kinh nghiệm hơn.",
  "Khó khăn không đóng cửa tương lai; nó chỉ yêu cầu một cách đi khác.",
  "Hãy trở thành người mà chính bạn của ngày bé sẽ tự hào.",
  "Đừng đánh giá sức mạnh của mình bằng cảm giác mệt mỏi hôm nay.",
  "Có kỷ luật với mục tiêu và dịu dàng với chính mình.",
  "Một ngày làm tốt hơn một chút cũng là một ngày đáng giá.",
  "Không cần chứng minh với tất cả mọi người; kết quả sẽ tự lên tiếng.",
  "Thử thách chỉ là một phần của hành trình, không phải toàn bộ câu chuyện.",
  "Khi chưa biết bắt đầu từ đâu, hãy bắt đầu từ điều nhỏ nhất.",
  "Giới hạn hôm qua không nhất thiết là giới hạn của hôm nay.",
  "Bạn xứng đáng với tương lai mà mình đang kiên trì xây dựng.",
  "Đường khó không có nghĩa là bạn chọn sai; đôi khi đó là đường dẫn đến trưởng thành.",
  "Hãy để hành động của hôm nay trở thành lời cảm ơn gửi đến tương lai.",
  "Chậm một nhịp để lấy lại sức vẫn tốt hơn bỏ hẳn cuộc hành trình.",
  "Nếu hôm nay quá nặng, hãy chỉ mang theo điều thật sự cần thiết.",
  "Bạn được phép mệt, được phép nghỉ, và vẫn xứng đáng được yêu thương.",
  "Không sao nếu hôm nay bạn chỉ làm được một nửa; một nửa vẫn hơn là không có gì.",
  "Nỗi buồn không làm bạn yếu đuối; nó cho thấy trái tim bạn đã từng rất chân thành.",
  "Có những ngày sống sót qua thôi cũng đã là một chiến thắng.",
  "Bạn không cần ổn ngay lập tức; chữa lành chưa bao giờ là một cuộc đua.",
  "Hãy nói với mình bằng sự tử tế mà bạn vẫn dành cho người khác.",
  "Mây rồi sẽ trôi; bầu trời trong bạn vẫn luôn còn đó.",
  "Nếu không thể vui, hãy cho phép mình được yên.",
  "Bạn không phải gồng lên mọi lúc mới được xem là mạnh mẽ.",
  "Nghỉ ngơi không phải lười biếng; đó là cách trái tim lấy lại nhịp điệu.",
  "Những vết thương đang lành không cần phải xin lỗi vì chúng cần thời gian.",
  "Ngày hôm nay khó khăn không có nghĩa ngày mai cũng sẽ như vậy.",
  "Dù chưa ai nói, bạn đã cố gắng rất nhiều rồi.",
  "Có thể bạn chưa nhìn thấy ánh sáng, nhưng bình minh vẫn đang đến.",
  "Đừng tự trách mình vì đã không biết điều mà ngày ấy bạn chưa từng được học.",
  "Bạn không cô đơn trong cảm giác tưởng như chỉ mình bạn hiểu.",
  "Một trái tim từng vỡ vẫn có thể học cách nở hoa lần nữa.",
  "Đôi khi điều dũng cảm nhất là thừa nhận rằng mình cần được giúp đỡ.",
  "Hôm nay hãy đặt xuống một điều khiến lòng mình nặng thêm.",
  "Không phải mọi khoảng lặng đều trống rỗng; có khoảng lặng đang chữa lành bạn.",
  "Bạn không cần có câu trả lời cho tất cả mọi chuyện ngay hôm nay.",
  "Cứ thở chậm thôi; khoảnh khắc này rồi cũng sẽ đi qua.",
  "Điều đã xảy ra là một phần của bạn, nhưng không phải toàn bộ con người bạn.",
  "Hãy ôm lấy phiên bản đang mệt mỏi thay vì trách nó chưa đủ tốt.",
  "Bạn vẫn đáng quý ngay cả trong những ngày không tạo ra điều gì.",
  "Có những nỗi đau chỉ cần được lắng nghe, không cần vội sửa chữa.",
  "Cho mình thêm một ngày; đôi khi hy vọng cần thời gian để kịp nảy mầm.",
  "Bạn không cần bước ra khỏi bóng tối một mình.",
  "Sau tất cả, việc bạn vẫn ở đây đã là một điều rất đáng trân trọng.",
  "Bình an bắt đầu khi ta thôi tranh cãi với những điều không thể đổi thay.",
  "Hít vào sự nhẹ nhàng, thở ra những điều không còn cần giữ.",
  "Một căn phòng yên, một tách nước ấm và một trái tim thảnh thơi cũng là hạnh phúc.",
  "Không phải ngày nào cũng cần rực rỡ; có ngày chỉ cần dịu dàng.",
  "Hãy để tâm trí nghỉ bên những điều đơn giản và chân thật.",
  "Khi lòng đủ tĩnh, ta sẽ nghe được điều mình thật sự cần.",
  "Bình yên không ở nơi không có sóng, mà ở cách ta đi qua những con sóng.",
  "Bạn không cần mang mọi chuyện của ngày mai vào buổi tối hôm nay.",
  "Thả lỏng đôi vai; thế giới vẫn tiếp tục dù bạn nghỉ một lát.",
  "Một ngày chậm rãi cũng có thể là một ngày đầy đủ.",
  "Giữ lòng nhẹ, bước chân sẽ tự nhiên thanh thản.",
  "Đừng để tiếng ồn bên ngoài lớn hơn tiếng nói bình yên bên trong.",
  "Mọi thứ không cần hoàn hảo để khoảnh khắc này trở nên đẹp đẽ.",
  "Sự bình thản là món quà bạn có thể tự trao cho mình mỗi ngày.",
  "Hãy dành một khoảng lặng cho tâm hồn được trở về nhà.",
  "Có những điều nên để gió mang đi, không cần giữ lại trong lòng.",
  "Bình yên đến khi ta biết điều gì nên giữ và điều gì nên buông.",
  "Chỉ cần hiện diện trọn vẹn, một phút bình thường cũng hóa thành quý giá.",
  "Ngủ một giấc thật sâu; ngày mai hãy bắt đầu bằng một trái tim nhẹ hơn.",
  "Bạn không cần thắng mọi cuộc tranh luận để có một đời sống an nhiên.",
  "Hãy chọn những điều nuôi dưỡng tâm hồn, không chỉ lấp đầy thời gian.",
  "Sáng nay, hãy để ánh nắng chạm vào những nơi trong bạn đang cần ấm áp.",
  "Bớt một kỳ vọng, lòng có thêm một khoảng trời.",
  "Đôi khi câu trả lời tốt nhất là im lặng, mỉm cười và bước tiếp.",
  "Mong bạn đủ vững vàng trước sóng gió và đủ mềm mại trước yêu thương.",
  "Ngày bình yên không phải ngày không có việc, mà là ngày lòng không quá vội.",
  "Hãy uống nước, thở sâu và cho mình vài phút không phải trở thành ai cả.",
  "Tâm hồn cũng cần khoảng trống để ánh sáng có thể đi vào.",
  "Điều gì đến, hãy đón; điều gì đi, hãy tiễn bằng một lòng biết ơn.",
  "Cuối cùng, nơi bình yên nhất vẫn là khi bạn được sống đúng với chính mình."
];
function showDailySlogan(){const now=new Date(),day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000),slogan=dailySlogans[day%dailySlogans.length];$('#daily-slogan').textContent=slogan;const welcomeSlogan=$('#welcome-slogan');if(welcomeSlogan)welcomeSlogan.textContent=slogan;}
function startWelcome(){const welcome=$('#welcome-screen'),skip=$('#welcome-skip');if(!welcome)return;document.body.classList.add('welcome-active');let dismissed=false;const finish=()=>{if(dismissed)return;dismissed=true;clearTimeout(timer);document.removeEventListener('keydown',onKey);welcome.classList.add('is-leaving');document.body.classList.remove('welcome-active');setTimeout(()=>welcome.remove(),800);};const onKey=event=>{if(['Enter',' ','Escape'].includes(event.key)){event.preventDefault();finish();}};skip?.addEventListener('click',finish,{once:true});document.addEventListener('keydown',onKey);const timer=setTimeout(finish,matchMedia('(prefers-reduced-motion: reduce)').matches?700:3600);}
async function loadRandomHero(){const candidates=featured.map(appId=>catalog.games.find(g=>g.steamAppId===appId)).filter(Boolean);if(!candidates.length)return;const last=readStorage(storageKeys.hero,'');const pool=candidates.filter(g=>g.steamAppId!==last);const hero=pool[Math.floor(Math.random()*pool.length)]||candidates[0];writeStorage(storageKeys.hero,hero.steamAppId);try{const response=await fetch(`./data/games/${encodeURIComponent(hero.id)}.json`);if(!response.ok)return;const g=await response.json();detailCache.set(g.id,g);const shot=g.content?.media?.screenshots?.[0]?.url;if(!shot)return;const preload=new Image();preload.onload=()=>{$('#hero-art').style.backgroundImage=`url(${JSON.stringify(safeUrl(shot))})`;};preload.src=safeUrl(shot);}catch{}}
async function init(){$('#game-grid').innerHTML=Array.from({length:8},()=>'<div class="skeleton"></div>').join('');showDailySlogan();try{const response=await fetch('./data/catalog.json');if(!response.ok)throw Error('Không tải được thư viện.');catalog=await response.json();byId=new Map(catalog.games.map(g=>[g.id,g]));tabSets=new Map(catalog.tabs.map(t=>[t.id,new Set(t.gameIds)]));catalog.games.forEach(g=>g.searchKey=norm([g.name,g.steamAppId,...(g.genres||[]).flatMap(t=>[t,viGenres[t]||t]),...(g.steamTags||[]).flatMap(t=>[t,tagLabel(t)])].join(' ')));for(const id of savedPreferences.genres||[])if(tabSets.has(id))selectedGenres.add(id);const validTags=new Set(catalog.tags.map(t=>t.name));for(const name of savedPreferences.tags||[])if(validTags.has(name))selectedTags.add(name);if([...$('#sort').options].some(o=>o.value===savedPreferences.sort))$('#sort').value=savedPreferences.sort;renderSidebarTags();const installedIds=catalog.games.filter(g=>installedAppIds.has(String(g.steamAppId))).map(g=>g.id);tabSets.set('installed',new Set(installedIds));$('#hero-total').textContent=num(catalog.games.length);const heroInstalled=$('#hero-installed');if(heroInstalled)heroInstalled.textContent=num(installedIds.length);$('#hero-genres').textContent=num(catalog.tags.length);$('#hero-coop').textContent=num(tabSets.get('local-controller')?.size||0);$('#updated-at').textContent='Cập nhật '+new Date(catalog.metadata.steamTags?.updatedAt||catalog.metadata.content?.updatedAt||catalog.metadata.updatedAt).toLocaleDateString('vi-VN');renderCollections();renderChips();applyFilters();loadRandomHero();checkInstalledGames();if(location.hash.startsWith('#game/'))openDetail(decodeURIComponent(location.hash.slice(6)));else{const savedScroll=Number(readStorage(storageKeys.scroll,0))||0;if(savedScroll)setTimeout(()=>{window.scrollTo(0,savedScroll);scheduleVirtualRender();},80);}}catch(error){$('#game-grid').innerHTML=`<div class="error">${esc(error.message)}<br><button class="button ghost" id="retry-load">Tải lại thư viện</button></div>`;$('#result-count').textContent='Không thể tải';$('#retry-load').addEventListener('click',init);}}
startWelcome();init();

function playVideo(index){stopVideo();const movie=activeGame?.content?.media?.videos?.[index];if(!movie)return;const host=$('#video-player');const source=movie.sources?.find(s=>s.format==='mp4')||movie.sources?.find(s=>s.format==='webm')||movie.sources?.find(s=>s.format==='hls_h264');if(!source){host.innerHTML='<p class="language-note">Nguồn video này chưa phát trực tiếp được. Bạn có thể mở game trong ứng dụng Steam.</p>';return;}host.innerHTML='<video controls playsinline style="width:100%;max-height:420px;background:#000;border-radius:4px" aria-label="Trailer game"></video><p class="source-note">Nếu video không tải được, chọn “Mở trong ứng dụng Steam” ở đầu hồ sơ.</p>';const video=host.querySelector('video');video.poster=safeUrl(movie.thumbnailUrl);const url=safeUrl(source.url);if(source.format==='hls_h264'&&!video.canPlayType('application/vnd.apple.mpegurl')&&window.Hls?.isSupported()){activeHls=new Hls();activeHls.loadSource(url);activeHls.attachMedia(video);activeHls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));activeHls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)host.querySelector('p').textContent='Không tải được video từ nguồn. Bạn vẫn có thể mở game trong ứng dụng Steam.';});}else{video.src=url;video.play().catch(()=>{});}host.scrollIntoView({behavior:'smooth',block:'nearest'});}

document.addEventListener('archive:gamepad-category',event=>{if(!catalog||dialog.open)return;const ids=['all','installed','local-controller','controller','local-coop','online-coop'].filter(id=>tabSets.has(id));const position=Math.max(0,ids.indexOf(activeTab));const next=(position+event.detail.direction+ids.length)%ids.length;selectTab(ids[next],true);});
