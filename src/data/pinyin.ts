import samples from './generated/pinyin_chars.json'
import neutralSamples from './generated/pinyin_neutral.json'

/** Phụ âm đầu (声母) và cách đọc quen dùng khi học. */
export const initials: { initial: string; reading: string }[] = [
  { initial: 'b', reading: 'bo' },
  { initial: 'p', reading: 'po' },
  { initial: 'm', reading: 'mo' },
  { initial: 'f', reading: 'fo' },
  { initial: 'd', reading: 'de' },
  { initial: 't', reading: 'te' },
  { initial: 'n', reading: 'ne' },
  { initial: 'l', reading: 'le' },
  { initial: 'g', reading: 'ge' },
  { initial: 'k', reading: 'ke' },
  { initial: 'h', reading: 'he' },
  { initial: 'j', reading: 'ji' },
  { initial: 'q', reading: 'qi' },
  { initial: 'x', reading: 'xi' },
  { initial: 'zh', reading: 'zhi' },
  { initial: 'ch', reading: 'chi' },
  { initial: 'sh', reading: 'shi' },
  { initial: 'r', reading: 'ri' },
  { initial: 'z', reading: 'zi' },
  { initial: 'c', reading: 'ci' },
  { initial: 's', reading: 'si' },
  { initial: 'y', reading: 'yi' },
  { initial: 'w', reading: 'wu' },
]

/** Vần (韵母): vần đơn, vần ghép, vần mũi. */
export const finalGroups: { key: string; finals: string[] }[] = [
  { key: 'simple', finals: ['a', 'o', 'e', 'i', 'u', 'ü'] },
  { key: 'compound', finals: ['ai', 'ei', 'ao', 'ou', 'ia', 'ie', 'iao', 'iu', 'ua', 'uo', 'uai', 'ui', 'üe', 'er'] },
  { key: 'nasal', finals: ['an', 'en', 'ang', 'eng', 'ong', 'ian', 'in', 'iang', 'ing', 'iong', 'uan', 'un', 'uang', 'ueng', 'üan', 'ün'] },
]

/** Khi vần đứng một mình (không có phụ âm đầu) thì viết và đọc theo dạng này. */
export const standaloneFinal: Record<string, string> = {
  i: 'yi',
  u: 'wu',
  ü: 'yu',
  ia: 'ya',
  ie: 'ye',
  iao: 'yao',
  iu: 'you',
  ua: 'wa',
  uo: 'wo',
  uai: 'wai',
  ui: 'wei',
  üe: 'yue',
  ian: 'yan',
  in: 'yin',
  iang: 'yang',
  ing: 'ying',
  iong: 'yong',
  uan: 'wan',
  un: 'wen',
  uang: 'wang',
  ueng: 'weng',
  üan: 'yuan',
  ün: 'yun',
  ong: 'hong',
}

// Toàn bộ âm tiết hợp lệ của tiếng Phổ thông (không thanh điệu), nhóm theo phụ âm đầu.
const table: Record<string, string> = {
  '': 'a ai an ang ao e ei en eng er o ou',
  b: 'ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu',
  p: 'pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu',
  m: 'ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu',
  f: 'fa fan fang fei fen feng fo fou fu',
  d: 'da dai dan dang dao de dei den deng di dian diao die ding diu dong dou du duan dui dun duo',
  t: 'ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo',
  n: 'na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nü nüe',
  l: 'la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lü lüe',
  g: 'ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo',
  k: 'ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo',
  h: 'ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo',
  j: 'ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun',
  q: 'qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun',
  x: 'xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun',
  zh: 'zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo',
  ch: 'cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo',
  sh: 'sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo',
  r: 'ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo',
  z: 'za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo',
  c: 'ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo',
  s: 'sa sai san sang sao se sen seng si song sou su suan sui sun suo',
  y: 'ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun',
  w: 'wa wai wan wang wei wen weng wo wu',
}

export const syllableRows: { initial: string; syllables: string[] }[] = Object.entries(table).map(([initial, list]) => ({
  initial,
  syllables: list.split(' '),
}))

export const syllableCount = syllableRows.reduce((n, r) => n + r.syllables.length, 0)

const marks: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** Đặt dấu thanh (1-4) đúng quy tắc: ưu tiên a, e; "ou" đặt ở o; còn lại đặt ở nguyên âm cuối. */
export function withTone(syllable: string, tone: 1 | 2 | 3 | 4): string {
  let idx = syllable.search(/[ae]/)
  if (idx < 0) idx = syllable.indexOf('ou')
  if (idx < 0) {
    for (let i = syllable.length - 1; i >= 0; i--) {
      if ('iouü'.includes(syllable[i])) {
        idx = i
        break
      }
    }
  }
  if (idx < 0) return syllable
  return syllable.slice(0, idx) + marks[syllable[idx]][tone - 1] + syllable.slice(idx + 1)
}

/** Chữ Hán mẫu đọc đúng âm tiết có thanh điệu (lấy từ dữ liệu HSK), nếu có. */
export const sampleChar = (toned: string): string | undefined => (samples as Record<string, string>)[toned.normalize('NFC')]

/** Từ mẫu cho thanh nhẹ (轻声): thanh nhẹ chỉ nghe đúng trong từ, vd "ma" → 妈妈 māma. */
export const neutralSample = (syllable: string): { w: string; p: string } | undefined =>
  (neutralSamples as Record<string, { w: string; p: string }>)[syllable]

// ---- Bảng kết hợp phụ âm đầu × vần (dạng bảng tra pinyin chuẩn) ----

/** Hàng: phụ âm đầu ('' = không có phụ âm đầu). */
export const gridInitials = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'z', 'c', 's', 'zh', 'ch', 'sh', 'r', 'j', 'q', 'x', 'g', 'k', 'h']

/** Cột: vần, chia 4 nhóm (开口呼 / 齐齿呼 / 合口呼 / 撮口呼). */
export const gridFinalGroups: { key: string; finals: string[] }[] = [
  { key: 'open', finals: ['a', 'o', 'e', '-i', 'er', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'] },
  { key: 'i', finals: ['i', 'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong'] },
  { key: 'u', finals: ['u', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng'] },
  { key: 'ü', finals: ['ü', 'üe', 'üan', 'ün'] },
]

const valid = new Set(syllableRows.flatMap((r) => r.syllables))
const retroflex = new Set(['z', 'c', 's', 'zh', 'ch', 'sh', 'r'])
const palatal = new Set(['j', 'q', 'x'])

/** Âm tiết viết ra khi ghép phụ âm đầu với vần, hoặc null nếu tiếng Phổ thông không có âm này. */
export function spell(initial: string, final: string): string | null {
  let s: string
  if (final === '-i') {
    if (!retroflex.has(initial)) return null
    s = initial + 'i'
  } else if (!initial) {
    if (final === 'ong') return null
    s = standaloneFinal[final] ?? final
  } else if (final.startsWith('ü')) {
    // j, q, x (và y) viết ü thành u: ju, que, xuan; n, l giữ ü: nü, lüe.
    s = initial + (palatal.has(initial) ? 'u' + final.slice(1) : final)
  } else {
    if (final.startsWith('i') && retroflex.has(initial)) return null // zi, zhi… là vần -i
    if (final.startsWith('u') && palatal.has(initial)) return null // ju, qu, xu là vần ü
    s = initial + final
  }
  return valid.has(s) ? s : null
}
