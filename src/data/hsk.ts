import type { HSKLevel, Word } from '../types'

export const hskWords: Word[] = [
  // HSK 1
  { id: '1', hanzi: '你好', pinyin: 'nǐ hǎo', meaning_vi: 'Xin chào', meaning_en: 'Hello', hsk_level: 1 },
  { id: '2', hanzi: '再见', pinyin: 'zài jiàn', meaning_vi: 'Tạm biệt', meaning_en: 'Goodbye', hsk_level: 1 },
  { id: '3', hanzi: '谢谢', pinyin: 'xiè xie', meaning_vi: 'Cảm ơn', meaning_en: 'Thank you', hsk_level: 1 },
  { id: '4', hanzi: '对不起', pinyin: 'duì bu qǐ', meaning_vi: 'Xin lỗi', meaning_en: 'Sorry', hsk_level: 1 },
  { id: '5', hanzi: '我', pinyin: 'wǒ', meaning_vi: 'Tôi', meaning_en: 'I, me', hsk_level: 1 },
  { id: '6', hanzi: '你', pinyin: 'nǐ', meaning_vi: 'Bạn', meaning_en: 'You', hsk_level: 1 },
  { id: '7', hanzi: '他', pinyin: 'tā', meaning_vi: 'Anh ấy', meaning_en: 'He, him', hsk_level: 1 },
  { id: '8', hanzi: '是', pinyin: 'shì', meaning_vi: 'Là', meaning_en: 'To be', hsk_level: 1 },
  { id: '9', hanzi: '不', pinyin: 'bù', meaning_vi: 'Không', meaning_en: 'Not, no', hsk_level: 1 },
  { id: '10', hanzi: '有', pinyin: 'yǒu', meaning_vi: 'Có', meaning_en: 'To have', hsk_level: 1 },
  // HSK 2
  { id: '11', hanzi: '朋友', pinyin: 'péng you', meaning_vi: 'Bạn bè', meaning_en: 'Friend', hsk_level: 2 },
  { id: '12', hanzi: '学习', pinyin: 'xué xí', meaning_vi: 'Học tập', meaning_en: 'To study', hsk_level: 2 },
  { id: '13', hanzi: '工作', pinyin: 'gōng zuò', meaning_vi: 'Công việc, làm việc', meaning_en: 'Work, to work', hsk_level: 2 },
  { id: '14', hanzi: '时间', pinyin: 'shí jiān', meaning_vi: 'Thời gian', meaning_en: 'Time', hsk_level: 2 },
  { id: '15', hanzi: '今天', pinyin: 'jīn tiān', meaning_vi: 'Hôm nay', meaning_en: 'Today', hsk_level: 2 },
  // HSK 3
  { id: '16', hanzi: '因为', pinyin: 'yīn wèi', meaning_vi: 'Bởi vì', meaning_en: 'Because', hsk_level: 3 },
  { id: '17', hanzi: '所以', pinyin: 'suǒ yǐ', meaning_vi: 'Cho nên, vì vậy', meaning_en: 'Therefore, so', hsk_level: 3 },
  { id: '18', hanzi: '虽然', pinyin: 'suī rán', meaning_vi: 'Mặc dù', meaning_en: 'Although', hsk_level: 3 },
  { id: '19', hanzi: '但是', pinyin: 'dàn shì', meaning_vi: 'Nhưng', meaning_en: 'But, however', hsk_level: 3 },
  { id: '20', hanzi: '一起', pinyin: 'yì qǐ', meaning_vi: 'Cùng nhau', meaning_en: 'Together', hsk_level: 3 },
]

export const getByLevel = (level: HSKLevel) => hskWords.filter((w) => w.hsk_level === level)
