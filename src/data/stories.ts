import type { HSKLevel } from '../types'

/**
 * Truyện ngắn theo cấp HSK cho mục "Truyện".
 * Nguồn: truyện tự viết cho app, hoặc kể lại bằng lời mới các ngụ ngôn / điển tích cổ đã thuộc phạm vi công cộng
 * (Hàn Phi Tử, Mạnh Tử, Trang Tử, Liệt Tử, Chiến Quốc Sách, Hoài Nam Tử, Lã Thị Xuân Thu, Tân Tự, ngụ ngôn Aesop).
 * Không chép truyện từ giáo trình có bản quyền.
 * Ảnh bìa: public/stories/<id>.svg, sinh bởi scripts/build-story-covers.mjs.
 */
export type StorySource = 'original' | 'fable' | 'idiom'

export interface StoryWord {
  hanzi: string
  pinyin: string
  vi: string
}

export interface Story {
  id: string
  level: HSKLevel
  title: string
  title_vi: string
  title_en: string
  source: StorySource
  /** Xuất xứ (tiếng Việt), vd "Hàn Phi Tử" */
  origin?: string
  /** Bài học rút ra (tiếng Việt) */
  moral_vi?: string
  words: StoryWord[]
  /** Các đoạn; mỗi đoạn là danh sách câu [chữ Hán, nghĩa tiếng Việt] */
  paragraphs: [string, string][][]
}

export const stories: Story[] = [
  // ---------------- HSK 1 ----------------
  {
    id: 'my-cat',
    level: 1,
    title: '我的猫',
    title_vi: 'Con mèo của tôi',
    title_en: 'My cat',
    source: 'original',
    words: [
      { hanzi: '猫', pinyin: 'māo', vi: 'con mèo' },
      { hanzi: '漂亮', pinyin: 'piàoliang', vi: 'xinh đẹp' },
      { hanzi: '鱼', pinyin: 'yú', vi: 'con cá' },
      { hanzi: '椅子', pinyin: 'yǐzi', vi: 'cái ghế' },
      { hanzi: '睡觉', pinyin: 'shuìjiào', vi: 'ngủ' },
      { hanzi: '喜欢', pinyin: 'xǐhuan', vi: 'thích' },
    ],
    paragraphs: [
      [
        ['我家有一只猫。', 'Nhà tôi có một con mèo.'],
        ['它叫小白。', 'Nó tên là Tiểu Bạch.'],
        ['小白很小，也很漂亮。', 'Tiểu Bạch rất nhỏ, cũng rất xinh.'],
      ],
      [
        ['小白喜欢吃鱼。', 'Tiểu Bạch thích ăn cá.'],
        ['它不喜欢喝水。', 'Nó không thích uống nước.'],
        ['每天下午，它在椅子上睡觉。', 'Chiều nào nó cũng ngủ trên ghế.'],
      ],
      [
        ['我回家的时候，小白来看我。', 'Khi tôi về nhà, Tiểu Bạch chạy ra nhìn tôi.'],
        ['我很喜欢我的猫。', 'Tôi rất thích con mèo của tôi.'],
      ],
    ],
  },
  {
    id: 'xiaoming-day',
    level: 1,
    title: '小明的一天',
    title_vi: 'Một ngày của Tiểu Minh',
    title_en: "Xiaoming's day",
    source: 'original',
    words: [
      { hanzi: '学生', pinyin: 'xuésheng', vi: 'học sinh' },
      { hanzi: '学校', pinyin: 'xuéxiào', vi: 'trường học' },
      { hanzi: '汉语', pinyin: 'Hànyǔ', vi: 'tiếng Hán' },
      { hanzi: '饭馆', pinyin: 'fànguǎn', vi: 'quán ăn' },
      { hanzi: '电视', pinyin: 'diànshì', vi: 'tivi' },
      { hanzi: '晚上', pinyin: 'wǎnshang', vi: 'buổi tối' },
    ],
    paragraphs: [
      [
        ['小明是一个学生，他住在北京。', 'Tiểu Minh là một học sinh, cậu sống ở Bắc Kinh.'],
        ['上午八点，小明去学校。', 'Tám giờ sáng, Tiểu Minh đến trường.'],
        ['他在学校学习汉语。', 'Cậu học tiếng Trung ở trường.'],
      ],
      [
        ['中午，他和同学在饭馆吃饭。', 'Buổi trưa, cậu và bạn học ăn cơm ở quán.'],
        ['他们吃米饭，喝茶。', 'Họ ăn cơm, uống trà.'],
      ],
      [
        ['下午五点，小明回家。', 'Năm giờ chiều, Tiểu Minh về nhà.'],
        ['他看电视，也看书。', 'Cậu xem tivi, cũng đọc sách.'],
        ['晚上十点，他睡觉了。', 'Mười giờ tối, cậu đi ngủ.'],
      ],
    ],
  },
  {
    id: 'rainy-day',
    level: 1,
    title: '下雨了',
    title_vi: 'Trời mưa rồi',
    title_en: "It's raining",
    source: 'original',
    words: [
      { hanzi: '星期六', pinyin: 'xīngqīliù', vi: 'thứ Bảy' },
      { hanzi: '天气', pinyin: 'tiānqì', vi: 'thời tiết' },
      { hanzi: '商店', pinyin: 'shāngdiàn', vi: 'cửa hàng' },
      { hanzi: '下雨', pinyin: 'xià yǔ', vi: 'mưa' },
      { hanzi: '没关系', pinyin: 'méi guānxi', vi: 'không sao' },
      { hanzi: '高兴', pinyin: 'gāoxìng', vi: 'vui' },
    ],
    paragraphs: [
      [
        ['今天是星期六。', 'Hôm nay là thứ Bảy.'],
        ['上午天气很好，不冷也不热。', 'Buổi sáng trời rất đẹp, không lạnh cũng không nóng.'],
        ['我和妈妈去商店买东西。', 'Tôi và mẹ đi cửa hàng mua đồ.'],
      ],
      [
        ['下午，下雨了。', 'Buổi chiều, trời mưa.'],
        ['我们在商店里看雨。', 'Hai mẹ con ở trong cửa hàng ngắm mưa.'],
        ['妈妈说：“没关系，我们喝杯茶吧。”', 'Mẹ nói: "Không sao, mình uống tách trà nhé."'],
      ],
      [
        ['我们喝了茶，雨也不下了。', 'Uống trà xong thì mưa cũng tạnh.'],
        ['我们高高兴兴地回家了。', 'Hai mẹ con vui vẻ về nhà.'],
      ],
    ],
  },
  {
    id: 'good-friend',
    level: 1,
    title: '我的好朋友',
    title_vi: 'Người bạn tốt của tôi',
    title_en: 'My good friend',
    source: 'original',
    words: [
      { hanzi: '朋友', pinyin: 'péngyou', vi: 'bạn bè' },
      { hanzi: '中国人', pinyin: 'Zhōngguó rén', vi: 'người Trung Quốc' },
      { hanzi: '会', pinyin: 'huì', vi: 'biết (làm gì)' },
      { hanzi: '做菜', pinyin: 'zuò cài', vi: 'nấu ăn' },
      { hanzi: '好吃', pinyin: 'hǎochī', vi: 'ngon' },
      { hanzi: '电影', pinyin: 'diànyǐng', vi: 'phim' },
    ],
    paragraphs: [
      [
        ['我有一个好朋友，她叫王丽。', 'Tôi có một người bạn tốt, cô ấy tên là Vương Lệ.'],
        ['她是中国人，今年二十岁。', 'Cô ấy là người Trung Quốc, năm nay hai mươi tuổi.'],
        ['她会说汉语，也会说一点儿越南语。', 'Cô ấy nói được tiếng Trung, cũng nói được một chút tiếng Việt.'],
      ],
      [
        ['王丽很喜欢做菜。', 'Vương Lệ rất thích nấu ăn.'],
        ['她做的中国菜很好吃。', 'Món Trung Quốc cô ấy nấu rất ngon.'],
        ['星期天，我去她家吃饭。', 'Chủ nhật, tôi đến nhà cô ấy ăn cơm.'],
      ],
      [
        ['我们一起看电影，说汉语。', 'Chúng tôi cùng xem phim, nói tiếng Trung.'],
        ['谢谢你，我的好朋友！', 'Cảm ơn bạn, người bạn tốt của tôi!'],
      ],
    ],
  },

  // ---------------- HSK 2 ----------------
  {
    id: 'stump-rabbit',
    level: 2,
    title: '守株待兔',
    title_vi: 'Ôm cây đợi thỏ',
    title_en: 'Waiting by the stump for a hare',
    source: 'idiom',
    origin: 'Hàn Phi Tử',
    moral_vi: 'Đừng trông chờ vào may mắn; muốn có thành quả thì phải chăm chỉ làm việc.',
    words: [
      { hanzi: '从前', pinyin: 'cóngqián', vi: 'ngày xưa' },
      { hanzi: '兔子', pinyin: 'tùzi', vi: 'con thỏ' },
      { hanzi: '树', pinyin: 'shù', vi: 'cái cây' },
      { hanzi: '旁边', pinyin: 'pángbiān', vi: 'bên cạnh' },
      { hanzi: '等', pinyin: 'děng', vi: 'đợi' },
      { hanzi: '可是', pinyin: 'kěshì', vi: 'nhưng' },
    ],
    paragraphs: [
      [
        ['从前，有一个人每天在地里工作。', 'Ngày xưa, có một người ngày nào cũng làm việc ngoài đồng.'],
        ['地里有一棵大树。', 'Ngoài đồng có một cái cây lớn.'],
      ],
      [
        ['有一天，一只兔子跑得太快，没看见大树，就死在了树下。', 'Một hôm, một con thỏ chạy quá nhanh, không nhìn thấy cái cây, thế là chết ngay dưới gốc.'],
        ['这个人很高兴，他想：“我不工作也有兔子吃！”', 'Người này rất vui, nghĩ bụng: "Mình không làm việc cũng có thỏ ăn!"'],
      ],
      [
        ['从那天起，他每天坐在树旁边，等兔子。', 'Từ hôm đó, ngày nào ông ta cũng ngồi cạnh cái cây, đợi thỏ.'],
        ['可是，再也没有兔子来了。', 'Nhưng chẳng có con thỏ nào đến nữa.'],
        ['最后，他什么也没有得到。', 'Cuối cùng, ông ta chẳng được gì cả.'],
      ],
    ],
  },
  {
    id: 'tortoise-hare',
    level: 2,
    title: '龟兔赛跑',
    title_vi: 'Rùa và thỏ chạy thi',
    title_en: 'The tortoise and the hare',
    source: 'fable',
    origin: 'Ngụ ngôn Aesop',
    moral_vi: 'Chậm mà chắc, kiên trì từng bước sẽ thắng sự chủ quan.',
    words: [
      { hanzi: '乌龟', pinyin: 'wūguī', vi: 'con rùa' },
      { hanzi: '比赛', pinyin: 'bǐsài', vi: 'cuộc thi' },
      { hanzi: '一会儿', pinyin: 'yíhuìr', vi: 'một lát' },
      { hanzi: '休息', pinyin: 'xiūxi', vi: 'nghỉ ngơi' },
      { hanzi: '已经', pinyin: 'yǐjīng', vi: 'đã' },
      { hanzi: '慢', pinyin: 'màn', vi: 'chậm' },
    ],
    paragraphs: [
      [
        ['兔子跑得很快，它常常笑乌龟走得慢。', 'Thỏ chạy rất nhanh, nó hay cười rùa đi chậm.'],
        ['有一天，乌龟说：“我们比一比吧！”', 'Một hôm, rùa nói: "Chúng ta thi một lần xem!"'],
      ],
      [
        ['比赛开始了。兔子跑得非常快，一会儿就看不见乌龟了。', 'Cuộc thi bắt đầu. Thỏ chạy rất nhanh, một lát đã không thấy rùa đâu.'],
        ['兔子想：“乌龟太慢了，我先睡一会儿吧。”', 'Thỏ nghĩ: "Rùa chậm quá, mình ngủ một lát đã."'],
      ],
      [
        ['乌龟一直往前走，没有休息。', 'Rùa cứ đi về phía trước, không nghỉ.'],
        ['兔子醒了以后，乌龟已经到了。', 'Khi thỏ tỉnh dậy, rùa đã về đích rồi.'],
      ],
      [['乌龟笑着说：“慢一点儿没关系，不要停下来。”', 'Rùa cười nói: "Chậm một chút không sao, miễn là đừng dừng lại."']],
    ],
  },
  {
    id: 'wolf-is-coming',
    level: 2,
    title: '狼来了',
    title_vi: 'Sói đến rồi',
    title_en: 'The boy who cried wolf',
    source: 'fable',
    origin: 'Ngụ ngôn Aesop',
    moral_vi: 'Nói dối nhiều lần sẽ mất lòng tin của mọi người, kể cả khi mình nói thật.',
    words: [
      { hanzi: '孩子', pinyin: 'háizi', vi: 'đứa trẻ' },
      { hanzi: '羊', pinyin: 'yáng', vi: 'con cừu, dê' },
      { hanzi: '狼', pinyin: 'láng', vi: 'con sói' },
      { hanzi: '大声', pinyin: 'dà shēng', vi: 'to tiếng' },
      { hanzi: '帮', pinyin: 'bāng', vi: 'giúp' },
      { hanzi: '相信', pinyin: 'xiāngxìn', vi: 'tin tưởng' },
    ],
    paragraphs: [
      [
        ['山上有一个孩子，他每天在山上看羊。', 'Có một cậu bé ngày nào cũng chăn cừu trên núi.'],
        ['他觉得很没意思。', 'Cậu thấy rất chán.'],
      ],
      [
        ['有一天，他大声叫：“狼来了！狼来了！”', 'Một hôm, cậu hét to: "Sói đến rồi! Sói đến rồi!"'],
        ['山下的人都跑上山来帮他。', 'Người dưới núi đều chạy lên giúp cậu.'],
        ['可是没有狼，孩子笑了。', 'Nhưng chẳng có con sói nào, cậu bé bật cười.'],
      ],
      [['第二天，他又这样叫，大家又跑来了，还是没有狼。', 'Hôm sau cậu lại hét như thế, mọi người lại chạy đến, vẫn không có sói.']],
      [
        ['第三天，狼真的来了！', 'Ngày thứ ba, sói đến thật!'],
        ['孩子大声叫：“狼来了！”可是这次没有人来。', 'Cậu hét to: "Sói đến rồi!" Nhưng lần này không ai đến.'],
        ['因为大家都不相信他了。', 'Vì mọi người không còn tin cậu nữa.'],
      ],
    ],
  },
  {
    id: 'birthday-gift',
    level: 2,
    title: '生日礼物',
    title_vi: 'Món quà sinh nhật',
    title_en: 'The birthday gift',
    source: 'original',
    words: [
      { hanzi: '生日', pinyin: 'shēngrì', vi: 'sinh nhật' },
      { hanzi: '礼物', pinyin: 'lǐwù', vi: 'món quà' },
      { hanzi: '贵', pinyin: 'guì', vi: 'đắt' },
      { hanzi: '路上', pinyin: 'lù shang', vi: 'trên đường' },
      { hanzi: '花', pinyin: 'huā', vi: 'hoa' },
      { hanzi: '开心', pinyin: 'kāixīn', vi: 'vui vẻ' },
    ],
    paragraphs: [
      [
        ['明天是妈妈的生日。', 'Ngày mai là sinh nhật mẹ.'],
        ['小红想给妈妈买一个礼物，可是她只有十块钱。', 'Tiểu Hồng muốn mua cho mẹ một món quà, nhưng em chỉ có mười đồng.'],
      ],
      [
        ['她去商店看了看，好看的东西都很贵。', 'Em đến cửa hàng xem, đồ đẹp nào cũng đắt.'],
        ['回家的路上，她看见路边有很多花。', 'Trên đường về, em thấy bên đường có rất nhiều hoa.'],
      ],
      [
        ['小红想了想，用这些花和一张红纸，做了一张生日卡。', 'Tiểu Hồng nghĩ một lúc, rồi dùng những bông hoa ấy và một tờ giấy đỏ làm một tấm thiệp sinh nhật.'],
        ['她在卡上写：“妈妈，我爱你！”', 'Em viết lên thiệp: "Mẹ ơi, con yêu mẹ!"'],
      ],
      [
        ['第二天，妈妈看到生日卡，笑得非常开心。', 'Hôm sau, mẹ nhìn thấy tấm thiệp, cười rất tươi.'],
        ['妈妈说：“这是我最喜欢的礼物。”', 'Mẹ nói: "Đây là món quà mẹ thích nhất."'],
      ],
    ],
  },

  // ---------------- HSK 3 ----------------
  {
    id: 'frog-in-well',
    level: 3,
    title: '井底之蛙',
    title_vi: 'Ếch ngồi đáy giếng',
    title_en: 'The frog in the well',
    source: 'idiom',
    origin: 'Trang Tử',
    moral_vi: 'Đừng tưởng những gì mình thấy là cả thế giới; hãy mở rộng tầm mắt.',
    words: [
      { hanzi: '井', pinyin: 'jǐng', vi: 'cái giếng' },
      { hanzi: '青蛙', pinyin: 'qīngwā', vi: 'con ếch' },
      { hanzi: '生活', pinyin: 'shēnghuó', vi: 'cuộc sống' },
      { hanzi: '经过', pinyin: 'jīngguò', vi: 'đi qua' },
      { hanzi: '吃惊', pinyin: 'chījīng', vi: 'kinh ngạc' },
      { hanzi: '世界', pinyin: 'shìjiè', vi: 'thế giới' },
    ],
    paragraphs: [
      [
        ['一口老井里住着一只青蛙。', 'Trong một cái giếng cũ có một con ếch sống.'],
        ['它每天在井里游泳、唱歌，觉得自己的生活非常好。', 'Ngày nào nó cũng bơi lội, ca hát trong giếng, thấy cuộc sống của mình thật tuyệt.'],
      ],
      [
        ['有一天，一只从大海来的海龟经过井边。', 'Một hôm, một con rùa biển từ biển lớn đi ngang qua miệng giếng.'],
        ['青蛙对它说：“你快下来看看吧！我的家又大又漂亮。”', 'Ếch nói với nó: "Bạn mau xuống đây xem đi! Nhà tôi vừa rộng vừa đẹp."'],
      ],
      [
        ['海龟想进去，可是井太小了，它的脚都放不进去。', 'Rùa biển muốn vào, nhưng giếng nhỏ quá, đến cái chân cũng không lọt.'],
        ['海龟说：“你见过大海吗？大海比你的井大几万倍，一眼看不到边。”', 'Rùa biển nói: "Bạn đã thấy biển bao giờ chưa? Biển lớn hơn giếng của bạn mấy vạn lần, nhìn mãi không thấy bờ."'],
      ],
      [
        ['青蛙听了，非常吃惊。', 'Ếch nghe xong vô cùng kinh ngạc.'],
        ['它这才知道，原来世界这么大。', 'Đến lúc này nó mới biết, hóa ra thế giới rộng lớn đến vậy.'],
      ],
    ],
  },
  {
    id: 'pulling-seedlings',
    level: 3,
    title: '拔苗助长',
    title_vi: 'Nhổ mạ giúp lúa lớn',
    title_en: 'Pulling seedlings to help them grow',
    source: 'idiom',
    origin: 'Mạnh Tử',
    moral_vi: 'Mọi việc đều có quy luật riêng; nóng vội muốn nhanh thì chỉ hỏng việc.',
    words: [
      { hanzi: '种', pinyin: 'zhòng', vi: 'trồng' },
      { hanzi: '长', pinyin: 'zhǎng', vi: 'lớn lên' },
      { hanzi: '办法', pinyin: 'bànfǎ', vi: 'cách, biện pháp' },
      { hanzi: '拔', pinyin: 'bá', vi: 'nhổ, kéo lên' },
      { hanzi: '累', pinyin: 'lèi', vi: 'mệt' },
      { hanzi: '马上', pinyin: 'mǎshàng', vi: 'lập tức' },
    ],
    paragraphs: [
      [
        ['古时候，有一个人在地里种了很多小苗。', 'Thời xưa, có một người trồng rất nhiều cây mạ ngoài ruộng.'],
        ['他每天都去看，总觉得小苗长得太慢了。', 'Ngày nào ông cũng ra xem, lúc nào cũng thấy mạ lớn quá chậm.'],
      ],
      [
        ['他想了很久，终于想出了一个办法。', 'Ông nghĩ rất lâu, cuối cùng nghĩ ra một cách.'],
        ['他走进地里，把每一棵小苗都往上拔高了一点儿。', 'Ông lội xuống ruộng, kéo từng cây mạ lên cao thêm một chút.'],
      ],
      [
        ['他忙了一天，回到家，累极了。', 'Ông bận rộn cả ngày, về đến nhà thì mệt lử.'],
        ['他高兴地对家里人说：“今天我帮小苗长高了！”', 'Ông vui vẻ nói với người nhà: "Hôm nay tôi đã giúp mạ lớn cao rồi!"'],
      ],
      [
        ['他的儿子听了，马上跑到地里去看。', 'Con trai ông nghe vậy, lập tức chạy ra ruộng xem.'],
        ['可是，地里的小苗都已经死了。', 'Nhưng mạ ngoài ruộng đã chết hết cả rồi.'],
      ],
    ],
  },
  {
    id: 'fox-and-crow',
    level: 3,
    title: '狐狸和乌鸦',
    title_vi: 'Cáo và quạ',
    title_en: 'The fox and the crow',
    source: 'fable',
    origin: 'Ngụ ngôn Aesop',
    moral_vi: 'Hãy cẩn thận với những lời nịnh hót.',
    words: [
      { hanzi: '乌鸦', pinyin: 'wūyā', vi: 'con quạ' },
      { hanzi: '肉', pinyin: 'ròu', vi: 'thịt' },
      { hanzi: '狐狸', pinyin: 'húli', vi: 'con cáo' },
      { hanzi: '声音', pinyin: 'shēngyīn', vi: 'giọng, âm thanh' },
      { hanzi: '掉', pinyin: 'diào', vi: 'rơi' },
      { hanzi: '明白', pinyin: 'míngbai', vi: 'hiểu ra' },
    ],
    paragraphs: [
      [['一只乌鸦找到了一块肉，它站在树上，准备好好吃一顿。', 'Một con quạ tìm được một miếng thịt, nó đậu trên cành, chuẩn bị ăn một bữa thật ngon.']],
      [
        ['一只狐狸从树下经过，看见了那块肉，也很想吃。', 'Một con cáo đi ngang dưới gốc cây, nhìn thấy miếng thịt, cũng thèm lắm.'],
        ['狐狸笑着说：“乌鸦小姐，您真漂亮！”', 'Cáo cười nói: "Cô quạ ơi, cô thật xinh đẹp!"'],
        ['“听说您的声音也很好听，能为我唱一首歌吗？”', '"Nghe nói giọng cô cũng rất hay, cô hát cho tôi nghe một bài được không?"'],
      ],
      [
        ['乌鸦听了非常高兴，就张开嘴唱了起来。', 'Quạ nghe xong rất sướng, liền há miệng cất tiếng hát.'],
        ['它一张嘴，肉就掉了下去。', 'Nó vừa há miệng, miếng thịt liền rơi xuống.'],
      ],
      [
        ['狐狸马上把肉放进嘴里，跑得远远的。', 'Cáo lập tức đớp lấy miếng thịt, chạy biến đi thật xa.'],
        ['乌鸦这才明白，好听的话不一定是真话。', 'Lúc ấy quạ mới hiểu, lời hay chưa chắc đã là lời thật.'],
      ],
    ],
  },

  // ---------------- HSK 4 ----------------
  {
    id: 'snake-legs',
    level: 4,
    title: '画蛇添足',
    title_vi: 'Vẽ rắn thêm chân',
    title_en: 'Drawing legs on a snake',
    source: 'idiom',
    origin: 'Chiến Quốc Sách',
    moral_vi: 'Làm thừa những việc không cần thiết có khi làm hỏng cả việc.',
    words: [
      { hanzi: '剩下', pinyin: 'shèngxià', vi: 'còn lại' },
      { hanzi: '商量', pinyin: 'shāngliang', vi: 'bàn bạc' },
      { hanzi: '得意', pinyin: 'déyì', vi: 'đắc ý' },
      { hanzi: '抢', pinyin: 'qiǎng', vi: 'giành, cướp' },
      { hanzi: '本来', pinyin: 'běnlái', vi: 'vốn dĩ' },
      { hanzi: '根本', pinyin: 'gēnběn', vi: 'hoàn toàn (không)' },
    ],
    paragraphs: [
      [
        ['有一次，一位主人请客，最后只剩下一壶酒。', 'Có lần, một ông chủ mời khách, cuối cùng chỉ còn lại một bình rượu.'],
        ['客人们商量：“这壶酒几个人喝不够，一个人喝才痛快。”', 'Các vị khách bàn nhau: "Bình rượu này mấy người uống thì không đủ, một người uống mới đã."'],
        ['“我们来比赛画蛇，谁先画好，酒就归谁。”', '"Chúng ta thi vẽ rắn, ai vẽ xong trước thì rượu thuộc về người đó."'],
      ],
      [
        ['有一个人很快就画好了。', 'Có một người vẽ xong rất nhanh.'],
        ['他拿起酒壶，得意地说：“你们太慢了，我还有时间给蛇画几只脚呢！”', 'Anh ta cầm bình rượu lên, đắc ý nói: "Các anh chậm quá, tôi còn thừa thời gian vẽ thêm mấy cái chân cho rắn đây!"'],
      ],
      [
        ['他正在画脚的时候，另一个人也画好了。', 'Lúc anh ta đang vẽ chân thì một người khác cũng vẽ xong.'],
        ['那个人把酒壶抢了过去，说：“蛇本来就没有脚，你画的根本不是蛇！”', 'Người kia giật lấy bình rượu, nói: "Rắn vốn dĩ không có chân, thứ anh vẽ đâu phải là rắn!"'],
        ['说完，他就把酒喝了。', 'Nói xong, người đó uống cạn bình rượu.'],
      ],
      [['那个先画好的人，最后什么也没有得到。', 'Người vẽ xong trước, rốt cuộc chẳng được gì.']],
    ],
  },
  {
    id: 'fox-borrows-tiger',
    level: 4,
    title: '狐假虎威',
    title_vi: 'Cáo mượn oai hùm',
    title_en: 'The fox borrows the tiger’s might',
    source: 'idiom',
    origin: 'Chiến Quốc Sách',
    moral_vi: 'Chỉ kẻ dựa vào thế lực của người khác để dọa nạt, ra oai.',
    words: [
      { hanzi: '森林', pinyin: 'sēnlín', vi: 'rừng' },
      { hanzi: '紧张', pinyin: 'jǐnzhāng', vi: 'căng thẳng, hoảng' },
      { hanzi: '怀疑', pinyin: 'huáiyí', vi: 'nghi ngờ' },
      { hanzi: '于是', pinyin: 'yúshì', vi: 'thế là' },
      { hanzi: '赶紧', pinyin: 'gǎnjǐn', vi: 'vội vàng' },
      { hanzi: '以为', pinyin: 'yǐwéi', vi: 'tưởng rằng' },
      { hanzi: '其实', pinyin: 'qíshí', vi: 'thực ra' },
    ],
    paragraphs: [
      [
        ['森林里，一只老虎抓住了一只狐狸，准备吃掉它。', 'Trong rừng, một con hổ bắt được một con cáo, định ăn thịt nó.'],
        ['狐狸一点儿也不紧张，大声说：“你敢吃我？我是天帝派来管理森林的！”', 'Cáo chẳng hề hoảng hốt, nói to: "Ngươi dám ăn ta à? Ta là do Thiên Đế phái xuống cai quản khu rừng này!"'],
      ],
      [
        ['老虎有点儿怀疑。', 'Hổ có phần nghi ngờ.'],
        ['狐狸接着说：“如果你不相信，就跟在我后面走一走，看看动物们是不是都怕我。”', 'Cáo nói tiếp: "Nếu ngươi không tin, cứ đi theo sau ta một vòng, xem muông thú có sợ ta không."'],
      ],
      [
        ['于是，狐狸走在前面，老虎跟在后面。', 'Thế là cáo đi trước, hổ theo sau.'],
        ['兔子、小鹿、猴子看见它们，都吓得赶紧逃走了。', 'Thỏ, nai con, khỉ nhìn thấy chúng đều sợ hãi vội vàng bỏ chạy.'],
      ],
      [
        ['老虎以为动物们真的怕狐狸，就把它放了。', 'Hổ tưởng muông thú thật sự sợ cáo, bèn thả nó ra.'],
        ['其实，它们怕的是狐狸后面的老虎。', 'Thực ra, thứ chúng sợ là con hổ đi sau lưng cáo.'],
      ],
    ],
  },
  {
    id: 'mend-the-pen',
    level: 4,
    title: '亡羊补牢',
    title_vi: 'Mất cừu mới lo sửa chuồng',
    title_en: 'Mending the pen after losing a sheep',
    source: 'idiom',
    origin: 'Chiến Quốc Sách',
    moral_vi: 'Sai rồi biết sửa ngay thì vẫn chưa muộn.',
    words: [
      { hanzi: '养', pinyin: 'yǎng', vi: 'nuôi' },
      { hanzi: '发现', pinyin: 'fāxiàn', vi: 'phát hiện' },
      { hanzi: '原来', pinyin: 'yuánlái', vi: 'hóa ra' },
      { hanzi: '邻居', pinyin: 'línjū', vi: 'hàng xóm' },
      { hanzi: '后悔', pinyin: 'hòuhuǐ', vi: 'hối hận' },
      { hanzi: '修', pinyin: 'xiū', vi: 'sửa' },
    ],
    paragraphs: [
      [
        ['从前有个人养了很多羊。', 'Ngày xưa có một người nuôi rất nhiều cừu.'],
        ['一天早上，他发现少了一只羊。', 'Một buổi sáng, anh ta phát hiện mất một con cừu.'],
        ['原来羊圈破了一个洞，狼晚上从洞里进来，把羊带走了。', 'Hóa ra chuồng cừu bị thủng một lỗ, đêm qua sói chui vào từ lỗ đó và bắt mất con cừu.'],
      ],
      [
        ['邻居劝他：“快把羊圈修好吧！”', 'Hàng xóm khuyên: "Mau sửa lại chuồng cừu đi!"'],
        ['他却说：“羊已经丢了，还修羊圈有什么用呢？”', 'Anh ta lại nói: "Cừu mất rồi, sửa chuồng thì còn ích gì?"'],
      ],
      [
        ['第二天早上，他发现又少了一只羊。', 'Sáng hôm sau, anh ta phát hiện lại mất thêm một con.'],
        ['这时候他才后悔，想起了邻居的话。', 'Lúc này anh ta mới hối hận, nhớ lại lời hàng xóm.'],
      ],
      [
        ['他马上把洞堵上，把羊圈修得结结实实。', 'Anh lập tức bịt lỗ lại, sửa chuồng thật chắc chắn.'],
        ['从那以后，他的羊再也没有丢过。', 'Từ đó về sau, đàn cừu của anh không bao giờ bị mất nữa.'],
      ],
    ],
  },

  // ---------------- HSK 5 ----------------
  {
    id: 'old-man-horse',
    level: 5,
    title: '塞翁失马',
    title_vi: 'Tái ông mất ngựa',
    title_en: 'The old man who lost his horse',
    source: 'idiom',
    origin: 'Hoài Nam Tử',
    moral_vi: 'Họa phúc khó lường: chuyện xấu có thể hóa tốt, chuyện tốt cũng có thể hóa xấu.',
    words: [
      { hanzi: '突然', pinyin: 'tūrán', vi: 'đột nhiên' },
      { hanzi: '安慰', pinyin: 'ānwèi', vi: 'an ủi' },
      { hanzi: '平静', pinyin: 'píngjìng', vi: 'bình thản' },
      { hanzi: '祝贺', pinyin: 'zhùhè', vi: 'chúc mừng' },
      { hanzi: '结果', pinyin: 'jiéguǒ', vi: 'kết quả là' },
      { hanzi: '战争', pinyin: 'zhànzhēng', vi: 'chiến tranh' },
      { hanzi: '几乎', pinyin: 'jīhū', vi: 'hầu như' },
    ],
    paragraphs: [
      [
        ['古时候，在靠近边塞的地方住着一位老人，大家叫他塞翁。', 'Thời xưa, ở vùng gần biên ải có một ông lão, mọi người gọi ông là Tái ông.'],
        ['有一天，他家的马突然跑丢了。', 'Một hôm, con ngựa nhà ông bỗng chạy mất.'],
        ['邻居们都来安慰他，老人却平静地说：“丢了马，怎么知道不是一件好事呢？”', 'Hàng xóm kéo đến an ủi, ông lão lại bình thản nói: "Mất ngựa, biết đâu lại chẳng phải là chuyện tốt?"'],
      ],
      [
        ['几个月后，那匹马不但自己回来了，还带回了一匹好马。', 'Vài tháng sau, con ngựa ấy không những tự quay về mà còn dẫn theo một con ngựa tốt.'],
        ['邻居们都来祝贺，老人却担心地说：“这怎么知道不会带来麻烦呢？”', 'Hàng xóm đến chúc mừng, ông lão lại lo lắng: "Biết đâu chuyện này lại chẳng mang đến phiền phức?"'],
      ],
      [
        ['老人的儿子很喜欢骑这匹新马，结果有一天从马背上摔下来，把腿摔断了。', 'Con trai ông rất thích cưỡi con ngựa mới, kết quả một hôm ngã từ lưng ngựa xuống, gãy chân.'],
        ['邻居们又来安慰，老人说：“这也不一定是坏事。”', 'Hàng xóm lại đến an ủi, ông lão nói: "Đây cũng chưa chắc là chuyện xấu."'],
      ],
      [
        ['一年后，战争爆发了，年轻人几乎都被叫去打仗，很多人再也没能回来。', 'Một năm sau, chiến tranh nổ ra, trai tráng hầu như đều bị gọi đi đánh trận, nhiều người không bao giờ trở về.'],
        ['老人的儿子因为腿受了伤，不用去打仗，父子俩平平安安地生活了下来。', 'Con trai ông vì bị thương ở chân nên không phải ra trận, hai cha con sống bình an.'],
      ],
    ],
  },
  {
    id: 'foolish-old-man',
    level: 5,
    title: '愚公移山',
    title_vi: 'Ngu Công dời núi',
    title_en: 'The foolish old man moves the mountains',
    source: 'idiom',
    origin: 'Liệt Tử',
    moral_vi: 'Có ý chí và sự kiên trì thì việc khó mấy cũng làm được.',
    words: [
      { hanzi: '挡', pinyin: 'dǎng', vi: 'chắn' },
      { hanzi: '绕', pinyin: 'rào', vi: 'đi vòng' },
      { hanzi: '同意', pinyin: 'tóngyì', vi: 'đồng ý' },
      { hanzi: '嘲笑', pinyin: 'cháoxiào', vi: 'chế giễu' },
      { hanzi: '精神', pinyin: 'jīngshén', vi: 'tinh thần' },
      { hanzi: '感动', pinyin: 'gǎndòng', vi: 'cảm động' },
    ],
    paragraphs: [
      [
        ['从前，有一位九十岁的老人，名叫愚公。', 'Ngày xưa có một ông lão chín mươi tuổi tên là Ngu Công.'],
        ['他家门前有两座大山，挡住了出门的路，家里人每次出门都要绕很远的路。', 'Trước cửa nhà ông có hai ngọn núi lớn chắn lối, mỗi lần ra ngoài cả nhà phải đi vòng rất xa.'],
      ],
      [
        ['有一天，愚公把全家人叫到一起，说：“我们一起把山搬走，好不好？”', 'Một hôm, Ngu Công gọi cả nhà lại, nói: "Chúng ta cùng nhau dời núi đi, được không?"'],
        ['大家都表示同意，第二天就开始挖山，把石头和土运到很远的海边。', 'Mọi người đều đồng ý, hôm sau liền bắt đầu đào núi, chở đá và đất ra tận bờ biển xa.'],
      ],
      [
        ['有一个叫智叟的老人嘲笑他说：“你年纪这么大了，连山上的一棵草都动不了，怎么可能搬走两座大山？”', 'Một ông lão tên Trí Tẩu chế giễu: "Ông già thế rồi, đến ngọn cỏ trên núi còn không nhổ nổi, sao dời được hai ngọn núi lớn?"'],
        ['愚公回答：“我死了，还有儿子；儿子死了，还有孙子。子子孙孙无穷无尽，可是山不会再长高，为什么搬不走呢？”', 'Ngu Công đáp: "Tôi chết thì còn con; con chết thì còn cháu. Con cháu nối đời không bao giờ hết, mà núi thì không cao thêm, cớ sao lại không dời được?"'],
      ],
      [
        ['智叟听了，一句话也说不出来。', 'Trí Tẩu nghe xong, không nói được câu nào.'],
        ['天帝被愚公的精神感动了，派两位神仙把两座山背走了。', 'Thiên Đế cảm động trước tinh thần của Ngu Công, bèn sai hai vị thần cõng hai ngọn núi đi nơi khác.'],
      ],
    ],
  },
  {
    id: 'mark-the-boat',
    level: 5,
    title: '刻舟求剑',
    title_vi: 'Khắc thuyền tìm gươm',
    title_en: 'Marking the boat to find the sword',
    source: 'idiom',
    origin: 'Lã Thị Xuân Thu',
    moral_vi: 'Hoàn cảnh luôn thay đổi; đừng cứng nhắc giữ mãi cách nghĩ cũ.',
    words: [
      { hanzi: '不小心', pinyin: 'bù xiǎoxīn', vi: 'sơ ý' },
      { hanzi: '着急', pinyin: 'zháojí', vi: 'sốt ruột' },
      { hanzi: '记号', pinyin: 'jìhao', vi: 'dấu, ký hiệu' },
      { hanzi: '按照', pinyin: 'ànzhào', vi: 'theo, dựa theo' },
      { hanzi: '移动', pinyin: 'yídòng', vi: 'di chuyển' },
      { hanzi: '糊涂', pinyin: 'hútu', vi: 'hồ đồ' },
    ],
    paragraphs: [
      [
        ['古时候，楚国有一个人坐船过江。', 'Thời xưa, có một người nước Sở đi thuyền qua sông.'],
        ['船到了江中间，他一不小心，把随身带的宝剑掉进了水里。', 'Thuyền ra đến giữa sông, ông ta sơ ý làm rơi thanh bảo kiếm mang theo xuống nước.'],
      ],
      [
        ['船上的人都替他着急，他却不慌不忙地拿出一把小刀，在船边刻了一个记号。', 'Người trên thuyền đều sốt ruột thay, ông ta lại thong thả lấy ra một con dao nhỏ, khắc một dấu lên mạn thuyền.'],
        ['他说：“我的剑是从这儿掉下去的，等船停了，我就从这儿下去找。”', 'Ông nói: "Kiếm của tôi rơi xuống từ chỗ này, đợi thuyền dừng, tôi sẽ xuống ngay chỗ này mà tìm."'],
      ],
      [['船靠岸以后，他按照记号跳进水里，找了半天，却什么也没找到。', 'Thuyền cập bờ, ông theo dấu khắc nhảy xuống nước, tìm mãi mà chẳng thấy gì.']],
      [
        ['船一直在往前走，可是掉进水里的剑却不会跟着船移动。', 'Thuyền thì cứ đi về phía trước, còn thanh kiếm rơi xuống nước đâu có đi theo thuyền.'],
        ['用这样的办法找剑，不是太糊涂了吗？', 'Tìm kiếm bằng cách ấy, chẳng phải quá hồ đồ sao?'],
      ],
    ],
  },

  // ---------------- HSK 6 ----------------
  {
    id: 'lord-ye-dragons',
    level: 6,
    title: '叶公好龙',
    title_vi: 'Diệp Công thích rồng',
    title_en: 'Lord Ye loves dragons',
    source: 'idiom',
    origin: 'Tân Tự',
    moral_vi: 'Chỉ người ngoài miệng nói yêu thích một điều, nhưng thực ra không hề thật lòng.',
    words: [
      { hanzi: '贵族', pinyin: 'guìzú', vi: 'quý tộc' },
      { hanzi: '图案', pinyin: 'tú’àn', vi: 'hoa văn, hình vẽ' },
      { hanzi: '名声', pinyin: 'míngshēng', vi: 'tiếng tăm' },
      { hanzi: '亲自', pinyin: 'qīnzì', vi: 'đích thân' },
      { hanzi: '拜访', pinyin: 'bàifǎng', vi: 'đến thăm' },
      { hanzi: '魂飞魄散', pinyin: 'hún fēi pò sàn', vi: 'hồn bay phách lạc' },
      { hanzi: '失望', pinyin: 'shīwàng', vi: 'thất vọng' },
    ],
    paragraphs: [
      [
        ['春秋时期，有一位贵族叫叶公，他自称非常喜爱龙。', 'Thời Xuân Thu có một vị quý tộc tên là Diệp Công, tự nhận mình vô cùng yêu rồng.'],
        ['他家的墙上画着龙，柱子上刻着龙，连衣服和酒杯上都绣着、雕着龙的图案。', 'Tường nhà ông vẽ rồng, cột nhà khắc rồng, đến cả áo quần và chén rượu cũng thêu, chạm hình rồng.'],
      ],
      [
        ['叶公爱龙的名声越传越远，终于传到了天上真龙的耳朵里。', 'Tiếng tăm yêu rồng của Diệp Công càng lan càng xa, cuối cùng đến tai con rồng thật trên trời.'],
        ['真龙深受感动，决定亲自下凡去拜访这位知音。', 'Rồng thật vô cùng cảm động, quyết định đích thân xuống trần thăm người tri âm ấy.'],
      ],
      [
        ['这一天，真龙从窗户探进头来，尾巴拖在客厅里。', 'Hôm ấy, rồng thật thò đầu vào qua cửa sổ, đuôi kéo dài trong phòng khách.'],
        ['叶公一见，吓得魂飞魄散，脸色惨白，转身就逃，连鞋都跑掉了。', 'Diệp Công vừa trông thấy đã sợ hồn bay phách lạc, mặt cắt không còn giọt máu, quay người bỏ chạy, rơi cả giày.'],
      ],
      [
        ['真龙十分失望。', 'Rồng thật vô cùng thất vọng.'],
        ['原来，叶公喜欢的并不是真正的龙，而只是看起来像龙的东西。', 'Hóa ra thứ Diệp Công thích chẳng phải rồng thật, mà chỉ là những thứ trông giống rồng mà thôi.'],
      ],
    ],
  },
  {
    id: 'spear-and-shield',
    level: 6,
    title: '自相矛盾',
    title_vi: 'Tự mâu thuẫn',
    title_en: 'The spear and the shield',
    source: 'idiom',
    origin: 'Hàn Phi Tử',
    moral_vi: 'Lời nói và việc làm cần nhất quán, đừng tự mâu thuẫn với chính mình.',
    words: [
      { hanzi: '吸引', pinyin: 'xīyǐn', vi: 'thu hút' },
      { hanzi: '坚固', pinyin: 'jiāngù', vi: 'kiên cố, chắc chắn' },
      { hanzi: '锋利', pinyin: 'fēnglì', vi: 'sắc bén' },
      { hanzi: '夸耀', pinyin: 'kuāyào', vi: 'khoe khoang' },
      { hanzi: '忍不住', pinyin: 'rěn bu zhù', vi: 'không nhịn được' },
      { hanzi: '张口结舌', pinyin: 'zhāng kǒu jié shé', vi: 'cứng họng' },
      { hanzi: '比喻', pinyin: 'bǐyù', vi: 'ví von' },
    ],
    paragraphs: [
      [
        ['楚国有一个卖兵器的商人，他在集市上同时摆出了矛和盾。', 'Nước Sở có một người buôn binh khí, ở chợ ông ta bày bán cùng lúc cả giáo và khiên.'],
        ['为了吸引顾客，他先举起盾，得意洋洋地吆喝：“我的盾坚固无比，无论什么锋利的东西都刺不穿它！”', 'Để thu hút khách, ông ta giơ khiên lên, dương dương tự đắc rao: "Khiên của tôi chắc chắn vô cùng, vật sắc bén cỡ nào cũng không đâm thủng được!"'],
      ],
      [['接着，他又举起矛，夸耀道：“我的矛锋利极了，无论多么坚固的东西，它都能刺穿！”', 'Tiếp đó, ông ta lại giơ giáo lên khoe: "Giáo của tôi sắc bén cực kỳ, vật chắc chắn đến đâu nó cũng đâm thủng!"']],
      [
        ['围观的人群中，有人忍不住问道：“那么，用你的矛去刺你的盾，结果会怎么样呢？”', 'Trong đám đông vây xem, có người không nhịn được hỏi: "Thế lấy giáo của ông đâm vào khiên của ông thì sẽ ra sao?"'],
        ['商人顿时张口结舌，一句话也答不上来，只好收起东西，灰溜溜地离开了。', 'Người buôn lập tức cứng họng, không đáp được câu nào, đành thu dọn đồ đạc, lủi thủi bỏ đi.'],
      ],
      [['后来，人们用“自相矛盾”来比喻说话或做事前后抵触，无法自圆其说。', 'Về sau, người ta dùng "tự mâu thuẫn" để ví lời nói hay việc làm trước sau trái ngược, không tự bào chữa được.']],
    ],
  },
  {
    id: 'worrying-sky',
    level: 6,
    title: '杞人忧天',
    title_vi: 'Người nước Kỷ lo trời sập',
    title_en: 'The man of Qi who feared the sky would fall',
    source: 'idiom',
    origin: 'Liệt Tử',
    moral_vi: 'Đừng tự chuốc lấy những nỗi lo vô căn cứ.',
    words: [
      { hanzi: '胡思乱想', pinyin: 'hú sī luàn xiǎng', vi: 'nghĩ ngợi lung tung' },
      { hanzi: '塌', pinyin: 'tā', vi: 'sập' },
      { hanzi: '开导', pinyin: 'kāidǎo', vi: 'khuyên giải' },
      { hanzi: '呼吸', pinyin: 'hūxī', vi: 'hít thở' },
      { hanzi: '耐心', pinyin: 'nàixīn', vi: 'kiên nhẫn' },
      { hanzi: '即使', pinyin: 'jíshǐ', vi: 'cho dù' },
      { hanzi: '如释重负', pinyin: 'rú shì zhòng fù', vi: 'như trút được gánh nặng' },
    ],
    paragraphs: [
      [
        ['古代杞国有一个人，整天胡思乱想，担心天会塌下来、地会陷下去，自己将无处容身。', 'Thời xưa, nước Kỷ có một người suốt ngày nghĩ ngợi lung tung, lo trời sẽ sập, đất sẽ sụt, bản thân không còn chỗ dung thân.'],
        ['他为此愁得吃不下饭，睡不着觉。', 'Ông ta lo đến mức ăn không ngon, ngủ không yên.'],
      ],
      [['他的一位朋友得知后，特意来开导他：“天不过是聚积在一起的气体，到处都是，你每天呼吸、活动都在其中，怎么会塌下来呢？”', 'Một người bạn biết chuyện, cất công đến khuyên giải: "Trời chẳng qua là khí tụ lại, ở đâu cũng có, ngày ngày anh hít thở, đi lại đều ở trong đó, sao mà sập xuống được?"']],
      [
        ['那人又问：“如果天真的是气体，那太阳、月亮和星星不会掉下来吗？”', 'Người kia lại hỏi: "Nếu trời đúng là khí, vậy mặt trời, mặt trăng và các vì sao không rơi xuống sao?"'],
        ['朋友耐心地解释：“它们也只是会发光的气体，即使掉下来，也不会伤到人。”', 'Người bạn kiên nhẫn giải thích: "Chúng cũng chỉ là khí biết phát sáng, cho dù có rơi xuống cũng không làm ai bị thương."'],
      ],
      [
        ['听了这番话，杞人终于如释重负，心情豁然开朗。', 'Nghe xong những lời ấy, người nước Kỷ cuối cùng như trút được gánh nặng, lòng nhẹ nhõm hẳn.'],
        ['后来，人们用“杞人忧天”来形容不必要的、毫无根据的担忧。', 'Về sau, người ta dùng "杞人忧天" để chỉ những nỗi lo không cần thiết, hoàn toàn vô căn cứ.'],
      ],
    ],
  },
]

export const storyById = (id: string) => stories.find((s) => s.id === id)

/** Tên truyện theo ngôn ngữ giao diện. */
export const storyTitle = (s: Story, lang: string) => (lang.startsWith('en') ? s.title_en : s.title_vi)
