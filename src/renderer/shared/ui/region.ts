// 프레임 없는 창의 끌기 영역(-webkit-app-region). Tailwind가 찾을 수 있게 클래스 이름을 그대로 적는다.
export const DRAG_REGION = '[-webkit-app-region:drag]'
export const NO_DRAG_REGION = '[-webkit-app-region:no-drag]'
/** 안쪽의 버튼만 끌기에서 뺀다(라벨·빈 곳은 그대로 끌 수 있다) */
export const NO_DRAG_BUTTONS = '[&_button]:[-webkit-app-region:no-drag]'
