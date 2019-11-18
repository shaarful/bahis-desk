import { AnyAction, Store } from 'redux';
import SeamlessImmutable from 'seamless-immutable';

/** The reducer name */
export const reducerName = 'menu';

/** Types of Menu Items */
export const FORM_TYPE = 'form';
export type FORM_TYPE = typeof FORM_TYPE;
export const LIST_TYPE = 'list';
export type LIST_TYPE = typeof LIST_TYPE;
export const MODULE_TYPE = 'container';
export type MODULE_TYPE = typeof MODULE_TYPE;

/** interface for multi language label object */
export interface Label {
  [key: string]: string;
}

/** interface for form menu */
export interface FormMenu {
  type: FORM_TYPE;
  name: string;
  label: Label;
  img_id: number;
  form_id: number;
}

/** interface for List menu */
export interface ListMenu {
  type: LIST_TYPE;
  name: string;
  label: Label;
  img_id: number;
  list_id: number;
}

/** interface for Module menu */
export interface ModuleMenu {
  type: MODULE_TYPE;
  name: string;
  label: Label;
  img_id: number;
  children: Array<ModuleMenu | ListMenu | FormMenu>;
}

/** interface for MenuItem */
export type MenuItem = ModuleMenu | FormMenu | ListMenu;

// actions

/** SET_MENU_ITEM action type */
export const SET_MENU_ITEM = 'opensrp/reducer/menu/SET_MENU_ITEM';

/** interface for SET_MENU_ITEM action */
export interface SetMenuItemAction extends AnyAction {
  menuItem: MenuItem;
  type: typeof SET_MENU_ITEM;
}

/** Create type for menu reducer actions */
export type MenuActionTypes = SetMenuItemAction | AnyAction;

// action creators

/** set menu item action creator
 * @param {ModuleMenu | FormMenu | ListMenu} menuItem - menuItem add to store
 * @return {SetMenuItemAction} - an action to add menuItem to store
 */
export const setMenuItem = (menuItem: MenuItem): SetMenuItemAction => ({
  menuItem,
  type: SET_MENU_ITEM,
});

// The reducer

/** interface for menu state in redux store */
interface MenuState {
  currentMenu: MenuItem | null;
  prevMenu: MenuItem | null;
}

/** Create an immutable menu state */
export type ImmutableMenuState = SeamlessImmutable.ImmutableObject<MenuState>;

/** initial menu-state state */
const initialState: ImmutableMenuState = SeamlessImmutable({
  currentMenu: null,
  prevMenu: null,
});

/** the menu reducer function */
export default function reducer(
  state: ImmutableMenuState = initialState,
  action: MenuActionTypes
): ImmutableMenuState {
  switch (action.type) {
    case SET_MENU_ITEM:
      const prev = state.getIn(['currentMenu']);
      return SeamlessImmutable({
        ...state,
        currentMenu: action.menuItem,
        prevMenu: prev,
      });
    default:
      return state;
  }
}

// selectors

/** returns the current menu item
 * @param {Partial<Store>} state - the redux store
 * @return { MenuItem } - the current Menu Item
 */
export function getCurrentMenu(state: Partial<Store>): MenuItem | null {
  return (state as any)[reducerName].currentMenu;
}

/** checks the prevMenu of the store
 * @param {Partial<Store>} state - the redux store
 * @return { boolean } - returns true if empty; otherwise false
 */
export function isPrevMenuEmpty(state: Partial<Store>): boolean {
  return (state as any)[reducerName].prevMenu ? false : true;
}
