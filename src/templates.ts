import type { DesignNode, DesignPage, DesignProject, NodeType, PageKind } from './types';
import { normalizeNode } from './model';
import {validArtboardSize} from './artboard-size';
import {extraTemplates} from './sample-templates';
import {auroraBanner} from './creative';
export { presets } from './presets';

let sequence = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;

export function makeNode(type: NodeType, overrides: Partial<DesignNode> = {}): DesignNode {
  return normalizeNode(type, { id: uid(type), ...overrides });
}

function card(name: string, x: number, y: number, width: number, height: number, fill: string, extra: Partial<DesignNode> = {}) {
  return makeNode('frame', { name, x, y, width, height, fill, ...extra });
}
function label(name: string, text: string, x: number, y: number, width: number, height: number, fontSize: number, color: string, fontWeight = 500, extra: Partial<DesignNode> = {}) {
  return makeNode('text', { name, text, x, y, width, height, fontSize, color, fontWeight, radius: 0, ...extra });
}
function circle(name: string, x: number, y: number, size: number, fill: string, extra: Partial<DesignNode> = {}) {
  return makeNode('ellipse', { name, x, y, width: size, height: size, fill, ...extra });
}
function button(name: string, text: string, x: number, y: number, width: number, height: number, fill: string, color: string, extra: Partial<DesignNode> = {}) {
  return makeNode('button', { name, text, x, y, width, height, fill, color, radius: 16, fontSize: 14, fontWeight: 650, ...extra });
}
function page(name: string, kind: DesignPage['kind'], width: number, height: number, background: string, nodes: DesignNode[]): DesignPage {
  return { id: uid('page'), name, kind, width, height, background, nodes };
}

function mobileOrbit(): DesignPage {
  return page('Orbit · 모바일 웰니스', 'mobile', 390, 844, '#101A24', [
    label('상태 표시줄 · 시간', '9:41', 28, 18, 70, 22, 13, '#F6FAF7', 700),
    label('상태 표시줄 · 연결', '●  ▰  ▰', 296, 19, 70, 18, 12, '#F6FAF7', 600),
    circle('로고 심볼', 24, 64, 31, '#C9F5BB'),
    circle('로고 심볼 · 중심', 33, 73, 13, '#16272A'),
    label('브랜드', 'orbit', 64, 62, 120, 38, 27, '#F5F7EE', 650),
    circle('프로필 배경', 326, 63, 39, '#293C3D'),
    label('프로필 이니셜', 'J', 341, 72, 19, 24, 17, '#D3F5C6', 650),
    card('메인 히어로', 24, 122, 342, 285, '#253B38', { radius: 28 }),
    label('히어로 · 인사', 'A MOMENT FOR YOU', 46, 145, 260, 20, 10, '#BBD2C2', 650),
    label('히어로 · 제목', 'Find your\ninner orbit.', 46, 176, 245, 90, 34, '#F6FAF1', 650),
    circle('오빗 · 외곽', 217, 245, 120, '#3A5346', { animation: 'float', duration: 5 }),
    circle('오빗 · 두 번째', 230, 258, 94, '#6E8E67', { animation: 'float', duration: 5 }),
    circle('오빗 · 세 번째', 242, 270, 70, '#A0C68B', { animation: 'float', duration: 5 }),
    circle('오빗 · 중심', 253, 281, 48, '#D1F4AF', { animation: 'float', duration: 5 }),
    circle('오빗 · 작은 별', 204, 280, 8, '#CDF3B6'),
    label('히어로 · 설명', 'Breathe in.\nLet the world wait.', 46, 279, 170, 43, 13, '#BBD0C4', 400),
    button('세션 시작', 'Start a session     ↗', 46, 350, 298, 37, '#D1F4BB', '#20372B', { radius: 12, fontSize: 13 }),
    label('추천 섹션 제목', 'Made for your mood', 24, 436, 280, 29, 20, '#F6F8F2', 600),
    label('추천 섹션 링크', 'See all', 316, 441, 55, 22, 11, '#AFC5BB', 500),
    card('추천 카드 · 포커스', 24, 485, 164, 166, '#E6E9D9', { radius: 24 }),
    circle('포커스 · 아트 외곽', 70, 504, 72, '#CACFB8'),
    circle('포커스 · 아트 중간', 82, 516, 48, '#A5B294'),
    circle('포커스 · 아트 중심', 94, 528, 24, '#788C75'),
    label('포커스 · 제목', 'Deep focus', 42, 592, 136, 22, 17, '#27372E', 650),
    label('포커스 · 메타', '12 min  ·  Find your flow', 42, 620, 142, 17, 10, '#647365', 450),
    card('추천 카드 · 휴식', 202, 485, 164, 166, '#C5D8DB', { radius: 24 }),
    circle('휴식 · 달', 248, 505, 72, '#8FAFB5'),
    circle('휴식 · 초승달', 267, 496, 61, '#C5D8DB'),
    circle('휴식 · 별 하나', 234, 523, 5, '#F5F8EE'),
    circle('휴식 · 별 둘', 316, 553, 4, '#F5F8EE'),
    label('휴식 · 제목', 'Slow down', 220, 592, 136, 22, 17, '#233F47', 650),
    label('휴식 · 메타', '8 min  ·  A softer evening', 220, 620, 140, 17, 10, '#54727A', 450),
    card('오늘의 리마인더', 24, 674, 342, 56, '#1B2B34', { radius: 18 }),
    circle('리마인더 · 아이콘', 38, 688, 28, '#364A45'),
    label('리마인더 · 아이콘 모양', '✦', 45, 692, 18, 20, 16, '#D0EFBB', 500),
    label('리마인더 · 문구', 'Small pauses. Better days.', 78, 692, 238, 24, 13, '#CDDDD1', 450),
    card('하단 내비게이션', 24, 754, 342, 65, '#1C2B34', { radius: 23 }),
    card('홈 · 선택 배경', 35, 765, 80, 42, '#D0F1BD', { radius: 16 }),
    label('홈 · 버튼', '⌂  Home', 47, 775, 75, 22, 12, '#203C2D', 650),
    label('탐색 · 버튼', '◉ Explore', 137, 775, 86, 22, 12, '#9DAFB2', 500),
    label('즐겨찾기 · 버튼', '♡ Saved', 247, 775, 86, 22, 12, '#9DAFB2', 500),
  ]);
}

function webOrbit(): DesignPage {
  return page('Orbit · 웹 대시보드', 'web', 1120, 760, '#F5F6F0', [
    card('상단 내비게이션', 24, 20, 1072, 72, '#FFFFFF', { radius: 22 }),
    circle('브랜드 · 로고', 44, 40, 32, '#D8F1C8'),
    circle('브랜드 · 심볼', 54, 50, 12, '#314938'),
    label('브랜드명', 'orbit', 87, 39, 170, 40, 26, '#213D32', 700),
    label('메뉴 · 제품', 'Product', 432, 47, 90, 24, 13, '#54645A', 500),
    label('메뉴 · 리소스', 'Resources', 535, 47, 110, 24, 13, '#54645A', 500),
    label('메뉴 · 가격', 'Pricing', 658, 47, 90, 24, 13, '#54645A', 500),
    button('로그인', 'Log in', 858, 38, 80, 36, '#F0F3EA', '#324D3C', { radius: 12, fontSize: 12 }),
    button('시작하기', 'Get started ↗', 950, 38, 124, 36, '#263E32', '#F5F8EE', { radius: 12, fontSize: 12 }),
    card('히어로 · 배경', 24, 112, 1072, 368, '#E5EDDD', { radius: 30 }),
    card('히어로 · 배지', 58, 145, 214, 28, '#D1E1C3', { radius: 14 }),
    label('히어로 · 배지 텍스트', '✦  YOUR SPACE TO GROW', 72, 152, 198, 17, 10, '#4B6246', 650),
    label('히어로 · 타이틀', 'Good work.\nA better headspace.', 58, 195, 650, 134, 52, '#233E2B', 650),
    label('히어로 · 설명', 'Make room for what matters. Bring clarity, calm,\nand a little more balance to your everyday.', 60, 342, 590, 48, 15, '#5F725C', 400),
    button('히어로 · 액션', 'Find your orbit  ↗', 58, 409, 185, 42, '#2D4934', '#F7FAED', { radius: 14 }),
    label('히어로 · 보조 문구', 'Free to start. Yours to explore.', 262, 423, 280, 22, 11, '#677C5F', 450),
    circle('오빗 · 외곽', 747, 162, 254, '#CBDBB9', { animation: 'float', duration: 6 }),
    circle('오빗 · 중간', 772, 187, 204, '#AEC89A', { animation: 'float', duration: 6 }),
    circle('오빗 · 내부', 800, 215, 148, '#7DA373', { animation: 'float', duration: 6 }),
    circle('오빗 · 중심', 830, 245, 88, '#426B4C', { animation: 'float', duration: 6 }),
    card('플로팅 · 상태', 768, 384, 246, 54, '#F8FBEF', { radius: 18, shadow: true, glass: true }),
    circle('플로팅 · 체크', 782, 397, 28, '#D2E9C4'),
    label('플로팅 · 아이콘', '✓', 790, 400, 20, 20, 16, '#42683C', 700),
    label('플로팅 · 텍스트', 'A little progress, every day.', 821, 403, 190, 20, 12, '#4A6341', 500),
    label('섹션 · 제목', 'Build your daily rhythm', 30, 516, 720, 42, 27, '#2B4133', 650),
    label('섹션 · 보기', 'Explore all practices  ↗', 923, 526, 180, 23, 12, '#62755A', 500),
    card('카드 · 집중', 24, 578, 344, 153, '#FFFFFF', { radius: 25 }),
    circle('집중 · 아이콘 배경', 45, 598, 44, '#E8EEDC'),
    label('집중 · 아이콘', '◉', 57, 607, 30, 28, 23, '#7A9561', 600),
    label('집중 · 타이틀', 'Space to focus', 106, 600, 230, 28, 19, '#2B4133', 650),
    label('집중 · 설명', 'Find your flow with thoughtful\nrituals for a clearer mind.', 106, 640, 230, 43, 12, '#7A8775', 400),
    label('집중 · 링크', 'Discover focus  ↗', 106, 699, 230, 17, 11, '#527C44', 600),
    card('카드 · 균형', 388, 578, 344, 153, '#FFFFFF', { radius: 25 }),
    circle('균형 · 아이콘 배경', 409, 598, 44, '#E4EBEF'),
    label('균형 · 아이콘', '≈', 420, 603, 32, 35, 30, '#7A9DA3', 600),
    label('균형 · 타이틀', 'Room to breathe', 470, 600, 230, 28, 19, '#2B4133', 650),
    label('균형 · 설명', 'Simple moments that bring\nyou back to yourself.', 470, 640, 230, 43, 12, '#7A8775', 400),
    label('균형 · 링크', 'Take a pause  ↗', 470, 699, 230, 17, 11, '#527C44', 600),
    card('카드 · 성장', 752, 578, 344, 153, '#293E32', { radius: 25 }),
    circle('성장 · 아이콘 배경', 773, 598, 44, '#425D43'),
    label('성장 · 아이콘', '✦', 785, 605, 30, 30, 24, '#CDE7AC', 500),
    label('성장 · 타이틀', 'Better together', 834, 600, 230, 28, 19, '#F0F5E8', 650),
    label('성장 · 설명', 'Small steps. Shared energy.\nA healthier way to work.', 834, 640, 230, 43, 12, '#BACCB0', 400),
    label('성장 · 링크', 'Explore for teams  ↗', 834, 699, 230, 17, 11, '#D3E9B8', 600),
  ]);
}

function presentation(): DesignPage {
  return page('Orbit · 브랜드 프레젠테이션', 'slide', 1280, 720, '#F5F6EE', [
    circle('브랜드 로고', 56, 44, 32, '#CDE7B5'),
    circle('브랜드 로고 · 중심', 66, 54, 12, '#3C5836'),
    label('브랜드', 'orbit', 101, 42, 200, 40, 28, '#2E4832', 650),
    label('상단 · 문서 라벨', 'THE EVERYDAY, REIMAGINED', 56, 152, 570, 22, 12, '#73816A', 600),
    label('슬라이드 · 제목', 'Make space\nfor better.', 52, 211, 650, 190, 78, '#2A422F', 650),
    label('슬라이드 · 설명', 'Thoughtful tools for a calmer mind,\na clearer purpose, and a more balanced life.', 58, 439, 610, 70, 22, '#6C7B65', 400),
    button('슬라이드 · 챕터', '01    A new perspective', 58, 565, 276, 50, '#E2EBD7', '#4B6543', { radius: 17, fontSize: 15 }),
    label('하단 · 저작권', 'ORBIT STUDIO  /  2026', 58, 664, 400, 20, 10, '#87927E', 550),
    card('비주얼 · 배경', 750, 28, 502, 664, '#253D32', { radius: 36 }),
    label('비주얼 · 챕터', 'A LITTLE MORE BALANCE.', 784, 62, 430, 22, 11, '#A4B99A', 550),
    circle('비주얼 · 오빗 외곽', 800, 169, 402, '#3A5540', { animation: 'float', duration: 6 }),
    circle('비주얼 · 오빗 두 번째', 838, 207, 326, '#5D7E53', { animation: 'float', duration: 6 }),
    circle('비주얼 · 오빗 세 번째', 879, 248, 244, '#8CAB73', { animation: 'float', duration: 6 }),
    circle('비주얼 · 오빗 네 번째', 920, 289, 162, '#B9D296', { animation: 'float', duration: 6 }),
    circle('비주얼 · 오빗 중심', 959, 328, 84, '#E5EDBD', { animation: 'float', duration: 6 }),
    circle('비주얼 · 작은 별', 817, 397, 13, '#E7EDBB'),
    label('비주얼 · 캡션', 'Your next chapter\nstarts with a pause.', 789, 595, 390, 54, 20, '#E2ECD4', 450),
    label('비주얼 · 페이지 번호', '01', 1196, 646, 40, 24, 12, '#A4B99A', 500),
  ]);
}

function glassMobile(): DesignPage {
  return page('Prism · 리퀴드 글래스', 'mobile', 390, 844, '#1D1C36', [
    circle('배경 · 라벤더 오브', -50, 107, 310, '#8171BC', { blur: 24, animation: 'float', duration: 7 }),
    circle('배경 · 민트 오브', 185, 288, 264, '#63968C', { blur: 30, animation: 'float', duration: 8 }),
    circle('배경 · 핑크 오브', -44, 572, 250, '#A7769F', { blur: 28, animation: 'float', duration: 9 }),
    label('상태 표시줄', '9:41', 28, 19, 80, 22, 13, '#FFFFFF', 650),
    label('상태 표시줄 · 배터리', '●  ▰', 321, 19, 50, 22, 12, '#FFFFFF', 600),
    label('헤더 · 브랜드', 'prism', 26, 68, 220, 42, 31, '#FFFFFF', 650),
    circle('헤더 · 메뉴 배경', 325, 67, 40, '#68657F', { glass: true, opacity: 0.8 }),
    label('헤더 · 메뉴', '···', 336, 70, 30, 30, 24, '#FFFFFF', 650),
    label('인사말', 'Your world,\nin a softer light.', 26, 145, 335, 100, 34, '#FFFFFF', 600),
    card('글래스 · 메인 카드', 24, 285, 342, 250, '#E9EAF9', { opacity: 0.77, glass: true, shadow: true, radius: 30 }),
    label('메인 · 라벨', 'TODAY’S ATMOSPHERE', 48, 312, 260, 20, 10, '#57536E', 650),
    label('메인 · 도시', 'Seoul', 48, 350, 200, 40, 31, '#29263E', 650),
    label('메인 · 날씨', '22°', 48, 404, 180, 74, 64, '#29263E', 400),
    circle('날씨 · 햇살', 251, 363, 66, '#FAEAB2', { shadow: true }),
    card('날씨 · 구름 뒤', 234, 403, 92, 30, '#FBF8FC', { radius: 22 }),
    card('날씨 · 구름 앞', 222, 418, 111, 28, '#FFFFFF', { radius: 20 }),
    label('메인 · 날씨 설명', 'Soft clouds, clear mind.', 49, 489, 270, 21, 12, '#605B77', 450),
    card('글래스 · 카드 두 번째', 24, 554, 342, 110, '#EEEAF6', { opacity: 0.68, glass: true, radius: 25 }),
    circle('음악 · 커버', 42, 573, 72, '#D7C8DE'),
    circle('음악 · 레코드', 55, 586, 46, '#826C96'),
    circle('음악 · 중심', 72, 603, 12, '#E4D7EC'),
    label('음악 · 제목', 'Floating somewhere', 130, 579, 210, 27, 17, '#30263E', 650),
    label('음악 · 아티스트', 'Prism Sessions  ·  Ambient', 131, 615, 205, 22, 11, '#6F5C7B', 450),
    card('글래스 · 하단 메뉴', 24, 754, 342, 66, '#CFCDD9', { glass: true, opacity: 0.66, radius: 25 }),
    label('메뉴 · 홈', '◉ Home', 51, 777, 110, 24, 13, '#FFFFFF', 650),
    label('메뉴 · 탐색', '◇ Explore', 158, 777, 110, 24, 13, '#FFFFFF', 500),
    label('메뉴 · 저장', '♡ Saved', 273, 777, 90, 24, 13, '#FFFFFF', 500),
  ]);
}

function modalWeb(): DesignPage {
  const base = webOrbit();
  return page('Orbit · 모달 컴포넌트', 'web', 1120, 760, '#F5F6F0', [
    ...base.nodes,
    card('모달 · 오버레이', 0, 0, 1120, 760, '#17251F', { opacity: 0.52, radius: 0 }),
    card('모달 · 배경', 316, 155, 488, 450, '#FCFDF8', { radius: 32, shadow: true, animation: 'fade', duration: 0.7 }),
    circle('모달 · 성공 아이콘 배경', 506, 192, 108, '#E1EED4'),
    circle('모달 · 성공 아이콘 원', 528, 214, 64, '#BDD8A8'),
    label('모달 · 성공 아이콘', '✓', 547, 229, 40, 45, 31, '#47683C', 600),
    label('모달 · 닫기', '×', 756, 174, 30, 32, 23, '#7F8C77', 400),
    label('모달 · 제목', 'A fresh start awaits.', 358, 329, 410, 47, 30, '#2D4631', 650),
    label('모달 · 본문', 'Your space is ready. Take a breath, set an\nintention, and make today a little better.', 358, 395, 410, 55, 15, '#78846E', 400),
    button('모달 · 기본 액션', 'Let’s find your orbit  ↗', 358, 477, 404, 48, '#2C4833', '#F3F8EA', { radius: 16 }),
    button('모달 · 보조 액션', 'I’ll explore later', 358, 539, 404, 32, '#FCFDF8', '#738369', { radius: 12, fontWeight: 500, fontSize: 13 }),
  ]);
}

function musicMobile(): DesignPage {
  return page('Wave · 음악 플레이어', 'mobile', 390, 844, '#F5F0E7', [
    label('상태 표시줄', '9:41', 29, 19, 90, 22, 13, '#3F4545', 650),
    label('상태 표시줄 · 배터리', '●  ▰', 322, 19, 50, 22, 12, '#3F4545', 600),
    button('뒤로 가기', '‹', 26, 66, 42, 42, '#EAE3D8', '#4B534B', { radius: 15, fontSize: 28, fontWeight: 400 }),
    label('헤더 · 라벨', 'NOW PLAYING', 134, 80, 160, 20, 10, '#7D8175', 650),
    button('더 보기', '···', 322, 66, 42, 42, '#EAE3D8', '#4B534B', { radius: 15, fontSize: 20 }),
    card('앨범 · 커버 배경', 26, 147, 338, 338, '#C4D1BD', { radius: 35, shadow: true }),
    circle('앨범 · 오빗 1', 63, 184, 264, '#A6B99A', { animation: 'pulse', duration: 6 }),
    circle('앨범 · 오빗 2', 90, 211, 210, '#829F7A', { animation: 'pulse', duration: 6 }),
    circle('앨범 · 오빗 3', 117, 238, 156, '#5B7C5D', { animation: 'pulse', duration: 6 }),
    circle('앨범 · 오빗 4', 144, 265, 102, '#DCE5BC', { animation: 'pulse', duration: 6 }),
    circle('앨범 · 작은 점', 156, 300, 8, '#F1F0DB'),
    label('앨범 · 타이포', 'SLOW\nMORNINGS', 48, 409, 220, 53, 19, '#F6F7E9', 650),
    label('곡 제목', 'Somewhere, softer', 28, 523, 315, 39, 26, '#374C3C', 650),
    label('아티스트', 'The Sunday Collective', 29, 573, 300, 26, 14, '#89907D', 400),
    label('즐겨찾기', '♡', 329, 534, 40, 40, 29, '#6B8260', 500),
    card('재생 바 · 배경', 28, 628, 334, 4, '#DCDDD0', { radius: 4 }),
    card('재생 바 · 진행', 28, 628, 142, 4, '#658A61', { radius: 4 }),
    circle('재생 바 · 손잡이', 165, 624, 12, '#658A61'),
    label('재생 시간', '1:42', 28, 647, 70, 20, 10, '#8F9585', 500),
    label('전체 시간', '4:08', 336, 647, 50, 20, 10, '#8F9585', 500),
    label('랜덤 재생', '⤨', 43, 706, 40, 40, 26, '#8D9782', 500),
    label('이전 곡', '‹', 112, 694, 45, 60, 44, '#425C42', 500),
    circle('재생 · 배경', 164, 686, 64, '#456A4B', { shadow: true }),
    label('재생 · 아이콘', 'Ⅱ', 188, 707, 34, 32, 23, '#F5F5E8', 500),
    label('다음 곡', '›', 264, 694, 45, 60, 44, '#425C42', 500),
    label('반복 재생', '↻', 322, 704, 40, 40, 27, '#8D9782', 500),
    card('하단 · 미니 배지', 115, 790, 160, 28, '#E9E7DA', { radius: 14 }),
    label('하단 · 출력 장치', '◉  Living room speaker', 128, 798, 160, 19, 9, '#808C75', 550),
  ]);
}

export function createPage(kind: PageKind, options: {name?:string;width?:number;height?:number;background?:string} = {}): DesignPage {
  const sizes:Record<PageKind,[number,number,string]>={mobile:[412,915,'새 Android 화면'],web:[1440,900,'새 웹 화면'],desktop:[1440,900,'새 Windows 화면'],banner:[1200,628,'새 배너'],slide:[1280,720,'새 프레젠테이션']};
  const [width,height,name]=sizes[kind];
  const w=options.width??width,h=options.height??height;
  if(!validArtboardSize(w,h))throw new Error('아트보드 크기는 1~16,384px입니다.');
  return page(options.name?.trim()||name,kind,w,h,options.background||'#FFFFFF',[]);
}

export function createProject(): DesignProject {
  const pages = [desktopDashboard(), financeMobile(), webOrbit(), brandBanner(), designPresentation(), glassDialog()];
  const trigger=pages[0].nodes.find(n=>n.name==='새 프로젝트');
  if(trigger)trigger.interaction={trigger:'click',action:'overlay',targetPageId:pages[5].id,transition:'fade',duration:.3};
  return { version: 2, name: 'Nook · Creative workspace', activePageId: pages[0].id, pages, revision:0, timeline:{duration:6,fps:60}, tokens:{colors:[{name:'Primary',value:'#7561E8'},{name:'Canvas',value:'#F5F6FA'},{name:'Ink',value:'#272838'},{name:'Sage',value:'#749268'}]} };
}

export const templates: { id: string; name: string; description: string; kind: PageKind; create: () => DesignPage }[] = [
  {id:'aurora-discord',name:'Aurora · 소프트 Discord 배너',description:'하늘·라일락 그라데이션, 캘리그래피와 곡선·점선 장식',kind:'banner',create:auroraBanner},
  ...extraTemplates,
  { id:'nook-windows',name:'Nook · Windows workspace',description:'그룹과 자동 레이아웃으로 구성한 데스크톱 앱',kind:'desktop',create:desktopDashboard },
  { id:'sage-android',name:'Sage · Android finance',description:'금융 홈 화면과 실제 편집 가능한 컨트롤',kind:'mobile',create:financeMobile },
  { id:'form-campaign',name:'Form / Future · Campaign',description:'대담한 타이포그래피와 그라디언트 캠페인',kind:'banner',create:brandBanner },
  { id:'nook-keynote',name:'Nook · Design system',description:'색상 토큰과 타이포그래피 프레젠테이션',kind:'slide',create:designPresentation },
  { id:'prism-dialog',name:'Prism · Glass dialog',description:'리퀴드 글래스와 프로토타입 모달',kind:'desktop',create:glassDialog },
  { id: 'orbit-mobile', name: 'Orbit · 웰니스 앱', description: '마음의 여유를 위한 모바일 UI', kind: 'mobile', create: mobileOrbit },
  { id: 'orbit-web', name: 'Orbit · 웹사이트', description: '자연스러운 컬러의 웹 랜딩', kind: 'web', create: webOrbit },
  { id: 'orbit-slides', name: 'Orbit · 프레젠테이션', description: '브랜드를 소개하는 첫 번째 장', kind: 'slide', create: presentation },
  { id: 'prism-glass', name: 'Prism · 글래스 UI', description: '부드러운 블러와 반투명 카드', kind: 'mobile', create: glassMobile },
  { id: 'orbit-modal', name: 'Orbit · 모달', description: '오버레이와 두 가지 액션 버튼', kind: 'web', create: modalWeb },
  { id: 'wave-player', name: 'Wave · 음악 플레이어', description: '오빗 애니메이션이 있는 음악 앱', kind: 'mobile', create: musicMobile },
];

function desktopDashboard(): DesignPage {
  const nodes: DesignNode[] = [];
  const add = (type: NodeType, name: string, x: number, y: number, width: number, height: number, fill: string, extra: Partial<DesignNode> = {}) => { const n = makeNode(type, {name,x,y,width,height,fill,radius:16,...extra}); nodes.push(n); return n.id; };
  const text = (name:string,value:string,x:number,y:number,w:number,h:number,size:number,color='#252734',weight=500,parentId?:string) => add('text',name,x,y,w,h,'transparent',{text:value,fontSize:size,color,fontWeight:weight,parentId,radius:0,lineHeight:1.25});
  const panel = add('group','Windows app · workspace',0,0,1280,800,'#F5F6FA',{radius:22,clipContent:true});
  const side = add('frame','Navigation sidebar',0,0,224,800,'#FFFFFF',{parentId:panel,radius:0});
  add('frame','Brand mark',25,29,34,34,'#7161EF',{parentId:side,radius:12});
  text('Brand mark letter','n',35,30,24,32,27,'#FFFFFF',700,side);
  text('Brand name','nook',70,32,120,30,24,'#252734',700,side);
  text('Workspace caption','YOUR WORKSPACE',25,104,178,18,9,'#A0A2B1',700,side);
  const nav=add('group','Sidebar navigation · auto layout',16,143,192,220,'transparent',{parentId:side,layout:{direction:'vertical',gap:8,padding:0,align:'start',justify:'start'}});
  ['◈   Overview','▦   My projects','◷   Schedule','◇   Team space','▱   Documents'].forEach((value,i)=>add('button',`Navigation · ${i+1}`,0,0,192,36,i===0?'#EEEAFE':'transparent',{parentId:nav,text:value,fontSize:12,fontWeight:i===0?650:500,color:i===0?'#7762DE':'#858595',textAlign:'left',radius:11}));
  text('Project caption','PINNED PROJECTS',25,403,178,18,9,'#A0A2B1',700,side);
  text('Pinned projects','●   Website refresh\n\n●   Mobile experience\n\n●   Brand guidelines',27,443,184,133,11,'#7D7D8E',500,side);
  const invite=add('frame','Invite team card',16,623,192,108,'#F4F1FE',{parentId:side,radius:17});
  text('Invite heading','A little teamwork.',14,15,170,20,12,'#64589A',650,invite);
  text('Invite copy','Big things start together.',14,42,170,17,9,'#9B91B8',400,invite);
  add('button','Invite members',14,70,164,25,'#E5DEFA',{parentId:invite,text:'Invite your team   +',fontSize:10,fontWeight:600,color:'#7665AC',radius:8});
  add('ellipse','Avatar',22,756,27,27,'#E9DFC9',{parentId:side});
  text('Avatar initial','J',32,761,16,20,12,'#8C7B5C',650,side);
  text('User name','Jamie Park',60,754,125,18,11,'#555565',650,side);
  text('User plan','Pro workspace',60,772,125,16,9,'#A8A5B5',400,side);
  const header=add('group','Top toolbar',224,0,1056,89,'#FFFFFF',{parentId:panel,radius:0});
  text('Breadcrumb','Workspace  /  Overview',31,35,360,23,12,'#9392A1',500,header);
  add('button','Search workspace',668,26,231,36,'#F6F6F9',{parentId:header,text:'⌕   Search anything…       Ctrl K',fontSize:10,color:'#AAA7B9',fontWeight:400,radius:11});
  add('button','Notifications',918,26,36,36,'#F6F6F9',{parentId:header,text:'♧',fontSize:18,color:'#8D87A1',radius:11});
  add('ellipse','Toolbar avatar',976,25,37,37,'#D6DDD5',{parentId:header});
  text('Toolbar avatar initials','JP',985,36,28,20,10,'#6B8069',650,header);
  text('Welcome title','Make room for your best work.',259,116,750,42,29,'#272838',650,panel);
  text('Welcome subtitle','A clear overview. A little momentum. Everything in its place.',260,165,755,22,12,'#A09CAC',400,panel);
  add('button','새 프로젝트',1101,124,142,36,'#7561E8',{parentId:panel,text:'+   New project',fontSize:11,fontWeight:650,color:'#FFFFFF',radius:11});
  const stats=add('group','Project metrics · auto layout',260,216,983,113,'transparent',{parentId:panel,layout:{direction:'horizontal',gap:15,padding:0,align:'start',justify:'start'}});
  [['Active projects','12','↗  2 new this week','#EEE9FD','#7B65CE'],['Tasks completed','48','↗  18% from last week','#E9F2EA','#6B9B72'],['Team members','08','All great minds, together','#F8EFDF','#B6975C']].forEach((v,i)=>{const group=add('frame',`Metric card · ${v[0]}`,0,0,i===2?318:317,113,'#FFFFFF',{parentId:stats,radius:19});text(`Metric label ${i}`,v[0],19,17,240,19,11,'#9995A7',500,group);text(`Metric number ${i}`,v[1],19,47,170,36,29,'#343244',650,group);text(`Metric detail ${i}`,v[2],19,89,270,16,9,'#ABA7B6',400,group);add('frame',`Metric icon background ${i}`,260,19,37,37,v[3],{parentId:group,radius:12});text(`Metric icon ${i}`,i===0?'▦':i===1?'✓':'♧',272,27,27,24,18,v[4],600,group);});
  const projects=add('frame','Recent projects panel',260,353,614,411,'#FFFFFF',{parentId:panel,radius:22});
  text('Projects heading','Your projects',23,23,370,30,18,'#373447',650,projects);
  text('Projects view all','View all  ↗',502,30,100,19,10,'#A29BB5',500,projects);
  const projectCards=add('group','Project cards · auto layout',22,76,570,204,'transparent',{parentId:projects,layout:{direction:'horizontal',gap:14,padding:0,align:'start',justify:'start'}});
  [['Brand identity','Creative studio','#F3EBDD','#D2BFA1'],['Mobile experience','Product design','#E8E7F9','#B1ABE3'],['Website refresh','Development','#E6EEE8','#A8C0AA']].forEach((v,i)=>{const group=add('frame',`Project · ${v[0]}`,0,0,180,200,'#FFFFFF',{parentId:projectCards,radius:15,stroke:'#F0EEF4',strokeWidth:1});add('frame',`Project visual ${i}`,9,9,162,105,v[2],{parentId:group,radius:12});if(i===0){add('ellipse','Brand orbit outer',49,22,80,80,v[3],{parentId:group});add('ellipse','Brand orbit inner',66,39,46,46,'#EFE3CD',{parentId:group});}else if(i===1){add('frame','Mobile mockup',61,22,58,81,'#8175BF',{parentId:group,radius:12,rotation:12});add('frame','Mobile screen',67,30,46,63,'#D3CEF2',{parentId:group,radius:8,rotation:12});}else{add('frame','Web mockup',35,31,112,63,'#9FB49B',{parentId:group,radius:8});add('frame','Web mockup content',43,42,96,43,'#D8E4D5',{parentId:group,radius:4});}text(`Project name ${i}`,v[0],12,130,160,23,12,'#575164',650,group);text(`Project category ${i}`,v[1],12,157,160,19,9,'#AAA3B3',400,group);});
  text('Project footer label','THIS WEEK’S FOCUS',23,308,350,20,9,'#B3ABBD',600,projects);
  text('Project footer','Build something worth coming back to.',23,344,540,25,15,'#8F849E',500,projects);
  const activity=add('frame','Activity panel',893,353,350,411,'#FFFFFF',{parentId:panel,radius:22});
  text('Activity heading','A little progress, every day.',22,25,310,28,16,'#494355',650,activity);
  text('Activity subtitle','Your workspace is finding its rhythm.',22,65,310,20,10,'#B0A8BB',400,activity);
  [59,91,71,117,104,144,127].forEach((height,i)=>add('frame',`Weekly activity bar ${i+1}`,27+i*43,259-height,23,height,i===5?'#8E7BDF':'#E9E4F5',{parentId:activity,radius:7}));
  text('Chart labels','M      T      W      T      F      S      S',26,277,309,20,10,'#ADA3BA',500,activity);
  add('frame','Activity separator',22,321,306,1,'#F2EEF7',{parentId:activity,radius:0});
  text('Activity total','24.8 h',23,344,200,31,25,'#645875',650,activity);
  text('Activity status','↑ 12.6%',237,352,95,23,12,'#89A18C',600,activity);
  return page('Nook · Windows workspace','desktop',1280,800,'#F5F6FA',nodes);
}

function financeMobile(): DesignPage {
  const nodes:DesignNode[]=[];
  const a=(type:NodeType,name:string,x:number,y:number,width:number,height:number,fill:string,extra:Partial<DesignNode>={})=>{const n=makeNode(type,{name,x,y,width,height,fill,radius:20,...extra});nodes.push(n);return n.id;};
  const t=(name:string,text:string,x:number,y:number,w:number,h:number,size:number,color='#28382E',weight=500,parentId?:string)=>a('text',name,x,y,w,h,'transparent',{text,fontSize:size,color,fontWeight:weight,parentId,lineHeight:1.2});
  t('Status bar time','9:41',25,20,75,22,13,'#35403D',650);t('Status bar icons','●  ▰',343,20,50,22,12,'#35403D',600);
  a('ellipse','Avatar',24,70,43,43,'#E2D9C8');t('Avatar initial','J',40,81,24,26,19,'#8F8064',600);t('Greeting','Good morning, Jamie',79,73,270,19,11,'#90998E',400);t('Page title','Your money, in balance.',79,97,310,28,19,'#334434',650);
  a('button','Notification button',345,76,43,37,'#FFFFFF',{text:'♧',fontSize:20,color:'#6A7B64',radius:13});
  const balance=a('frame','Balance card',24,148,364,207,'#293D33',{radius:28,fillType:'linear',gradient:{from:'#293D33',to:'#456247',angle:120}});
  t('Balance eyebrow','TOTAL BALANCE',22,23,300,19,10,'#C0D0B7',600,balance);t('Balance amount','$24,680.00',22,66,320,52,39,'#F4F7EA',600,balance);t('Balance comparison','↗  +12.4%  this month',23,128,300,22,11,'#C2DAB3',500,balance);
  a('ellipse','Balance decorative ring',277,9,102,102,'#617B59',{parentId:balance,opacity:.42});a('ellipse','Balance decorative center',296,28,64,64,'#B3CD91',{parentId:balance,opacity:.34});
  a('button','Balance details',22,163,320,27,'#5D7850',{parentId:balance,text:'View balance details                              ↗',fontSize:10,color:'#E6F1D5',radius:9});
  const actions=a('group','Quick actions · auto layout',24,377,364,72,'transparent',{layout:{direction:'horizontal',gap:10,padding:0,align:'start',justify:'start'}});
  [['↗','Send'],['+','Add money'],['⇄','Exchange'],['···','More']].forEach((v,i)=>{const id=a('frame',`Action · ${v[1]}`,0,0,i===3?83:84,72,'#FFFFFF',{parentId:actions,radius:18});t(`Action icon ${i}`,v[0],33,8,42,27,22,'#749268',500,id);t(`Action label ${i}`,v[1],13,46,78,18,10,'#7A8972',500,id);});
  t('Activity section','Recent activity',24,485,285,27,21,'#3B4D39',650);t('Activity view all','View all',335,493,60,18,10,'#A1AC96',500);
  const transactions=a('frame','Activity list',24,532,364,228,'#FFFFFF',{radius:24});
  [['◈','Studio subscription','Today, 10:24 AM','−$24.00','#F0E8DF'],['↙','Monthly salary','Yesterday, 8:30 AM','+$4,800.00','#E6ECDC'],['≈','Morning coffee','Yesterday, 8:02 AM','−$5.50','#E9E5F0']].forEach((v,i)=>{const y=17+i*72;a('frame',`Transaction icon ${i}`,16,y,43,43,v[4],{parentId:transactions,radius:14});t(`Transaction symbol ${i}`,v[0],29,y+10,32,26,20,'#8E927D',500,transactions);t(`Transaction name ${i}`,v[1],74,y+2,210,22,12,'#58634E',600,transactions);t(`Transaction date ${i}`,v[2],74,y+30,210,18,9,'#B0B6A5',400,transactions);t(`Transaction amount ${i}`,v[3],274,y+12,85,25,12,i===1?'#739B5C':'#646A5E',600,transactions);});
  a('frame','Bottom navigation',24,806,364,68,'#FFFFFF',{radius:24});a('button','Home navigation',35,818,98,44,'#E5EEDB',{text:'⌂  Home',fontSize:12,color:'#668253',radius:16});t('Analytics navigation','▥  Insights',159,834,111,23,12,'#A9B39D',500);t('Cards navigation','▱  Cards',288,834,100,23,12,'#A9B39D',500);
  a('frame','Gesture handle',155,897,102,4,'#CCD2C4',{radius:4});
  return page('Sage · Android finance','mobile',412,915,'#F2F4EC',nodes);
}

function brandBanner():DesignPage {
  const nodes:DesignNode[]=[
    card('Campaign backdrop',0,0,1200,628,'#E8E2FA',{radius:0,fillType:'linear',gradient:{from:'#EFE9FC',to:'#D6D1F0',angle:120}}),
    label('Campaign brand','FORM / FUTURE',46,38,550,32,17,'#554A83',700,{letterSpacing:2}),
    label('Campaign eyebrow','DESIGN WITHOUT LIMITS',48,147,660,24,12,'#8B7FB2',650,{letterSpacing:3}),
    label('Campaign headline','Small spark.\nInfinite possibility.',42,201,827,195,74,'#342A5C',650,{lineHeight:1.12,letterSpacing:-2}),
    label('Campaign body','An open canvas for your next great idea.',48,431,650,36,20,'#8E81AF',400),
    button('Campaign CTA','Find your next idea   ↗',48,510,263,57,'#7862D0','#FFFFFF',{radius:18,fontSize:16}),
    circle('Campaign sphere outer',840,144,310,'#B4A4DE',{animation:'float',duration:5}),
    circle('Campaign sphere inner',875,179,240,'#8E79C3',{animation:'float',duration:5}),
    circle('Campaign sphere core',918,222,154,'#CEC1EF',{animation:'float',duration:5}),
    makeNode('polygon',{name:'Campaign sparkle',x:1005,y:466,width:78,height:78,fill:'#7862B0',rotation:18}),
    label('Campaign issue','CREATIVE SERIES  /  002',860,565,312,22,10,'#8E7FB6',550,{letterSpacing:2}),
  ];
  return page('Form / Future · Campaign','banner',1200,628,'#E8E2FA',nodes);
}

function designPresentation():DesignPage {
  const nodes:DesignNode[]=[
    label('Presentation brand','nook / systems',55,38,800,38,24,'#6D6386',650),
    label('Presentation issue','DESIGN NOTES   —   VOL. 02',930,48,310,22,11,'#A39AAE',550,{letterSpacing:1.5}),
    label('Presentation eyebrow','A SHARED DESIGN LANGUAGE',57,151,1010,23,11,'#A49AB5',600,{letterSpacing:2.5}),
    label('Presentation title','A system for\nevery possibility.',50,202,1100,168,68,'#453A5E',600,{letterSpacing:-2,lineHeight:1.1}),
    label('Presentation intro','Consistent foundations. Thoughtful components.\nMore room for the ideas that move us forward.',57,406,850,64,20,'#A092AD',400,{lineHeight:1.4}),
    label('Presentation footer','FOUNDATIONS / COMPONENTS / MOTION',57,662,1000,22,10,'#AAA0B3',550,{letterSpacing:2}),
    label('Presentation page number','01',1190,661,60,22,12,'#AAA0B3',550),
  ];
  ['#5A477A','#8D7BAB','#BCAAD1','#DFD3E7','#F2EAF5'].forEach((fill,i)=>nodes.push(card(`Color token ${i+1}`,57+i*231,533,214,84,fill,{radius:22})));
  return page('Nook · Design system keynote','slide',1280,720,'#F7F3F8',nodes);
}

function glassDialog():DesignPage {
  const nodes:DesignNode[]=[
    card('Overlay background',0,0,1280,800,'#262739',{radius:0}),
    circle('Backdrop lavender orb',200,118,430,'#7568A4',{blur:38,opacity:.8,animation:'float',duration:7}),
    circle('Backdrop blue orb',690,284,361,'#517D99',{blur:45,opacity:.7,animation:'float',duration:8}),
    card('Liquid glass modal',407,180,466,442,'#E9E7F2',{glass:true,blur:28,opacity:.86,radius:32,stroke:'#FFFFFF80',strokeWidth:1,shadow:true,shadowY:24,shadowBlur:70,shadowColor:'#13132350'}),
    circle('Modal icon background',594,218,92,'#D4CDE8'),
    label('Modal icon','✦',621,235,75,65,49,'#8E7BAE',500),
    label('Modal headline','Your next chapter.',444,346,401,52,32,'#504463',600,{textAlign:'center'}),
    label('Modal description','Every great idea needs a little space.\nLet’s create something that feels like you.',444,417,401,57,14,'#8C7E9D',400,{textAlign:'center',lineHeight:1.6}),
    button('Modal primary action','Create something new   ↗',444,510,392,47,'#8672AD','#FFFFFF',{radius:16,fontSize:13}),
    button('Modal dismiss','Maybe later',444,571,392,28,'transparent','#9384A5',{radius:12,fontSize:11,interaction:{trigger:'click',action:'close',transition:'fade',duration:.25}}),
  ];
  return page('Prism · Glass dialog','desktop',1280,800,'#262739',nodes);
}

