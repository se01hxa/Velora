import type { PageKind } from './types';

export interface ArtboardPreset { id: string; name: string; kind: PageKind; width: number; height: number; description: string; }
export const presets: ArtboardPreset[] = [
  { id: 'windows', name: 'Windows desktop', kind: 'desktop', width: 1440, height: 900, description: 'Windows 데스크톱 앱' },
  { id: 'compact-desktop', name: 'Desktop compact', kind: 'desktop', width: 1280, height: 800, description: '컴팩트 데스크톱 작업 공간' },
  { id: 'android', name: 'Android phone', kind: 'mobile', width: 412, height: 915, description: '현대적인 Android 화면' },
  { id: 'tablet', name: 'Android tablet', kind: 'mobile', width: 800, height: 1280, description: '세로형 태블릿' },
  { id: 'web', name: 'Web desktop', kind: 'web', width: 1440, height: 900, description: '웹사이트와 대시보드' },
  { id: 'wide-banner', name: 'Wide campaign', kind: 'banner', width: 1920, height: 640, description: '와이드 웹 캠페인' },
  { id: 'social-landscape', name: 'Social landscape', kind: 'banner', width: 1200, height: 628, description: '가로형 소셜 캠페인' },
  { id: 'social-square', name: 'Social square', kind: 'banner', width: 1080, height: 1080, description: '정사각형 소셜 이미지' },
  { id: 'social-story', name: 'Social story', kind: 'banner', width: 1080, height: 1920, description: '세로형 스토리' },
  { id: 'slide-hd', name: 'Presentation · Full HD', kind: 'slide', width: 1920, height: 1080, description: '16:9 프레젠테이션' },
  { id: 'slide', name: 'Presentation · HD', kind: 'slide', width: 1280, height: 720, description: '가벼운 16:9 슬라이드' },
];
