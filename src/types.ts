export type NodeType = 'frame' | 'text' | 'button' | 'ellipse' | 'image' | 'group' | 'line' | 'polygon' | 'vector';
export type Motion = 'none' | 'float' | 'pulse' | 'fade' | 'slide';
export type PageKind = 'mobile' | 'web' | 'slide' | 'desktop' | 'banner';
export interface GradientStop {color:string;position:number}
export interface PaintGradient {from:string;to:string;angle:number;stops?:GradientStop[]}
export interface EmbeddedFont {id:string;family:string;name:string;data:string}
export interface NodeLayout { direction: 'none' | 'horizontal' | 'vertical'; gap: number; padding: number; align: 'start' | 'center' | 'end'; justify: 'start' | 'center' | 'end' | 'space-between'; }
export interface NodeSizing { horizontal: 'fixed' | 'fill' | 'hug'; vertical: 'fixed' | 'fill' | 'hug'; }
export interface NodeConstraints { horizontal: 'left' | 'right' | 'center' | 'stretch'; vertical: 'top' | 'bottom' | 'center' | 'stretch'; }
export interface NodeKeyframe { time: number; x?: number; y?: number; rotation?: number; scale?: number; opacity?: number; }
export interface NodeInteraction { trigger: 'click' | 'hover'; action: 'navigate' | 'overlay' | 'close'; targetPageId?: string; transition: 'instant' | 'fade' | 'slide'; duration: number; }
export interface DesignNode {
  id: string; name: string; type: NodeType;
  x: number; y: number; width: number; height: number;
  fill: string; color: string; text: string; fontSize: number; fontWeight: number;
  radius: number; opacity: number; rotation: number; blur: number;
  glass: boolean; shadow: boolean; visible: boolean; locked: boolean;
  animation: Motion; duration: number; image?: string;
  parentId?: string;
  fillType?: 'solid' | 'linear' | 'radial'; gradient?: PaintGradient;
  strokeDash?: number[]; strokeCap?: 'butt' | 'round' | 'square';
  fontStyle?: 'normal' | 'italic'; textDecoration?: 'none' | 'underline' | 'line-through';
  stroke?: string; strokeWidth?: number; cornerRadii?: [number, number, number, number];
  fontFamily?: string; lineHeight?: number; letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'center' | 'bottom';
  shadowX?: number; shadowY?: number; shadowBlur?: number; shadowColor?: string;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay'; clipContent?: boolean;
  layout?: NodeLayout; sizing?: NodeSizing; constraints?: NodeConstraints;
  vectorPath?: string;
  componentRole?: 'master' | 'instance'; componentId?: string; componentSourceId?: string; overrides?: string[];
  keyframes?: NodeKeyframe[];
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'; delay?: number;
  interaction?: NodeInteraction;
  /** Populated by animation sampling; base documents may omit scale. */
  scale?: number;
}
export interface DesignPage {
  id: string; name: string; kind: PageKind;
  width: number; height: number; background: string; nodes: DesignNode[];
  grid?: { visible: boolean; size: number; snap: boolean }; notes?: string;
}
export interface DesignProject {
  version: 1 | 2; name: string; activePageId: string; pages: DesignPage[];
  revision?: number; timeline?: { duration: number; fps: number };
  tokens?: { colors: { name: string; value: string }[] };
  fonts?: EmbeddedFont[];
}
export interface ExportFile { name: string; content: string; }
export type ExportFormat = 'html' | 'react' | 'xml' | 'compose' | 'svg' | 'json' | 'xaml';
export type DesignOperation =
  | { type: 'create'; node: Partial<DesignNode> & { type: NodeType }; parentId?: string }
  | { type: 'update'; ids: string[]; patch: Partial<DesignNode> }
  | { type: 'delete'; ids: string[] }
  | { type: 'duplicate'; ids: string[]; offset?: { x: number; y: number } }
  | { type: 'reparent'; ids: string[]; parentId?: string }
  | { type: 'group'; ids: string[]; name?: string }
  | { type: 'ungroup'; ids: string[] }
  | { type: 'align'; ids: string[]; axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
  | { type: 'distribute'; ids: string[]; axis: 'horizontal' | 'vertical' }
  | { type: 'reorder'; ids: string[]; direction: 'front' | 'back' | 'forward' | 'backward' }
  | { type: 'component'; ids: string[]; name?: string }
  | { type: 'instantiate'; masterId: string; x?: number; y?: number }
  | { type: 'resize_page'; width: number; height: number }
  | { type: 'token_update'; name: string; value: string };
